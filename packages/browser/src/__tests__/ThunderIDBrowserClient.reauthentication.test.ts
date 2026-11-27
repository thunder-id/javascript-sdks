// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
import {afterEach, describe, expect, it, vi} from 'vitest';
import ThunderIDBrowserClient from '../ThunderIDBrowserClient';
import {
  REAUTHENTICATION_MESSAGE,
  REAUTHENTICATION_WINDOW_PREFIX,
  completeReauthenticationInPopup,
} from '../utils/reauthenticationPopup';

const encode = (claims: Record<string, unknown>): string =>
  `h.${btoa(JSON.stringify(claims)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')}.s`;

const SESSION = {access_token: 'old-at', created_at: Date.now(), expires_in: '3600', id_token: encode({sub: 'user-1'})};

let instance = 80;

const createClient = async (): Promise<any> => {
  instance += 1;
  const client: any = new ThunderIDBrowserClient(instance);
  await client.initialize({
    afterSignInUrl: 'https://app.example.com/callback',
    baseUrl: 'https://example.com',
    clientId: 'test-client',
  } as any);
  const sm: any = client.getStorageManager();
  await sm.setOIDCProviderMetaData({
    authorization_endpoint: 'https://example.com/oauth2/authorize',
    token_endpoint: 'https://example.com/oauth2/token',
  });
  await sm.setTemporaryDataParameter('op_config_initiated', true);
  await sm.setSessionData(SESSION);

  return client;
};

/** A popup that, once sent to the authorize URL, answers with the given callback parameters. */
const fakePopup = (answer: (state: string) => Record<string, string | undefined>): any => {
  const popup: any = {
    close: vi.fn(() => {
      popup.closed = true;
    }),
    closed: false,
    location: {},
  };

  Object.defineProperty(popup.location, 'href', {
    set(url: string) {
      const state: string = new URL(url).searchParams.get('state') ?? '';
      popup.authorizeUrl = url;
      setTimeout(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: {type: REAUTHENTICATION_MESSAGE, state, ...answer(state)},
            origin: window.location.origin,
            source: popup,
          }),
        );
      }, 0);
    },
  });

  return popup;
};

describe('ThunderIDBrowserClient.reauthenticate()', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('opens the popup before anything else, sends max_age, and completes with the returned code', async () => {
    const client = await createClient();
    const popup = fakePopup(() => ({code: 'code-1'}));
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(popup);
    const complete = vi.spyOn(client, 'completeReauthentication').mockResolvedValue({});
    const refresh = vi.spyOn(client, 'refreshAccessToken');

    await client.reauthenticate({maxAge: 300});

    expect(openSpy).toHaveBeenCalledWith('', `${REAUTHENTICATION_WINDOW_PREFIX}${instance}`, expect.any(String));
    const url = new URL(popup.authorizeUrl);
    expect(url.searchParams.get('max_age')).toBe('300');
    expect(url.searchParams.get('id_token_hint')).toBe(SESSION.id_token);
    expect(complete).toHaveBeenCalledWith(expect.objectContaining({state: url.searchParams.get('state')}), 'code-1');
    expect(refresh).not.toHaveBeenCalled();
    expect(popup.close).toHaveBeenCalled();
  });

  it('fails with a blocked-popup error when the browser does not open it', async () => {
    const client = await createClient();
    vi.spyOn(window, 'open').mockReturnValue(null);

    await expect(client.reauthenticate({maxAge: 300})).rejects.toMatchObject({code: 'BROWSER-REAUTHENTICATION-PB01'});
  });

  it('fails and keeps the session when the sign-in returns an error', async () => {
    const client = await createClient();
    vi.spyOn(window, 'open').mockReturnValue(fakePopup(() => ({error: 'access_denied'})));
    const complete = vi.spyOn(client, 'completeReauthentication');

    await expect(client.reauthenticate({maxAge: 300})).rejects.toMatchObject({code: 'BROWSER-REAUTHENTICATION-AE01'});
    expect(complete).not.toHaveBeenCalled();
    expect((await client.getStorageManager().getSessionData()).access_token).toBe('old-at');
  });

  it('ignores a message with another state', async () => {
    const client = await createClient();
    const popup = fakePopup(() => ({code: 'code-1', state: 'another-state'}));
    vi.spyOn(window, 'open').mockReturnValue(popup);
    const complete = vi.spyOn(client, 'completeReauthentication').mockResolvedValue({});
    setTimeout(() => {
      popup.closed = true;
    }, 50);

    await expect(client.reauthenticate({maxAge: 300})).rejects.toMatchObject({code: 'BROWSER-REAUTHENTICATION-PC01'});
    expect(complete).not.toHaveBeenCalled();
  });
});

