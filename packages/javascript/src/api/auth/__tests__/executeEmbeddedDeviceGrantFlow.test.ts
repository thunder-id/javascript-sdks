// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {EmbeddedFlowType, FlowSessionStore} from '../../../models/embedded-flow';
import executeEmbeddedDeviceGrantFlow, {
  type EmbeddedDeviceGrantFlowPayload,
  verifyDeviceCode,
} from '../executeEmbeddedDeviceGrantFlow';
import {createCallFlowSessionStore, takeFlowSessions} from '../flowSessions';

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

  it('is the deprecated alias of verifyDeviceCode', (): void => {
    expect(executeEmbeddedDeviceGrantFlow).toBe(verifyDeviceCode);
  });

  describe('session data posted with the callback', (): void => {
    const CALLBACK_URL = 'https://localhost:8090/oauth2/auth/callback';
    const DEVICE_CODE = 'urn:ietf:params:oauth:grant-type:device_code';
    const CALLBACK_DATA = {additionalData: {authId: 'request-1', callbackType: DEVICE_CODE}};

    let sessionStore: FlowSessionStore;

    beforeEach((): void => {
      sessionStore = createCallFlowSessionStore();
    });

    const respond = (body: Record<string, unknown>, status = 200): Response =>
      new Response(JSON.stringify(body), {status});

    const start = (): ReturnType<typeof verifyDeviceCode> =>
      verifyDeviceCode({
        url: URL,
        payload: {applicationId: 'app-1', flowType: EmbeddedFlowType.DeviceGrant, inputs: {}},
        sessionStore,
      });

    const submit = (executionId: string): ReturnType<typeof verifyDeviceCode> =>
      verifyDeviceCode({url: URL, payload: {action: 'submit', executionId, inputs: {}}, sessionStore});

    it('posts the sessions every step returned with the completed assertion', async (): Promise<void> => {
      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          respond({
            data: {},
            executionId: 'execution-sessions',
            flowStatus: 'INCOMPLETE',
            sessionData: [{expiresIn: 28800, flowIdentifier: 'flow-a', sessionHandle: 'handle-a'}],
          }),
        )
        .mockResolvedValueOnce(respond({data: {}, executionId: 'execution-sessions', flowStatus: 'INCOMPLETE'}))
        .mockResolvedValueOnce(
          respond({
            assertion: 'signed-assertion',
            data: CALLBACK_DATA,
            executionId: 'execution-sessions',
            flowStatus: 'COMPLETE',
            sessionData: [{expiresIn: 28800, flowIdentifier: 'flow-b', sessionHandle: 'handle-b'}],
          }),
        )
        .mockResolvedValueOnce(respond({}));

      await start();
      await submit('execution-sessions');
      await submit('execution-sessions');

      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(fetchMock).toHaveBeenNthCalledWith(
        4,
        CALLBACK_URL,
        expect.objectContaining({
          body: JSON.stringify({
            assertion: 'signed-assertion',
            authId: 'request-1',
            sessionData: [
              {expiresIn: 28800, flowIdentifier: 'flow-a', sessionHandle: 'handle-a'},
              {expiresIn: 28800, flowIdentifier: 'flow-b', sessionHandle: 'handle-b'},
            ],
            type: DEVICE_CODE,
          }),
        }),
      );
      expect(await takeFlowSessions(sessionStore, 'execution-sessions')).toEqual([]);
    });

    it('posts no session data when no step returned any', async (): Promise<void> => {
      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(respond({data: {}, executionId: 'execution-none', flowStatus: 'INCOMPLETE'}))
        .mockResolvedValueOnce(
          respond({
            assertion: 'signed-assertion',
            data: CALLBACK_DATA,
            executionId: 'execution-none',
            flowStatus: 'COMPLETE',
          }),
        )
        .mockResolvedValueOnce(respond({}));

      await start();
      await submit('execution-none');

      expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        CALLBACK_URL,
        expect.objectContaining({
          body: JSON.stringify({assertion: 'signed-assertion', authId: 'request-1', type: DEVICE_CODE}),
        }),
      );
    });

    it('does not post a session a later step cleared', async (): Promise<void> => {
      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          respond({
            data: {},
            executionId: 'execution-cleared',
            flowStatus: 'INCOMPLETE',
            sessionData: [
              {flowIdentifier: 'flow-a', sessionHandle: 'handle-a'},
              {flowIdentifier: 'flow-b', sessionHandle: 'handle-b'},
            ],
          }),
        )
        .mockResolvedValueOnce(
          respond({
            assertion: 'signed-assertion',
            clearedSessions: ['flow-a'],
            data: CALLBACK_DATA,
            executionId: 'execution-cleared',
            flowStatus: 'COMPLETE',
          }),
        )
        .mockResolvedValueOnce(respond({}));

      await start();
      await submit('execution-cleared');

      expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        CALLBACK_URL,
        expect.objectContaining({
          body: JSON.stringify({
            assertion: 'signed-assertion',
            authId: 'request-1',
            sessionData: [{flowIdentifier: 'flow-b', sessionHandle: 'handle-b'}],
            type: DEVICE_CODE,
          }),
        }),
      );
    });

    it('keeps the sessions of one execution out of another', async (): Promise<void> => {
      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          respond({
            data: {},
            executionId: 'execution-one',
            flowStatus: 'INCOMPLETE',
            sessionData: [{flowIdentifier: 'flow-a', sessionHandle: 'handle-a'}],
          }),
        )
        .mockResolvedValueOnce(
          respond({
            assertion: 'signed-assertion',
            data: CALLBACK_DATA,
            executionId: 'execution-other',
            flowStatus: 'COMPLETE',
          }),
        )
        .mockResolvedValueOnce(respond({}));

      await start();
      await submit('execution-other');

      expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        CALLBACK_URL,
        expect.objectContaining({
          body: JSON.stringify({assertion: 'signed-assertion', authId: 'request-1', type: DEVICE_CODE}),
        }),
      );
      expect(await takeFlowSessions(sessionStore, 'execution-one')).toEqual([
        {flowIdentifier: 'flow-a', sessionHandle: 'handle-a'},
      ]);
    });

    it('does not post the collected sessions with a failed flow, and forgets them', async (): Promise<void> => {
      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          respond({
            data: {},
            executionId: 'execution-failed',
            flowStatus: 'INCOMPLETE',
            sessionData: [{flowIdentifier: 'flow-a', sessionHandle: 'handle-a'}],
          }),
        )
        .mockResolvedValueOnce(
          respond({
            data: CALLBACK_DATA,
            errorAssertion: 'signed-error-assertion',
            executionId: 'execution-failed',
            flowStatus: 'ERROR',
            sessionData: [{flowIdentifier: 'flow-b', sessionHandle: 'handle-b'}],
          }),
        )
        .mockResolvedValueOnce(respond({}));

      await start();
      await submit('execution-failed');

      expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        CALLBACK_URL,
        expect.objectContaining({
          body: JSON.stringify({assertion: 'signed-error-assertion', authId: 'request-1', type: DEVICE_CODE}),
        }),
      );
      expect(await takeFlowSessions(sessionStore, 'execution-failed')).toEqual([]);
    });

    it('does not post the collected sessions with a failed flow HTTP response, and forgets them', async (): Promise<void> => {
      const fetchMock = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          respond({
            data: {},
            executionId: 'execution-http-failed',
            flowStatus: 'INCOMPLETE',
            sessionData: [{flowIdentifier: 'flow-a', sessionHandle: 'handle-a'}],
          }),
        )
        .mockResolvedValueOnce(
          respond({data: CALLBACK_DATA, error: 'server_error', errorAssertion: 'signed-error-assertion'}, 500),
        )
        .mockResolvedValueOnce(respond({}));

      await start();
      await submit('execution-http-failed');

      expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        CALLBACK_URL,
        expect.objectContaining({
          body: JSON.stringify({assertion: 'signed-error-assertion', authId: 'request-1', type: DEVICE_CODE}),
        }),
      );
      expect(await takeFlowSessions(sessionStore, 'execution-http-failed')).toEqual([]);
    });

    it('forgets the sessions of a terminal response that lacks its callback data', async (): Promise<void> => {
      vi.spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce(
          respond({
            data: {},
            executionId: 'execution-no-callback',
            flowStatus: 'INCOMPLETE',
            sessionData: [{flowIdentifier: 'flow-a', sessionHandle: 'handle-a'}],
          }),
        )
        .mockResolvedValueOnce(
          respond({assertion: 'signed-assertion', executionId: 'execution-no-callback', flowStatus: 'COMPLETE'}),
        );

      await start();
      await expect(submit('execution-no-callback')).rejects.toMatchObject({
        code: 'executeEmbeddedDeviceGrantFlow-CallbackError-002',
      });

      expect(await takeFlowSessions(sessionStore, 'execution-no-callback')).toEqual([]);
    });
  });
});
