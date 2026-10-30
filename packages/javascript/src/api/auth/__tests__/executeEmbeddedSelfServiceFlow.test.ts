// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {beforeEach, describe, expect, it, Mock, vi} from 'vitest';
import ThunderIDAPIError from '../../../errors/ThunderIDAPIError';
import {EmbeddedFlowType} from '../../../models/embedded-flow';
import {
  EmbeddedSelfServiceFlowRequest,
  EmbeddedSelfServiceFlowResponse,
  EmbeddedSelfServiceFlowStatus,
} from '../../../models/embedded-self-service-flow';
import executeEmbeddedSelfServiceFlow from '../executeEmbeddedSelfServiceFlow';

const URL = 'https://localhost:8090/flow/execute';

const initiate: EmbeddedSelfServiceFlowRequest = {
  flowType: EmbeddedFlowType.SelfService,
  handle: 'default-self-attribute-verification-flow',
  inputs: {attribute: 'email'},
};

type Fetcher = (url: string, config: RequestInit) => Promise<Response>;

const flowResponse: EmbeddedSelfServiceFlowResponse = {
  data: {additionalData: {emailSent: 'true', maskedDestination: 'a•••@example.com'}},
  executionId: 'exec-1',
  flowStatus: EmbeddedSelfServiceFlowStatus.Incomplete,
};

const lastRequest = (fetcher: Mock<Fetcher>): [string, RequestInit] =>
  fetcher.mock.calls[fetcher.mock.calls.length - 1] as [string, RequestInit];

