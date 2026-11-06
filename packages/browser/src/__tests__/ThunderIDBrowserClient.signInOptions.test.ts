// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ExtendedAuthorizeRequestUrlParams, StorageManager} from '@thunderid/javascript';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {BrowserAuthConfig} from '../models/BrowserConfig';
import ThunderIDBrowserClient from '../ThunderIDBrowserClient';
import SPAUtils from '../utils/SPAUtils';

const AUTHORIZE = 'https://example.com/oauth2/authorize';
const RESOURCE = 'https://api.example.com';

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

describe('ThunderIDBrowserClient configured sign-in options', () => {
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

  it('sends the configured sign-in options on the authorize request of a sign-in call without options', async () => {
    const client = await createClient({signInOptions: {prompt: 'login', resource: RESOURCE}});

    await client.signIn();

    expect(searchParamsOf(client).get('resource')).toBe(RESOURCE);
    expect(searchParamsOf(client).get('prompt')).toBe('login');
  });

  it('treats an empty options object as no options', async () => {
    const client = await createClient({signInOptions: {resource: RESOURCE}});

    await client.signIn({});

    expect(searchParamsOf(client).get('resource')).toBe(RESOURCE);
  });

  it('sends the options of a sign-in call in place of the configured ones', async () => {
    const client = await createClient({signInOptions: {prompt: 'login', resource: RESOURCE}});

    await client.signIn({resource: 'https://other.example.com'});

    expect(searchParamsOf(client).get('resource')).toBe('https://other.example.com');
    expect(searchParamsOf(client).has('prompt')).toBe(false);
  });

  it('sends no extra parameters when none are configured', async () => {
    const client = await createClient();

    await client.signIn();

    expect(searchParamsOf(client).has('resource')).toBe(false);
    expect(searchParamsOf(client).get('client_id')).toBe('test-client');
  });
});
