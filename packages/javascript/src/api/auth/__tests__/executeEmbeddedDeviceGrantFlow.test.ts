// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {afterEach, describe, expect, it, vi} from 'vitest';
import {EmbeddedFlowType} from '../../../models/embedded-flow';
import executeEmbeddedDeviceGrantFlow, {type EmbeddedDeviceGrantFlowPayload} from '../executeEmbeddedDeviceGrantFlow';

const URL = 'https://localhost:8090/flow/execute';

describe('executeEmbeddedDeviceGrantFlow', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts the Device Grant flow with the DEVICE_GRANT type and SDK-owned verbose metadata', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({executionId: 'execution-1', flowStatus: 'INCOMPLETE', data: {}}), {
        status: 200,
      }),
    );

    await executeEmbeddedDeviceGrantFlow({
      url: URL,
      payload: {
        applicationId: 'app-1',
        flowType: EmbeddedFlowType.DeviceGrant,
        inputs: {user_code: 'BCDF-GHJK'},
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      URL,
      expect.objectContaining({
        credentials: 'include',
        method: 'POST',
        body: JSON.stringify({
          applicationId: 'app-1',
          flowType: EmbeddedFlowType.DeviceGrant,
          inputs: {user_code: 'BCDF-GHJK'},
          verbose: true,
        }),
      }),
    );
  });

  it('starts an application Device Grant flow before the user code is entered', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({executionId: 'execution-1', flowStatus: 'INCOMPLETE', data: {}}), {
        status: 200,
      }),
    );

    await executeEmbeddedDeviceGrantFlow({
      url: URL,
      payload: {
        applicationId: 'app-1',
        flowType: EmbeddedFlowType.DeviceGrant,
        inputs: {},
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      URL,
      expect.objectContaining({
        body: JSON.stringify({
          applicationId: 'app-1',
          flowType: EmbeddedFlowType.DeviceGrant,
          inputs: {},
          verbose: true,
        }),
      }),
    );
  });

  it('strips caller-provided verbose metadata from step submissions', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({executionId: 'execution-1', flowStatus: 'INCOMPLETE', data: {}}), {
        status: 200,
      }),
    );

    const payload = {
      action: 'continue',
      executionId: 'execution-1',
      inputs: {user_code: 'BCDF-GHJK'},
      verbose: true,
    } as EmbeddedDeviceGrantFlowPayload & {verbose: boolean};

    await executeEmbeddedDeviceGrantFlow({
      url: URL,
      payload,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      URL,
      expect.objectContaining({
        body: JSON.stringify({
          action: 'continue',
          executionId: 'execution-1',
          inputs: {user_code: 'BCDF-GHJK'},
        }),
      }),
    );
  });

  it('relays a terminal assertion with the server-provided authId to the existing OAuth callback', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            executionId: 'execution-1',
            flowStatus: 'COMPLETE',
            assertion: 'signed-assertion',
            data: {additionalData: {authId: 'request-1', callbackType: 'urn:ietf:params:oauth:grant-type:device_code'}},
          }),
          {status: 200},
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({}), {status: 200}));

    await executeEmbeddedDeviceGrantFlow({
      url: URL,
      payload: {executionId: 'execution-1', action: 'continue'},
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://localhost:8090/oauth2/auth/callback',
      expect.objectContaining({
        credentials: 'include',
        body: JSON.stringify({
          assertion: 'signed-assertion',
          authId: 'request-1',
          type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
      }),
    );
  });

  it('preserves a base URL path when relaying a terminal assertion', async () => {
    const baseUrl = 'https://localhost:8090/reverse-proxy';
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            executionId: 'execution-1',
            flowStatus: 'COMPLETE',
            assertion: 'signed-assertion',
            data: {additionalData: {authId: 'request-1', callbackType: 'device_code'}},
          }),
          {status: 200},
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({}), {status: 200}));

    await executeEmbeddedDeviceGrantFlow({
      baseUrl,
      payload: {executionId: 'execution-1', action: 'continue'},
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, `${baseUrl}/flow/execute`, expect.anything());
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${baseUrl}/oauth2/auth/callback`,
      expect.objectContaining({
        body: JSON.stringify({assertion: 'signed-assertion', authId: 'request-1', type: 'device_code'}),
      }),
    );
  });

  it('relays a terminal denial assertion and returns the flow response when accepted', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            executionId: 'execution-1',
            flowStatus: 'ERROR',
            errorAssertion: 'signed-error-assertion',
            data: {additionalData: {authId: 'request-1', callbackType: 'device_code'}},
          }),
          {status: 200},
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({status: 'OK'}), {status: 200}));

    await expect(
      executeEmbeddedDeviceGrantFlow({
        url: URL,
        payload: {executionId: 'execution-1', action: 'continue'},
      }),
    ).resolves.toMatchObject({flowStatus: 'ERROR', errorAssertion: 'signed-error-assertion'});
  });

  it('surfaces callback rejection for a terminal error assertion', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            executionId: 'execution-1',
            flowStatus: 'ERROR',
            errorAssertion: 'signed-error-assertion',
            data: {additionalData: {authId: 'request-1', callbackType: 'device_code'}},
          }),
          {status: 200},
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({error: 'invalid_request'}), {status: 400}));

    await expect(
      executeEmbeddedDeviceGrantFlow({
        url: URL,
        payload: {executionId: 'execution-1', action: 'continue'},
      }),
    ).rejects.toMatchObject({code: 'executeEmbeddedDeviceGrantFlow-CallbackError-001', statusCode: 400});
  });

  it('throws when a completed flow assertion is rejected by the callback', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            executionId: 'execution-1',
            flowStatus: 'COMPLETE',
            assertion: 'signed-assertion',
            data: {additionalData: {authId: 'request-1', callbackType: 'device_code'}},
          }),
          {status: 200},
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({error: 'access_denied'}), {status: 400}));

    await expect(
      executeEmbeddedDeviceGrantFlow({
        url: URL,
        payload: {executionId: 'execution-1', action: 'continue'},
      }),
    ).rejects.toMatchObject({code: 'executeEmbeddedDeviceGrantFlow-CallbackError-001', statusCode: 400});
  });

  it('rejects terminal flow responses without callback data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({executionId: 'execution-1', flowStatus: 'COMPLETE', assertion: 'assertion'}), {
        status: 200,
      }),
    );

    await expect(
      executeEmbeddedDeviceGrantFlow({
        url: URL,
        payload: {executionId: 'execution-1', action: 'continue'},
      }),
    ).rejects.toMatchObject({code: 'executeEmbeddedDeviceGrantFlow-CallbackError-002'});
  });

  it('rejects missing flow payloads', async () => {
    await expect(executeEmbeddedDeviceGrantFlow({url: URL})).rejects.toMatchObject({
      code: 'executeEmbeddedDeviceGrantFlow-ValidationError-001',
    });
  });

  it('rejects a missing server URL before making a request', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(
      executeEmbeddedDeviceGrantFlow({
        payload: {
          applicationId: 'app-1',
          flowType: EmbeddedFlowType.DeviceGrant,
          inputs: {user_code: 'BCDF-GHJK'},
        },
      }),
    ).rejects.toMatchObject({code: 'executeEmbeddedDeviceGrantFlow-ValidationError-002'});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects payloads that are neither Device Grant starts nor continuations', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(
      executeEmbeddedDeviceGrantFlow({
        url: URL,
        payload: {flowType: EmbeddedFlowType.Authentication} as never,
      }),
    ).rejects.toMatchObject({code: 'executeEmbeddedDeviceGrantFlow-ValidationError-003'});

    await expect(
      executeEmbeddedDeviceGrantFlow({
        url: URL,
        payload: {
          flowType: 'SYSTEM',
          inputs: {user_code: 'BCDF-GHJK'},
          systemFlow: 'DEVICE_GRANT',
        } as never,
      }),
    ).rejects.toMatchObject({code: 'executeEmbeddedDeviceGrantFlow-ValidationError-003'});

    await expect(
      executeEmbeddedDeviceGrantFlow({
        url: URL,
        payload: {
          flowType: EmbeddedFlowType.DeviceGrant,
          inputs: {user_code: 'BCDF-GHJK'},
        } as never,
      }),
    ).rejects.toMatchObject({code: 'executeEmbeddedDeviceGrantFlow-ValidationError-003'});

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces flow execution HTTP failures', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('flow unavailable', {status: 503}));

    await expect(
      executeEmbeddedDeviceGrantFlow({url: URL, payload: {executionId: 'execution-1'}}),
    ).rejects.toMatchObject({code: 'executeEmbeddedDeviceGrantFlow-FlowError-001', statusCode: 503});
  });

  it('relays error assertions returned with a failed flow HTTP response', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: 'server_error',
            errorAssertion: 'signed-error-assertion',
            data: {additionalData: {authId: 'request-1', callbackType: 'urn:ietf:params:oauth:grant-type:device_code'}},
          }),
          {status: 500},
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({status: 'OK'}), {status: 200}));

    await expect(
      executeEmbeddedDeviceGrantFlow({
        url: URL,
        payload: {executionId: 'execution-1', action: 'continue'},
      }),
    ).resolves.toMatchObject({flowStatus: 'ERROR', errorAssertion: 'signed-error-assertion'});

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://localhost:8090/oauth2/auth/callback',
      expect.objectContaining({
        body: JSON.stringify({
          assertion: 'signed-error-assertion',
          authId: 'request-1',
          type: 'urn:ietf:params:oauth:grant-type:device_code',
        }),
      }),
    );
  });

  it('returns the callback redirect URI on a completed flow', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            executionId: 'execution-1',
            flowStatus: 'COMPLETE',
            assertion: 'signed-assertion',
            data: {additionalData: {authId: 'request-1', callbackType: 'device_code'}},
          }),
          {status: 200},
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({redirect_uri: 'https://client.example.com/device-complete'}), {status: 200}),
      );

    await expect(
      executeEmbeddedDeviceGrantFlow({url: URL, payload: {executionId: 'execution-1'}}),
    ).resolves.toMatchObject({redirectUrl: 'https://client.example.com/device-complete'});
  });
});