describe('ThunderIDBrowserClient re-sign-in with a sign-in flow', () => {
  const FLOW_SESSION = {
    access_token: 'flow-at',
    created_at: Date.now(),
    embedded_sign_in: true,
    expires_in: '3600',
    id_token: encode({sub: 'user-1'}),
  };

  const flowSessionClient = async (): Promise<any> => {
    const client = await createClient();
    await client.getStorageManager().setConfigData({applicationId: 'app-1'});
    await client.getStorageManager().setSessionData(FLOW_SESSION);

    return client;
  };

  const stubFlow = (body: Record<string, unknown>): any => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), {status: 200}));
    vi.stubGlobal('fetch', fetchMock);

    return fetchMock;
  };

  const sentBody = (fetchMock: any): any => JSON.parse(fetchMock.mock.calls[0][1].body);

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('reports popup for a redirect session and flow for a session from a sign-in flow', async () => {
    expect(await (await createClient()).getReauthenticationMethod()).toBe('popup');
    expect(await (await flowSessionClient()).getReauthenticationMethod()).toBe('flow');
  });

  it('reports flow in embedded mode', async () => {
    const client = await createClient();
    await client.getStorageManager().setConfigData({mode: 'embedded'});

    expect(await client.getReauthenticationMethod()).toBe('flow');
  });

  it('keeps the session handles each step returns and ends', async () => {
    const client = await flowSessionClient();
    await client.getStorageManager().setSessionData({flow_sessions: [{flowIdentifier: 'f1', sessionHandle: 'h1'}]});
    stubFlow({
      clearedSessions: ['f1'],
      executionId: 'e-1',
      flowStatus: 'INCOMPLETE',
      sessionData: [{flowIdentifier: 'f2', sessionHandle: 'h2'}],
    });

    await client.executeReauthenticationFlow({executionId: 'e-1', inputs: {}});

    const held = (await client.getStorageManager().getSessionData()).flow_sessions.map((s: any) => s.flowIdentifier);
    expect(held).toEqual(['f2']);
  });

  it('refuses the popup for a session from a sign-in flow', async () => {
    const client = await flowSessionClient();
    vi.spyOn(window, 'open').mockReturnValue(fakePopup(() => ({code: 'code-1'})));

    await expect(client.reauthenticate({maxAge: 300})).rejects.toMatchObject({code: 'BROWSER-REAUTHENTICATION-UM02'});
  });

  it('starts an authentication flow with maxAge and the application ID', async () => {
    const client = await flowSessionClient();
    const fetchMock = stubFlow({executionId: 'e-1', flowStatus: 'INCOMPLETE'});

    await client.executeReauthenticationFlow({}, {maxAge: 30});

    expect(sentBody(fetchMock)).toMatchObject({applicationId: 'app-1', flowType: 'AUTHENTICATION', maxAge: 30});
  });

  it('asks for a new sign-in with maxAge 0 when the challenge carries none', async () => {
    const client = await flowSessionClient();
    const fetchMock = stubFlow({executionId: 'e-1', flowStatus: 'INCOMPLETE'});

    await client.executeReauthenticationFlow();

    expect(sentBody(fetchMock).maxAge).toBe(0);
  });

  it('sends only the step on a continuation', async () => {
    const client = await flowSessionClient();
    const fetchMock = stubFlow({executionId: 'e-1', flowStatus: 'INCOMPLETE'});

    await client.executeReauthenticationFlow({action: 'a-1', executionId: 'e-1', inputs: {password: 'p'}, maxAge: 5});

    const body = sentBody(fetchMock);
    expect(body).toMatchObject({action: 'a-1', executionId: 'e-1', inputs: {password: 'p'}});
    expect(body.maxAge).toBeUndefined();
    expect(body.applicationId).toBeUndefined();
  });

  it('replaces the session with the token its assertion is exchanged for when the same user signed in', async () => {
    const client = await flowSessionClient();
    const assertion = encode({exp: 2000, iat: 1000, sub: 'user-1'});
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            url.endsWith('/oauth2/token')
              ? {access_token: 'new-at', expires_in: 3600}
              : {assertion, flowStatus: 'COMPLETE'},
          ),
          {status: 200},
        ),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await client.executeReauthenticationFlow({executionId: 'e-1', inputs: {password: 'p'}});

    expect(fetchMock.mock.calls[1][0]).toBe('https://example.com/oauth2/token');
    expect(fetchMock.mock.calls[1][1].body.get('subject_token')).toBe(assertion);
    const session = await client.getStorageManager().getSessionData();
    expect(session).toMatchObject({access_token: 'new-at', embedded_sign_in: true, id_token: assertion});
  });

  it('keeps the session when a different user signed in, without exchanging the assertion', async () => {
    const client = await flowSessionClient();
    const fetchMock = stubFlow({assertion: encode({sub: 'user-2'}), flowStatus: 'COMPLETE'});

    await expect(client.executeReauthenticationFlow({executionId: 'e-1', inputs: {}})).rejects.toMatchObject({
      code: 'BROWSER-REAUTHENTICATION-DU01',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((await client.getStorageManager().getSessionData()).access_token).toBe(FLOW_SESSION.access_token);
  });

  it('needs the application ID to start', async () => {
    const client = await createClient();
    stubFlow({});

    await expect(client.executeReauthenticationFlow()).rejects.toMatchObject({code: 'BROWSER-REAUTHENTICATION-UM03'});
  });
});

describe('completeReauthenticationInPopup()', () => {
  afterEach(() => {
    window.name = '';
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('hands the callback to the opener and closes the popup', () => {
    const opener = {postMessage: vi.fn()};
    window.name = `${REAUTHENTICATION_WINDOW_PREFIX}0`;
    vi.stubGlobal('opener', opener);
    window.history.replaceState({}, '', '/callback?code=c-1&state=s-1');
    const close = vi.spyOn(window, 'close').mockImplementation(() => undefined);

    expect(completeReauthenticationInPopup()).toBe(true);
    expect(opener.postMessage).toHaveBeenCalledWith(
      {code: 'c-1', error: undefined, errorDescription: undefined, state: 's-1', type: REAUTHENTICATION_MESSAGE},
      window.location.origin,
    );
    expect(close).toHaveBeenCalled();
  });

  it('does nothing in a window that is not a re-sign-in popup', () => {
    window.name = '';
    window.history.replaceState({}, '', '/callback?code=c-1&state=s-1');

    expect(completeReauthenticationInPopup()).toBe(false);
  });
});
