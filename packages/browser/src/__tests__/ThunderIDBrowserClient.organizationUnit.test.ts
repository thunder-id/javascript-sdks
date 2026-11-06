// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
import {ExtendedAuthorizeRequestUrlParams, OrganizationUnitSwitchErrorCodes} from '@thunderid/javascript';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {BrowserAuthConfig} from '../models/BrowserConfig';
import ThunderIDBrowserClient from '../ThunderIDBrowserClient';
import SPAUtils from '../utils/SPAUtils';

const SESSION = {access_token: 'old-at', created_at: Date.now(), expires_in: '3600', id_token: 'old-id'};

const encode = (claims: Record<string, unknown>): string =>
  `h.${btoa(JSON.stringify(claims)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')}.s`;

/** Records every authorize URL the client builds, since signing in navigates away from the page. */
class RecordingClient extends ThunderIDBrowserClient<any> {
  public signInUrls: string[] = [];

  protected override async getSignInUrl(
    requestConfig?: ExtendedAuthorizeRequestUrlParams,
    userId?: string,
  ): Promise<string> {
    const url: string = await super.getSignInUrl(requestConfig, userId);
    this.signInUrls.push(url);

    return url;
  }
}

let instance = 40;

const createClient = async (config: Partial<BrowserAuthConfig> = {}): Promise<RecordingClient> => {
  instance += 1;
  const client = new RecordingClient(instance);
  await client.initialize({
    afterSignInUrl: 'https://app.example.com/callback',
    applicationId: 'app-1',
    baseUrl: 'https://example.com',
    clientId: 'test-client',
    ...config,
  } as any);
  const sm: any = (client as any).getStorageManager();
  await sm.setOIDCProviderMetaData({
    authorization_endpoint: 'https://example.com/oauth2/authorize',
    token_endpoint: 'https://example.com/oauth2/token',
  });
  await sm.setTemporaryDataParameter('op_config_initiated', true);
  await sm.setSessionData(SESSION);

  return client;
};

const sessionOf = async (client: RecordingClient): Promise<any> => (client as any).getStorageManager().getSessionData();

/** Makes the silent iframe answer: a user, or the OAuth error the server redirected with. */
const silentAnswer = (client: RecordingClient, answer: {error?: string; user?: unknown}): void => {
  vi.spyOn((client as any)._authHelper, 'signInSilently').mockImplementation(
    async (buildUrl: any, _exchange: any, params: any, _trc: any, _timeout: any, onSignedOut: any) => {
      await buildUrl(params);

      if (answer.user) {
        return answer.user;
      }

      onSignedOut?.(answer.error);

      return false;
    },
  );
};

