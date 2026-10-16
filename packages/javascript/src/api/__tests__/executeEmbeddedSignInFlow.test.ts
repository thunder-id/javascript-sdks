// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {beforeEach, describe, expect, it, vi} from 'vitest';
import {EmbeddedSignInFlowResponse, EmbeddedSignInFlowStatus} from '../../models/embedded-signin-flow';
import logger from '../../utils/logger';
import executeEmbeddedSignInFlow from '../executeEmbeddedSignInFlow';

const URL = 'https://localhost:8090/flow/execute';

const mockFlowResponse = (overrides: Partial<EmbeddedSignInFlowResponse> = {}): EmbeddedSignInFlowResponse =>
  ({
    flowStatus: EmbeddedSignInFlowStatus.Incomplete,
    ...overrides,
  }) as EmbeddedSignInFlowResponse;

const captureRequestBody = (): Record<string, unknown> => {
  const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
  const requestInit = calls[calls.length - 1][1] as RequestInit;
  return JSON.parse(requestInit.body as string) as Record<string, unknown>;
};

const captureRequestHeaders = (): Record<string, string> => {
  const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
  const requestInit = calls[calls.length - 1][1] as RequestInit;
  return requestInit.headers as Record<string, string>;
};

describe('executeEmbeddedSignInFlow', (): void => {
  beforeEach((): void => {
    vi.resetAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockFlowResponse()),
      ok: true,
    });
  });

  describe('verbose: true injection', (): void => {
    it('injects verbose:true for a new flow start with applicationId and flowType', async (): Promise<void> => {
      await executeEmbeddedSignInFlow({
        payload: {applicationId: 'app-1', flowType: 'AUTHENTICATION'},
        url: URL,
      });

      expect(captureRequestBody()).toMatchObject({verbose: true});
    });

    it('sends a top-level locale field through to the request body', async (): Promise<void> => {
      await executeEmbeddedSignInFlow({
        payload: {action: 'submit', executionId: 'exec-abc', inputs: {username: 'user'}, locale: 'es-AR'},
        url: URL,
      });

      const body = captureRequestBody();
      expect(body).toMatchObject({locale: 'es-AR', inputs: {username: 'user'}});
    });

    it('injects verbose:true for a new flow start that also includes scopes', async (): Promise<void> => {
      await executeEmbeddedSignInFlow({
        payload: {applicationId: 'app-1', flowType: 'AUTHENTICATION', scopes: ['openid', 'profile']},
        url: URL,
      });

      const body = captureRequestBody();
      expect(body).toMatchObject({verbose: true, inputs: {requested_permissions: 'openid profile'}});
      expect(body).not.toHaveProperty('scopes');
    });

    it('injects verbose:true for a bare flow resumption (executionId only)', async (): Promise<void> => {
      await executeEmbeddedSignInFlow({
        payload: {executionId: 'exec-abc'},
        url: URL,
      });

      expect(captureRequestBody()).toMatchObject({verbose: true});
    });

    it('does NOT inject verbose:true for a step submission (executionId + inputs)', async (): Promise<void> => {
      await executeEmbeddedSignInFlow({
        payload: {action: 'submit', executionId: 'exec-abc', inputs: {password: 'secret', username: 'user'}},
        url: URL,
      });

      expect(captureRequestBody()).not.toHaveProperty('verbose');
    });

    it('strips a user-supplied verbose before applying internal logic', async (): Promise<void> => {
      await executeEmbeddedSignInFlow({
        payload: {action: 'submit', executionId: 'exec-abc', inputs: {}, verbose: false},
        url: URL,
      });

      expect(captureRequestBody()).not.toHaveProperty('verbose');
    });

    it('strips user-supplied verbose:true from step submissions', async (): Promise<void> => {
      await executeEmbeddedSignInFlow({
        payload: {action: 'submit', executionId: 'exec-abc', inputs: {}, verbose: true},
        url: URL,
      });

      expect(captureRequestBody()).not.toHaveProperty('verbose');
    });
  });

  describe('scopes → inputs.requested_permissions translation', (): void => {
    it('translates scopes to a space-separated inputs.requested_permissions string', async (): Promise<void> => {
      await executeEmbeddedSignInFlow({
        payload: {applicationId: 'app-1', flowType: 'AUTHENTICATION', scopes: ['openid', 'profile', 'email']},
        url: URL,
      });

      const body = captureRequestBody();
      expect(body).toMatchObject({inputs: {requested_permissions: 'openid profile email'}});
      expect(body).not.toHaveProperty('scopes');
    });

    it('does not add requested_permissions when scopes is absent', async (): Promise<void> => {
      await executeEmbeddedSignInFlow({
        payload: {applicationId: 'app-1', flowType: 'AUTHENTICATION'},
        url: URL,
      });

      expect(captureRequestBody()).not.toHaveProperty('inputs');
    });

    it('does not add requested_permissions when scopes is an empty array', async (): Promise<void> => {
      await executeEmbeddedSignInFlow({
        payload: {applicationId: 'app-1', flowType: 'AUTHENTICATION', scopes: []},
        url: URL,
      });

      const body = captureRequestBody();
      expect(body).not.toHaveProperty('scopes');
      expect(body).not.toHaveProperty('inputs');
    });
  });

  describe('Flow-Secret header', (): void => {
    it('sends the Flow Secret header on a new flow start', async (): Promise<void> => {
      await executeEmbeddedSignInFlow({
        flowSecret: 'flow-secret-123',
        payload: {applicationId: 'app-1', flowType: 'AUTHENTICATION'},
        url: URL,
      });

      expect(captureRequestHeaders()).toMatchObject({'Flow-Secret': 'flow-secret-123'});
    });

    it('does NOT send the Flow Secret header on a step submission', async (): Promise<void> => {
      await executeEmbeddedSignInFlow({
        flowSecret: 'flow-secret-123',
        payload: {action: 'submit', executionId: 'exec-abc', inputs: {password: 'secret', username: 'user'}},
        url: URL,
      });

      expect(captureRequestHeaders()).not.toHaveProperty('Flow-Secret');
    });

    it('does NOT send the Flow Secret header when no flowSecret is provided', async (): Promise<void> => {
      await executeEmbeddedSignInFlow({
        payload: {applicationId: 'app-1', flowType: 'AUTHENTICATION'},
        url: URL,
      });

      expect(captureRequestHeaders()).not.toHaveProperty('Flow-Secret');
    });
  });

  describe('failure relay to the OAuth2 callback', (): void => {
    const BASE_URL = 'https://localhost:8090';

    const mockFlowThenCallback = (flowResponse: unknown, callbackResult: unknown, flowOk = true): void => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve(flowResponse),
          ok: flowOk,
          status: flowOk ? 200 : 500,
          statusText: flowOk ? 'OK' : 'Internal Server Error',
          text: () => Promise.resolve(JSON.stringify(flowResponse)),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve(callbackResult),
          ok: true,
        });
    };

    /** An in-band flow failure whose relay is then rejected by the callback. */
    const mockFlowThenCallbackRejection = (callbackErrorText: string): void => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({errorAssertion: 'signed-error-assertion', flowStatus: EmbeddedSignInFlowStatus.Error}),
          ok: true,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          text: () => Promise.resolve(callbackErrorText),
        });
    };

    it('relays an in-band errorAssertion and returns the client redirect', async (): Promise<void> => {
      mockFlowThenCallback(
        {errorAssertion: 'signed-error-assertion', flowStatus: EmbeddedSignInFlowStatus.Error},
        {redirect_uri: 'https://client.example.com/cb?error=access_denied'},
      );

      const response = await executeEmbeddedSignInFlow({
        authId: 'auth-1',
        baseUrl: BASE_URL,
        payload: {action: 'submit', executionId: 'exec-abc'},
      });

      expect(fetch).toHaveBeenCalledTimes(2);
      expect((fetch as ReturnType<typeof vi.fn>).mock.calls[1][0]).toBe(`${BASE_URL}/oauth2/auth/callback`);
      // The error assertion is relayed in the same field a success assertion uses.
      expect(captureRequestBody()).toEqual({assertion: 'signed-error-assertion', authId: 'auth-1'});
      expect(response.flowStatus).toBe(EmbeddedSignInFlowStatus.Error);
      expect((response as {redirectUrl?: string}).redirectUrl).toBe(
        'https://client.example.com/cb?error=access_denied',
      );
    });

    it('preserves the original error details when the callback returns no redirect', async (): Promise<void> => {
      mockFlowThenCallback(
        {
          error: {code: 'FET-1066'},
          errorAssertion: 'signed-error-assertion',
          executionId: 'exec-abc',
          flowStatus: EmbeddedSignInFlowStatus.Error,
        },
        {status: 'OK'},
      );

      const response = await executeEmbeddedSignInFlow({
        authId: 'auth-1',
        baseUrl: BASE_URL,
        payload: {action: 'submit', executionId: 'exec-abc'},
      });

      // CIBA callbacks return no redirect, so the caller still needs the flow error to display.
      expect((response as {redirectUrl?: string}).redirectUrl).toBeUndefined();
      expect((response as {executionId?: string}).executionId).toBe('exec-abc');
      expect((response as {error?: {code?: string}}).error?.code).toBe('FET-1066');
    });

    it('relays the errorAssertion carried in a non-OK flow response body', async (): Promise<void> => {
      mockFlowThenCallback(
        {code: 'FES-1013', errorAssertion: 'signed-error-assertion'},
        {redirect_uri: 'https://client.example.com/cb?error=server_error'},
        false,
      );

      const response = await executeEmbeddedSignInFlow({
        authId: 'auth-1',
        baseUrl: BASE_URL,
        payload: {action: 'submit', executionId: 'exec-abc'},
      });

      // The error assertion is relayed in the same field a success assertion uses.
      expect(captureRequestBody()).toEqual({assertion: 'signed-error-assertion', authId: 'auth-1'});
      expect((response as {redirectUrl?: string}).redirectUrl).toBe('https://client.example.com/cb?error=server_error');
    });

    it('throws a generic error when the relay itself fails', async (): Promise<void> => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: () => Promise.resolve(JSON.stringify({code: 'FES-1013', errorAssertion: 'signed-error-assertion'})),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          text: () => Promise.resolve('callback rejected'),
        });

      // A failed relay leaves the authorization request to expire, so it must surface rather than be
      // swallowed. The message stays generic because it is rendered to the end user; the callback's
      // own response is logged instead.
      await expect(
        executeEmbeddedSignInFlow({
          authId: 'auth-1',
          baseUrl: BASE_URL,
          payload: {action: 'submit', executionId: 'exec-abc'},
        }),
      ).rejects.toThrow(/OAuth2 authorization failed/);
    });

    it('does not relay an in-band failure without an authId', async (): Promise<void> => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({errorAssertion: 'signed-error-assertion', flowStatus: EmbeddedSignInFlowStatus.Error}),
        ok: true,
      });

      const response = await executeEmbeddedSignInFlow({
        baseUrl: BASE_URL,
        payload: {action: 'submit', executionId: 'exec-abc'},
      });

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(response.flowStatus).toBe(EmbeddedSignInFlowStatus.Error);
      expect((response as {redirectUrl?: string}).redirectUrl).toBeUndefined();
    });

    it('does not relay an in-band failure without an errorAssertion', async (): Promise<void> => {
      global.fetch = vi.fn().mockResolvedValue({
        json: () => Promise.resolve({flowStatus: EmbeddedSignInFlowStatus.Error}),
        ok: true,
      });

      const response = await executeEmbeddedSignInFlow({
        authId: 'auth-1',
        baseUrl: BASE_URL,
        payload: {action: 'submit', executionId: 'exec-abc'},
      });

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(response.flowStatus).toBe(EmbeddedSignInFlowStatus.Error);
    });

    it('throws as before when a non-OK response carries no errorAssertion', async (): Promise<void> => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('plain failure'),
      });

      await expect(
        executeEmbeddedSignInFlow({
          authId: 'auth-1',
          baseUrl: BASE_URL,
          payload: {action: 'submit', executionId: 'exec-abc'},
        }),
      ).rejects.toThrow(/plain failure/);
    });

    // The body of a real 4xx is structured JSON that simply has no assertion, e.g. an expired flow
    // context. That reaches readErrorAssertion's non-throwing branch, unlike the plain-text case above.
    it('throws the flow error when a JSON body carries no errorAssertion', async (): Promise<void> => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve(JSON.stringify({code: 'FES-1004', message: 'Invalid execution id'})),
      });

      await expect(
        executeEmbeddedSignInFlow({
          authId: 'auth-1',
          baseUrl: BASE_URL,
          payload: {action: 'submit', executionId: 'exec-abc'},
        }),
      ).rejects.toThrow(/FES-1004/);
      // Only the flow request was made; there was nothing to relay.
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    // The callback's own response is deliberately kept out of the thrown error because that message is
    // rendered to the end user, which makes this log the only surviving record of why a relay failed.
    it('logs the callback response when the relay fails', async (): Promise<void> => {
      const errorSpy = vi.spyOn(logger, 'error').mockImplementation((): void => {});

      mockFlowThenCallbackRejection('callback rejected the assertion');

      await expect(
        executeEmbeddedSignInFlow({
          authId: 'auth-1',
          baseUrl: BASE_URL,
          payload: {action: 'submit', executionId: 'exec-abc'},
        }),
      ).rejects.toThrow(/OAuth2 authorization failed/);

      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('400'), 'callback rejected the assertion');

      errorSpy.mockRestore();
    });
  });

  describe('success relay to the OAuth2 callback', (): void => {
    const BASE_URL = 'https://localhost:8090';

    it('returns the client redirect when the callback accepts the assertion', async (): Promise<void> => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve({assertion: 'signed-assertion', flowStatus: EmbeddedSignInFlowStatus.Complete}),
          ok: true,
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({redirect_uri: 'https://client.example.com/cb?code=xyz'}),
          ok: true,
        });

      const response = await executeEmbeddedSignInFlow({
        authId: 'auth-1',
        baseUrl: BASE_URL,
        payload: {action: 'submit', executionId: 'exec-abc'},
      });

      expect(captureRequestBody()).toEqual({assertion: 'signed-assertion', authId: 'auth-1'});
      expect(response.flowStatus).toBe(EmbeddedSignInFlowStatus.Complete);
      expect((response as {redirectUrl?: string}).redirectUrl).toBe('https://client.example.com/cb?code=xyz');
    });

    // Success and failure relays share postAuthCallback, so a rejected callback surfaces the same
    // generic message either way, and the callback's own response is never put in front of the user.
    it('throws a generic error without the callback body when the callback rejects', async (): Promise<void> => {
      const errorSpy = vi.spyOn(logger, 'error').mockImplementation((): void => {});

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          json: () => Promise.resolve({assertion: 'signed-assertion', flowStatus: EmbeddedSignInFlowStatus.Complete}),
          ok: true,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          text: () => Promise.resolve('assertion not bound to the authorization request'),
        });

      const error: Error = await executeEmbeddedSignInFlow({
        authId: 'auth-1',
        baseUrl: BASE_URL,
        payload: {action: 'submit', executionId: 'exec-abc'},
      }).catch((err: Error) => err);

      expect(error.message).toBe('OAuth2 authorization failed');
      expect(error.message).not.toContain('not bound');
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('400'),
        'assertion not bound to the authorization request',
      );

      errorSpy.mockRestore();
    });
  });

  it('throws when payload is missing', async (): Promise<void> => {
    await expect(executeEmbeddedSignInFlow({url: URL})).rejects.toThrow('Authorization payload is required');
  });

  it('uses baseUrl to construct the endpoint when url is not provided', async (): Promise<void> => {
    await executeEmbeddedSignInFlow({
      baseUrl: 'https://localhost:8090',
      payload: {applicationId: 'app-1', flowType: 'AUTHENTICATION'},
    });

    expect(fetch).toHaveBeenCalledWith('https://localhost:8090/flow/execute', expect.any(Object));
  });

  describe('credentials', (): void => {
    const captureRequestInit = (): RequestInit => {
      const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
      return calls[calls.length - 1][1] as RequestInit;
    };

    it('includes credentials so the SSO session cookie is sent and stored', async (): Promise<void> => {
      await executeEmbeddedSignInFlow({
        payload: {applicationId: 'app-1', flowType: 'AUTHENTICATION'},
        url: URL,
      });

      expect(captureRequestInit().credentials).toBe('include');
    });

    it('lets the caller override credentials through requestConfig', async (): Promise<void> => {
      await executeEmbeddedSignInFlow({
        credentials: 'omit',
        payload: {executionId: 'exec-abc'},
        url: URL,
      });

      expect(captureRequestInit().credentials).toBe('omit');
    });
  });
});
