// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {BackendSession, ResolvedBackendEndpoints, ThunderIDAuthException} from '@thunderid/javascript';

/**
 * Header every backend request carries. A cross-origin page cannot set it without a CORS preflight,
 * which the backend never answers, so it keeps the cookie from being used cross-site.
 */
export const BACKEND_REQUEST_HEADER = 'X-Requested-With';

const BACKEND_REQUEST_HEADER_VALUE = 'XMLHttpRequest';

/** A check on focus is skipped when the last one is more recent than this, in milliseconds. */
const FOCUS_CHECK_THROTTLE = 5000;

/**
 * Talks to the app's backend when sign-in runs there: reads the session, refreshes it, and starts and ends it. The
 * browser never holds a token; the backend keeps them behind an `HttpOnly` cookie.
 */
class BackendClient {
  private session: Promise<BackendSession> | undefined;

  private refreshing: Promise<boolean> | undefined;

  private hasLoadedSession = false;

  /** Whether the session last seen was signed in, so a later read can tell it has ended. */
  private wasSignedIn = false;

  private lastCheck = 0;

  private readonly signedOutListeners: (() => void)[] = [];

  constructor(private readonly endpoints: ResolvedBackendEndpoints) {}

  /**
   * Calls the listener when a signed-in session turns out to have ended without this client signing
   * out: another app signed the user out, an administrator ended the session, or it timed out.
   */
  onSignedOut(listener: () => void): void {
    this.signedOutListeners.push(listener);
  }

  /**
   * Records that the session has ended, and tells the listeners when it had been signed in.
   */
  markSignedOut(): void {
    this.session = Promise.resolve({isSignedIn: false});
    this.hasLoadedSession = true;

    if (this.wasSignedIn) {
      this.wasSignedIn = false;
      this.signedOutListeners.forEach((listener: () => void) => listener());
    }
  }

  /**
   * Asks the backend whether the session is still live. The check neither refreshes the session nor
   * counts as activity, so it can be polled without keeping an idle session alive.
   *
   * @returns Whether the session is live. A failed check reports the last known state.
   */
  async checkSession(): Promise<boolean> {
    this.lastCheck = Date.now();

    try {
      const response: Response = await this.send(this.endpoints.checkSession, 'GET');
      if (!response.ok) {
        return this.wasSignedIn;
      }
      const {isSignedIn} = (await response.json()) as {isSignedIn: boolean};
      if (!isSignedIn) {
        this.markSignedOut();
      }

      return isSignedIn;
    } catch {
      return this.wasSignedIn;
    }
  }