describe('ThunderIDBrowserClient.switchOrganizationUnit()', () => {
  beforeEach(() => {
    vi.spyOn(SPAUtils, 'waitTillPageRedirect').mockResolvedValue();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    sessionStorage.clear();
    localStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('refuses an empty unit', async () => {
    const client = await createClient();

    await expect(client.switchOrganizationUnit(' ')).rejects.toMatchObject({
      code: OrganizationUnitSwitchErrorCodes.InvalidOrganizationUnit,
    });
  });

  it('switches silently at the unit authorization endpoint', async () => {
    const client = await createClient();
    silentAnswer(client, {user: {sub: 'u1'}});

    await expect(client.switchOrganizationUnit('ou-1')).resolves.toEqual({sub: 'u1'});

    const url = new URL(client.signInUrls[0]);
    expect(url.pathname).toBe('/ou/ou-1/oauth2/authorize');
    expect(url.searchParams.get('prompt')).toBe('none');
  });

  it('fails with unauthorized_client and keeps the previous session', async () => {
    const client = await createClient();
    silentAnswer(client, {error: 'unauthorized_client'});

    await expect(client.switchOrganizationUnit('ou-x')).rejects.toMatchObject({
      code: OrganizationUnitSwitchErrorCodes.UnauthorizedClient,
      serverError: {code: 'unauthorized_client'},
    });
    expect(await sessionOf(client)).toMatchObject({access_token: 'old-at'});
  });

  it('fails with interaction_required when it may not redirect', async () => {
    const client = await createClient();
    silentAnswer(client, {error: 'login_required'});

    await expect(client.switchOrganizationUnit('ou-1', {redirect: false})).rejects.toMatchObject({
      code: OrganizationUnitSwitchErrorCodes.InteractionRequired,
    });
    expect(client.signInUrls).toHaveLength(1);
  });

  it('redirects to the unit when the server needs the user', async () => {
    const client = await createClient();
    silentAnswer(client, {error: 'login_required'});

    await expect(client.switchOrganizationUnit('ou-1')).resolves.toBeUndefined();

    expect(client.signInUrls).toHaveLength(2);
    expect(new URL(client.signInUrls[1]).pathname).toBe('/ou/ou-1/oauth2/authorize');
    expect(new URL(client.signInUrls[1]).searchParams.has('prompt')).toBe(false);
    expect(await (client as any).getStorageManager().getTemporaryDataParameter('organization_unit_switch')).toBe(
      'ou-1',
    );
  });

  it('redeems the callback of a redirected switch although the old session is signed in', async () => {
    const client = await createClient();
    const sm: any = (client as any).getStorageManager();
    await sm.setTemporaryDataParameter('organization_unit_switch', 'ou-1');
    window.history.replaceState(null, '', '/callback?code=c1&state=s1');
    const exchange = vi.spyOn(client as any, '_exchangeCodeForTokens').mockResolvedValue({sub: 'switched'});

    await expect(client.signIn()).resolves.toEqual({sub: 'switched'});

    expect(exchange).toHaveBeenCalledWith('c1', 's1', undefined);
    expect(await sm.getTemporaryDataParameter('organization_unit_switch')).toBeFalsy();
  });

  it('reports an error on the callback of a redirected switch and keeps the session', async () => {
    const client = await createClient();
    const sm: any = (client as any).getStorageManager();
    await sm.setTemporaryDataParameter('organization_unit_switch', 'ou-x');
    window.history.replaceState(null, '', '/callback?error=unauthorized_client&state=s1');

    await expect(client.signIn()).rejects.toMatchObject({code: OrganizationUnitSwitchErrorCodes.UnauthorizedClient});

    expect(window.location.search).toBe('');
    expect(await sessionOf(client)).toMatchObject({access_token: 'old-at'});
  });

  describe('embedded mode', () => {
    const flowResponse = (body: unknown, ok = true, status = 200): unknown => ({
      json: () => Promise.resolve(body),
      ok,
      status,
      statusText: ok ? 'OK' : 'Bad Request',
      text: () => Promise.resolve(JSON.stringify(body)),
    });

    it('starts a sign-in flow with ouId and replaces the session with its assertion', async () => {
      const client = await createClient({mode: 'embedded'} as any);
      const assertion: string = encode({
        exp: Math.floor(Date.now() / 1000) + 600,
        iat: Math.floor(Date.now() / 1000),
        ouId: 'ou-1',
        sub: 'u1',
      });
      const fetchMock = vi.fn().mockResolvedValue(flowResponse({assertion, flowStatus: 'COMPLETE'}));
      vi.stubGlobal('fetch', fetchMock);

      await client.switchOrganizationUnit('ou-1');

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(fetchMock.mock.calls[0][0]).toBe('https://example.com/flow/execute');
      expect(body).toMatchObject({applicationId: 'app-1', flowType: 'AUTHENTICATION', ouId: 'ou-1'});
      expect(await sessionOf(client)).toMatchObject({access_token: assertion, id_token: assertion});
      expect(await client.getCurrentOrganizationUnit()).toEqual({id: 'ou-1'});
    });

    it('maps FES-1023 to unauthorized_client and keeps the session', async () => {
      const client = await createClient({mode: 'embedded'} as any);
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(flowResponse({code: 'FES-1023', message: {defaultValue: 'x'}}, false, 400)),
      );

      await expect(client.switchOrganizationUnit('ou-x')).rejects.toMatchObject({
        code: OrganizationUnitSwitchErrorCodes.UnauthorizedClient,
      });
      expect(await sessionOf(client)).toMatchObject({access_token: 'old-at'});
    });

    it('fails with interaction_required when the flow asks for input', async () => {
      const client = await createClient({mode: 'embedded'} as any);
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(flowResponse({executionId: 'e1', flowStatus: 'INCOMPLETE'})));

      await expect(client.switchOrganizationUnit('ou-1')).rejects.toMatchObject({
        code: OrganizationUnitSwitchErrorCodes.InteractionRequired,
      });
      expect(await sessionOf(client)).toMatchObject({access_token: 'old-at'});
    });
  });
});
