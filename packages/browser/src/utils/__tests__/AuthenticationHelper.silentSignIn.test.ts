// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {User} from '@thunderid/javascript';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {SILENT_SIGN_IN_SIGNED_IN, SILENT_SIGN_IN_SIGNED_OUT} from '../../constants/SPAConstants';
import AuthenticationHelper from '../AuthenticationHelper';
import SPAUtils from '../SPAUtils';

const SILENT_STATE = 'instance_0_sign-in-silently_request_0';

const createHelper = (): AuthenticationHelper<unknown> =>
  new AuthenticationHelper<unknown>({} as any, {} as any, 0, {
    exchangeToken: vi.fn(),
    getAccessToken: vi.fn(),
    getCrypto: vi.fn(),
    getDecodedIdToken: vi.fn(),
    getIDPAccessToken: vi.fn(),
    getIdToken: vi.fn(),
    getOpenIDProviderEndpoints: vi.fn(),
    getUser: vi.fn(),
    isSignedIn: vi.fn(),
    refreshAccessToken: vi.fn(),
    setPKCECode: vi.fn(),
  });

const setUrl = (search: string): void => {
  window.history.replaceState({}, '', `/${search}`);
};

const postFromIframe = (data: unknown, origin: string = window.location.origin): void => {
  const iframe = document.querySelector('iframe') as HTMLIFrameElement;

  window.dispatchEvent(new MessageEvent('message', {data, origin, source: iframe.contentWindow}));
};

const waitForIframe = async (): Promise<void> => {
  await vi.waitFor(() => expect(document.querySelector('iframe')).not.toBeNull());
};

describe('AuthenticationHelper silent sign-in', () => {
  beforeEach(() => {
    vi.spyOn(SPAUtils, 'waitTillPageRedirect').mockResolvedValue();
    // The relayed page blanks itself; jsdom does not implement navigation.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    setUrl('');
  });

  describe('handleSilentSignInResponse', () => {
    it('relays the authorization code to the parent window', async () => {
      const postMessage = vi.spyOn(window, 'postMessage').mockImplementation(() => undefined);
      setUrl(`?code=abc&state=${SILENT_STATE}`);

      await expect(createHelper().handleSilentSignInResponse()).resolves.toBe(true);

      expect(postMessage).toHaveBeenCalledWith(
        {data: {code: 'abc', state: SILENT_STATE}, type: SILENT_SIGN_IN_SIGNED_IN},
        window.location.origin,
      );
    });

    it('relays an error response such as login_required as signed out', async () => {
      const postMessage = vi.spyOn(window, 'postMessage').mockImplementation(() => undefined);
      setUrl(`?error=login_required&state=${SILENT_STATE}`);

      await expect(createHelper().handleSilentSignInResponse()).resolves.toBe(true);

      expect(postMessage).toHaveBeenCalledWith(
        {data: {code: '', error: 'login_required', state: SILENT_STATE}, type: SILENT_SIGN_IN_SIGNED_OUT},
        window.location.origin,
      );
    });

    it('relays a response with neither code nor error as signed out', async () => {
      const postMessage = vi.spyOn(window, 'postMessage').mockImplementation(() => undefined);
      setUrl(`?state=${SILENT_STATE}`);

      await expect(createHelper().handleSilentSignInResponse()).resolves.toBe(true);

      expect(postMessage).toHaveBeenCalledWith(
        {data: undefined, type: SILENT_SIGN_IN_SIGNED_OUT},
        window.location.origin,
      );
    });

    it('ignores a callback that is not a silent sign-in response', async () => {
      const postMessage = vi.spyOn(window, 'postMessage').mockImplementation(() => undefined);
      setUrl('?code=abc&state=instance_0_request_0');

      await expect(createHelper().handleSilentSignInResponse()).resolves.toBe(false);

      expect(postMessage).not.toHaveBeenCalled();
    });
  });

  describe('signInSilently', () => {
    it('exchanges the relayed code and removes the iframe', async () => {
      const user = {sub: 'user-1'} as User;
      const requestAccessToken = vi.fn().mockResolvedValue(user);
      const tokenRequestConfig = {params: {foo: 'bar'}};

      const result = createHelper().signInSilently(
        async () => 'about:blank',
        requestAccessToken,
        undefined,
        tokenRequestConfig,
      );

      await waitForIframe();
      postFromIframe({data: {code: 'abc', state: SILENT_STATE}, type: SILENT_SIGN_IN_SIGNED_IN});

      await expect(result).resolves.toBe(user);
      expect(requestAccessToken).toHaveBeenCalledWith('abc', SILENT_STATE, tokenRequestConfig);
      expect(document.querySelector('iframe')).toBeNull();
    });

    it('resolves false as soon as the iframe reports signed out', async () => {
      const requestAccessToken = vi.fn();

      const result = createHelper().signInSilently(async () => 'about:blank', requestAccessToken);

      await waitForIframe();
      postFromIframe({type: SILENT_SIGN_IN_SIGNED_OUT});

      await expect(result).resolves.toBe(false);
      expect(requestAccessToken).not.toHaveBeenCalled();
      expect(document.querySelector('iframe')).toBeNull();
    });

    it('reports the error the iframe relays when it signs out', async () => {
      const onSignedOut = vi.fn();

      const result = createHelper().signInSilently(
        async () => 'about:blank',
        vi.fn(),
        undefined,
        undefined,
        undefined,
        onSignedOut,
      );

      await waitForIframe();
      postFromIframe({data: {error: 'unauthorized_client'}, type: SILENT_SIGN_IN_SIGNED_OUT});

      await expect(result).resolves.toBe(false);
      expect(onSignedOut).toHaveBeenCalledWith('unauthorized_client');
    });

    it('resolves false after the configured timeout when the iframe never answers', async () => {
      const started: number = Date.now();

      const result = await createHelper().signInSilently(async () => 'about:blank', vi.fn(), undefined, undefined, 50);

      expect(result).toBe(false);
      expect(Date.now() - started).toBeLessThan(5000);
      expect(document.querySelector('iframe')).toBeNull();
    });

    it('ignores messages from another origin', async () => {
      const requestAccessToken = vi.fn();

      const result = createHelper().signInSilently(async () => 'about:blank', requestAccessToken);

      await waitForIframe();
      postFromIframe(
        {data: {code: 'stolen', state: SILENT_STATE}, type: SILENT_SIGN_IN_SIGNED_IN},
        'https://attacker.example',
      );
      postFromIframe({type: SILENT_SIGN_IN_SIGNED_OUT});

      await expect(result).resolves.toBe(false);
      expect(requestAccessToken).not.toHaveBeenCalled();
    });
  });
});