  /**
   * Watches for the session ending while the page is open: checks it whenever the page gets focus or
   * becomes visible again, and every `pollSeconds` while it is visible when that is positive.
   *
   * @returns A function that stops watching.
   */
  watch(pollSeconds: number): () => void {
    const checkIfSignedIn = (): void => {
      if (this.wasSignedIn && document.visibilityState === 'visible') {
        void this.checkSession();
      }
    };
    const onFocus = (): void => {
      if (Date.now() - this.lastCheck >= FOCUS_CHECK_THROTTLE) {
        checkIfSignedIn();
      }
    };

    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    const timer: ReturnType<typeof setInterval> | undefined =
      pollSeconds > 0 ? setInterval(checkIfSignedIn, pollSeconds * 1000) : undefined;

    return (): void => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
      if (timer) {
        clearInterval(timer);
      }
    };
  }

  /**
   * Returns the session. The result is cached until a sign-in, sign-out, or refresh changes it, so
   * repeated sign-in checks do not reach the server each time.
   *
   * @param reload - Read the session from the server even when one is cached.
   */
  getSession(reload = false): Promise<BackendSession> {
    if (reload) {
      this.session = undefined;
    }

    this.session ??= this.loadSession()
      .catch((error: unknown) => {
        this.session = undefined;
        throw error;
      })
      .finally(() => {
        this.hasLoadedSession = true;
      });

    return this.session;
  }

  /**
   * Whether this client talks to exactly these endpoints.
   */
  hasEndpoints(endpoints: ResolvedBackendEndpoints): boolean {
    return (Object.keys(endpoints) as (keyof ResolvedBackendEndpoints)[]).every(
      (key: keyof ResolvedBackendEndpoints) => this.endpoints[key] === endpoints[key],
    );
  }

  /**
   * Whether the first session read is still in flight, so it is not yet known whether the user is
   * signed in.
   */
  isLoading(): boolean {
    return !this.hasLoadedSession;
  }

  /**
   * Refreshes the session once, sharing one request between concurrent callers.
   *
   * @returns Whether the session was refreshed. When it was not, the session is now signed out.
   */
  refresh(): Promise<boolean> {
    this.refreshing ??= this.send(this.endpoints.refresh, 'POST')
      .then((response: Response) => {
        if (response.ok) {
          this.session = undefined;
        } else {
          this.markSignedOut();
        }

        return response.ok;
      })
      .finally(() => {
        this.refreshing = undefined;
      });

    return this.refreshing;
  }

  /**
   * The URL that starts sign-in at the backend and comes back to `returnTo`.
   */
  getSignInUrl(returnTo: string): string {
    return `${this.endpoints.signIn}?${new URLSearchParams({returnTo}).toString()}`;
  }

  /**
   * Ends the backend session.
   *
   * @returns The URL the browser visits to end the session at the authorization server.
   */
  async signOut(): Promise<string> {
    const response: Response = await this.send(this.endpoints.signOut, 'POST');
    // Signing out here is not news to anyone, so the listeners are not told.
    this.wasSignedIn = false;
    this.session = Promise.resolve({isSignedIn: false});

    if (!response.ok) {
      throw new ThunderIDAuthException(
        'SPA-BACKEND_CLIENT-SO-SE01',
        'Sign out failed.',
        `The backend sign-out endpoint returned ${response.status}.`,
      );
    }

    return ((await response.json()) as {redirectUrl: string}).redirectUrl;
  }

  /**
   * Maps an API URL to its backend proxy URL.
   *
   * @returns The proxy URL, or `undefined` when the URL is not under the API base and so cannot be
   * sent with the session's credentials.
   */
  toProxyUrl(url: string): string | undefined {
    const {apiBaseUrl, proxy} = this.endpoints;
    let rest: string;

    if (url === apiBaseUrl || url.startsWith(`${apiBaseUrl}/`) || url.startsWith(`${apiBaseUrl}?`)) {
      rest = url.slice(apiBaseUrl.length);
    } else if (url.startsWith('/') && !url.startsWith('//')) {
      rest = url;
    } else {
      return undefined;
    }

    return `${proxy}${rest.startsWith('/') ? rest : `/${rest}`}`;
  }

  /**
   * The headers and credentials mode every backend request is sent with.
   */
  static requestInit(headers: Record<string, string> = {}): Pick<RequestInit, 'credentials'> & {
    headers: Record<string, string>;
  } {
    return {credentials: 'same-origin', headers: {...headers, [BACKEND_REQUEST_HEADER]: BACKEND_REQUEST_HEADER_VALUE}};
  }

  private async loadSession(): Promise<BackendSession> {
    let response: Response = await this.send(this.endpoints.session, 'GET');

    if (response.status === 401 && (await this.refresh())) {
      response = await this.send(this.endpoints.session, 'GET');
    }

    if (response.status === 401) {
      return this.signedOutSession();
    }

    if (!response.ok) {
      throw new ThunderIDAuthException(
        'SPA-BACKEND_CLIENT-GS-SE01',
        'Failed to read the session.',
        `The backend session endpoint returned ${response.status}.`,
      );
    }

    const session: BackendSession = (await response.json()) as BackendSession;
    if (!session.isSignedIn) {
      return this.signedOutSession();
    }
    this.wasSignedIn = true;

    return session;
  }

  private signedOutSession(): BackendSession {
    if (this.wasSignedIn) {
      // Defer, so the listeners see this read's result in the cache rather than racing it.
      queueMicrotask(() => this.markSignedOut());
    }

    return {isSignedIn: false};
  }

  private send(url: string, method: string): Promise<Response> {
    return fetch(url, {method, ...BackendClient.requestInit({Accept: 'application/json'})});
  }
}

export default BackendClient;