describe('executeEmbeddedSelfServiceFlow', (): void => {
  let fetcher: Mock<Fetcher>;

  beforeEach((): void => {
    fetcher = vi.fn<Fetcher>().mockResolvedValue({json: () => Promise.resolve(flowResponse), ok: true} as Response);
  });

  it('starts the flow by type and handle with its inputs and returns the step', async (): Promise<void> => {
    await expect(executeEmbeddedSelfServiceFlow({fetcher, payload: initiate, url: URL})).resolves.toEqual(flowResponse);

    const [url, init] = lastRequest(fetcher);
    expect(url).toBe(URL);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      flowType: 'SELF_SERVICE',
      handle: 'default-self-attribute-verification-flow',
      inputs: {attribute: 'email'},
      verbose: true,
    });
    expect(init.headers).toMatchObject({Accept: 'application/json', 'Content-Type': 'application/json'});
  });

  it('continues an execution without naming the handle again', async (): Promise<void> => {
    await executeEmbeddedSelfServiceFlow({
      fetcher,
      payload: {action: 'verify', challengeToken: 'ct-1', executionId: 'exec-1', inputs: {otp: '123456'}},
      url: URL,
    });

    expect(JSON.parse(lastRequest(fetcher)[1].body as string)).toEqual({
      action: 'verify',
      challengeToken: 'ct-1',
      executionId: 'exec-1',
      inputs: {otp: '123456'},
      verbose: true,
    });
  });

  it('builds the endpoint from baseUrl when url is not given', async (): Promise<void> => {
    await executeEmbeddedSelfServiceFlow({baseUrl: 'https://localhost:8090', fetcher, payload: initiate});

    expect(lastRequest(fetcher)[0]).toBe('https://localhost:8090/flow/execute');
  });

  it('keeps caller headers while setting the JSON headers', async (): Promise<void> => {
    await executeEmbeddedSelfServiceFlow({
      fetcher,
      headers: {'X-Request-Id': 'req-1'},
      payload: initiate,
      url: URL,
    });

    expect(lastRequest(fetcher)[1].headers).toMatchObject({
      'Content-Type': 'application/json',
      'X-Request-Id': 'req-1',
    });
  });

  it('uses native fetch when no fetcher is given', async (): Promise<void> => {
    const nativeFetch = vi.fn().mockResolvedValue({json: () => Promise.resolve(flowResponse), ok: true});
    vi.stubGlobal('fetch', nativeFetch);

    try {
      await executeEmbeddedSelfServiceFlow({payload: initiate, url: URL});
    } finally {
      vi.unstubAllGlobals();
    }

    expect(nativeFetch).toHaveBeenCalledWith(URL, expect.objectContaining({method: 'POST'}));
  });

  describe('validation', (): void => {
    it.each([
      ['no url', {}],
      ['an invalid url', {url: 'not-a-url'}],
      ['an invalid baseUrl', {baseUrl: 'invalid'}],
    ])('refuses %s before sending', async (_name: string, endpoint: Record<string, string>): Promise<void> => {
      const error: ThunderIDAPIError = (await executeEmbeddedSelfServiceFlow({
        ...endpoint,
        fetcher,
        payload: initiate,
      }).catch((e: unknown) => e as ThunderIDAPIError)) as ThunderIDAPIError;

      expect(error).toBeInstanceOf(ThunderIDAPIError);
      expect(error.code).toBe('executeEmbeddedSelfServiceFlow-ValidationError-001');
      expect(error.statusCode).toBe(400);
      expect(fetcher).not.toHaveBeenCalled();
    });

    it('refuses a missing payload before sending', async (): Promise<void> => {
      const error: ThunderIDAPIError = (await executeEmbeddedSelfServiceFlow({
        fetcher,
        payload: undefined as unknown as EmbeddedSelfServiceFlowRequest,
        url: URL,
      }).catch((e: unknown) => e as ThunderIDAPIError)) as ThunderIDAPIError;

      expect(error).toBeInstanceOf(ThunderIDAPIError);
      expect(error.code).toBe('executeEmbeddedSelfServiceFlow-ValidationError-002');
      expect(fetcher).not.toHaveBeenCalled();
    });

    it.each<[string, EmbeddedSelfServiceFlowRequest]>([
      ['no handle', {flowType: EmbeddedFlowType.SelfService, inputs: {attribute: 'email'}}],
      ['an empty handle', {flowType: EmbeddedFlowType.SelfService, handle: '', inputs: {attribute: 'email'}}],
    ])(
      'refuses a new flow with %s before sending',
      async (_name: string, payload: EmbeddedSelfServiceFlowRequest): Promise<void> => {
        const error: ThunderIDAPIError = (await executeEmbeddedSelfServiceFlow({
          fetcher,
          payload,
          url: URL,
        }).catch((e: unknown) => e as ThunderIDAPIError)) as ThunderIDAPIError;

        expect(error).toBeInstanceOf(ThunderIDAPIError);
        expect(error.code).toBe('executeEmbeddedSelfServiceFlow-ValidationError-003');
        expect(fetcher).not.toHaveBeenCalled();
      },
    );
  });

  describe('response errors', (): void => {
    it('maps a failed response to an API error with its status', async (): Promise<void> => {
      fetcher.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('{"code":"AUTH-1001","message":"Unauthorized","description":"invalid token"}'),
      } as unknown as Response);

      const error: ThunderIDAPIError = (await executeEmbeddedSelfServiceFlow({
        fetcher,
        payload: initiate,
        url: URL,
      }).catch((e: unknown) => e as ThunderIDAPIError)) as ThunderIDAPIError;

      expect(error).toBeInstanceOf(ThunderIDAPIError);
      expect(error.code).toBe('executeEmbeddedSelfServiceFlow-ResponseError-001');
      expect(error.statusCode).toBe(401);
      expect(error.statusText).toBe('Unauthorized');
      expect(error.message).toMatch(/^Self-service flow request failed: /);
    });

    it('maps a network failure to a network error', async (): Promise<void> => {
      fetcher.mockRejectedValue(new TypeError('Failed to fetch'));

      const error: ThunderIDAPIError = (await executeEmbeddedSelfServiceFlow({
        fetcher,
        payload: initiate,
        url: URL,
      }).catch((e: unknown) => e as ThunderIDAPIError)) as ThunderIDAPIError;

      expect(error).toBeInstanceOf(ThunderIDAPIError);
      expect(error.code).toBe('executeEmbeddedSelfServiceFlow-NetworkError-001');
      expect(error.statusCode).toBe(0);
      expect(error.message).toContain('Failed to fetch');
    });

    it('maps an unreadable body to a network error', async (): Promise<void> => {
      fetcher.mockResolvedValue({
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
        ok: true,
      } as unknown as Response);

      const error: ThunderIDAPIError = (await executeEmbeddedSelfServiceFlow({
        fetcher,
        payload: initiate,
        url: URL,
      }).catch((e: unknown) => e as ThunderIDAPIError)) as ThunderIDAPIError;

      expect(error.code).toBe('executeEmbeddedSelfServiceFlow-NetworkError-001');
    });

    it('returns a flow error step as data rather than throwing', async (): Promise<void> => {
      const refused: EmbeddedSelfServiceFlowResponse = {
        error: {code: 'FET-1112'} as EmbeddedSelfServiceFlowResponse['error'],
        executionId: 'exec-1',
        flowStatus: EmbeddedSelfServiceFlowStatus.Error,
      };
      fetcher.mockResolvedValue({json: () => Promise.resolve(refused), ok: true} as unknown as Response);

      await expect(executeEmbeddedSelfServiceFlow({fetcher, payload: initiate, url: URL})).resolves.toEqual(refused);
    });
  });
});
