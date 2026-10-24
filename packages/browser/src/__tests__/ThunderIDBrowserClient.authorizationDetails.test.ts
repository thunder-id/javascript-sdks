// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AuthorizationDetail, ExtendedAuthorizeRequestUrlParams, StorageManager} from '@thunderid/javascript';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {BrowserAuthConfig} from '../models/BrowserConfig';
import ThunderIDBrowserClient from '../ThunderIDBrowserClient';
import SPAUtils from '../utils/SPAUtils';

const AUTHORIZE = 'https://example.com/oauth2/authorize';
const PAYMENT: AuthorizationDetail = {actions: ['initiate'], instructedAmount: {amount: '20'}, type: 'payment'};
const ACCOUNT: AuthorizationDetail = {type: 'account_information'};

/** Records every authorize URL the client builds, since signing in navigates away from the page. */
class RecordingClient extends ThunderIDBrowserClient {
  public signInUrls: string[] = [];

  public storage(): StorageManager<BrowserAuthConfig> {
    return this.getStorageManager();
  }

  protected override async getSignInUrl(
    requestConfig?: ExtendedAuthorizeRequestUrlParams,
    userId?: string,
  ): Promise<string> {
    const url: string = await super.getSignInUrl(requestConfig, userId);
    this.signInUrls.push(url);

    return url;
  }
}

const createClient = async (config: Partial<BrowserAuthConfig> = {}): Promise<RecordingClient> => {
  const client = new RecordingClient();
  await client.initialize({baseUrl: 'https://example.com', clientId: 'test-client', ...config});
  await client.storage().setOIDCProviderMetaData({
    authorization_endpoint: AUTHORIZE,
    token_endpoint: 'https://example.com/token',
  });
  await client.storage().setTemporaryDataParameter('op_config_initiated', true);

  return client;
};

const searchParamsOf = (client: RecordingClient): URLSearchParams => new URL(client.signInUrls[0]).searchParams;

const authorizationDetailsOf = (client: RecordingClient): unknown =>
  JSON.parse(searchParamsOf(client).get('authorization_details') ?? 'null');

describe('ThunderIDBrowserClient authorization details', () => {
  beforeEach(() => {
    vi.spyOn(SPAUtils, 'waitTillPageRedirect').mockResolvedValue();
    // jsdom does not implement the navigation that signIn starts.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    document.body.innerHTML = '';
  });

  it('sends the authorization details of a sign-in call on the authorize request', async () => {
    const client = await createClient({authorizationDetails: [PAYMENT]});

    await client.signIn({authorizationDetails: [ACCOUNT]});

    expect(authorizationDetailsOf(client)).toEqual([ACCOUNT]);
    expect(searchParamsOf(client).has('authorizationDetails')).toBe(false);
    expect(searchParamsOf(client).get('code_challenge')).toBeTruthy();
  });

  it('sends the configured authorization details on the authorize request', async () => {
    const client = await createClient({authorizationDetails: [PAYMENT]});

    await client.signIn();

    expect(authorizationDetailsOf(client)).toEqual([PAYMENT]);
  });

  it('sends the authorization details of a silent sign-in call on its authorize request', async () => {
    const client = await createClient({
      authorizationDetails: [PAYMENT],
      session: {silentSignIn: {timeout: 1}},
    });

    await expect(client.signInSilently({authorizationDetails: [ACCOUNT]})).resolves.toBe(false);

    expect(authorizationDetailsOf(client)).toEqual([ACCOUNT]);
    expect(searchParamsOf(client).get('prompt')).toBe('none');
  });
});
