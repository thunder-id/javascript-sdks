// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  Telemetry,
  TelemetryApiOutcome,
  TelemetryAuthAction,
  TelemetryConfig,
  TelemetryIdentity,
  getVendorPrefix,
} from '@thunderid/javascript';

/**
 * How long a send may take before it is abandoned.
 */
const SEND_TIMEOUT_MS = 10000;

/**
 * How long reading the app's token for a send may take before the send goes without it.
 */
const TOKEN_TIMEOUT_MS = 3000;

/**
 * What the browser client gives its telemetry.
 */
export interface BrowserTelemetryDependencies {
  /**
   * The base URLs of the SDK's API, watched for API events.
   */
  apiBases: string[];
  /**
   * Whether the app runs behind a backend that holds the tokens, so the browser has none to send.
   */
  backend: boolean;
  /**
   * The app's access token, for an endpoint on the app's origin.
   */
  getAccessToken: () => Promise<string>;
  /**
   * The signed-in user's claims, or nothing.
   */
  getClaims: () => Promise<Record<string, unknown> | undefined>;
  /**
   * The vendor, which namespaces what the telemetry stores in the browser.
   */
  vendor?: string;
}

/**
 * The SDK's telemetry in a browser: sends with `fetch`, attributes events to the ID token's user and
 * organization, reports links that leave the app, and sends what is waiting when the page is hidden.
 */
export class BrowserTelemetry {
  private readonly telemetry: Telemetry;

  private readonly endpointUrl: URL;

  /**
   * Where the last sign-in reported to this endpoint is kept, so a reload, a token refresh or a silent
   * sign-in is not reported again.
   */
  private readonly signInKey: string;

  private disposed = false;

  /**
   * Counts sign-outs and expired sessions, so a sign-in still being read when one happens is dropped.
   */
  private signOuts = 0;

  private readonly onClick = (event: MouseEvent): void => {
    // Listened to in the capture phase, before any handler can cancel the click; a middle click opens
    // the link too.
    if (event.type === 'auxclick' && event.button !== 1) {
      return;
    }
    const target: EventTarget | null = event.target;
    const anchor: HTMLAnchorElement | null =
      target instanceof Element ? target.closest<HTMLAnchorElement>('a[href]') : null;
    if (anchor) {
      this.telemetry.link(anchor.href);
    }
  };

  private readonly onHide = (): void => {
    if (document.visibilityState === 'hidden') {
      void this.telemetry.flush(true);
    }
  };

  private readonly onPageHide = (): void => {
    void this.telemetry.flush(true);
  };

  /**
   * @param config - The telemetry configuration, with an endpoint.
   * @param dependencies - What the browser client provides.
   */
  constructor(
    private readonly config: TelemetryConfig & {endpoint: string},
    private readonly dependencies: BrowserTelemetryDependencies,
  ) {
    this.endpointUrl = new URL(config.endpoint, window.location.origin);
    // Events only go over HTTPS, or to a path on the app's own origin.
    if (this.endpointUrl.protocol !== 'https:' && this.endpointUrl.origin !== window.location.origin) {
      throw new Error('The telemetry endpoint must use HTTPS.');
    }
    this.signInKey = `${getVendorPrefix(dependencies.vendor)}-telemetry-sign-in:${this.endpointUrl.href}`;
    this.telemetry = new Telemetry(config, {
      apiBases: dependencies.apiBases,
      identity: {getIdentity: () => this.identity()},
      origin: window.location.origin,
      transport: {send: (body: string, keepalive: boolean) => this.send(body, keepalive)},
      userAgent: typeof navigator === 'undefined' ? undefined : navigator.userAgent,
    });
    document.addEventListener('click', this.onClick, true);
    document.addEventListener('auxclick', this.onClick, true);
    document.addEventListener('visibilitychange', this.onHide);
    window.addEventListener('pagehide', this.onPageHide);
  }

  /**
   * Reports a page view from its matched route pattern.
   */
  page(pattern: string): void {
    this.telemetry.page(pattern);
  }

  /**
   * Reports an API call the app made through the SDK.
   */
  api(method: string | undefined, url: string | undefined, body: unknown, outcome: TelemetryApiOutcome): void {
    this.telemetry.api(method, url, body, outcome);
  }

  /**
   * Reports an auth event.
   */
  auth(action: TelemetryAuthAction, data?: Record<string, string>): void {
    if (action === 'sign-out' || action === 'session-expired') {
      this.forgetSignIn();
    }
    this.telemetry.auth(action, data);
  }

  /**
   * Reports a sign-in once per sign-in session: the SDK also signs in silently on a reload and after an
   * organization switch, which are not new sign-ins.
   */
  async signedIn(): Promise<void> {
    const signOuts: number = this.signOuts;
    const claims: Record<string, unknown> | undefined = await this.dependencies.getClaims().catch(() => undefined);
    const user: unknown = claims?.[this.config.identity?.userClaim ?? 'sub'];
    // Once replaced, the telemetry that replaced it reports the sign-in instead; after a sign-out
    // meanwhile, the session it read has ended.
    if (typeof user !== 'string' || this.disposed || this.signOuts !== signOuts) {
      return;
    }
    const session: unknown = claims?.['auth_time'] ?? claims?.['sid'];
    const key = `${user}:${typeof session === 'string' || typeof session === 'number' ? session : ''}`;
    const store: Storage | undefined =
      session === undefined ? BrowserTelemetry.storage('session') : BrowserTelemetry.storage('local');
    try {
      if (store?.getItem(this.signInKey) === key) {
        return;
      }
      store?.setItem(this.signInKey, key);
    } catch {
      // Without storage, a reload may report the sign-in again.
    }
    this.telemetry.auth('sign-in');
  }

  /**
   * Reports an event the app names.
   */
  track(name: string, data?: Record<string, string>): void {
    this.telemetry.track(name, data);
  }

  /**
   * Sends what is waiting.
   */
  flush(keepalive = false): Promise<void> {
    return this.telemetry.flush(keepalive);
  }

  /**
   * Stops listening and sends what is waiting.
   */
  dispose(): Promise<void> {
    this.disposed = true;
    document.removeEventListener('click', this.onClick, true);
    document.removeEventListener('auxclick', this.onClick, true);
    document.removeEventListener('visibilitychange', this.onHide);
    window.removeEventListener('pagehide', this.onPageHide);
    return this.telemetry.dispose();
  }

  private static storage(kind: 'local' | 'session'): Storage | undefined {
    try {
      return kind === 'local' ? window.localStorage : window.sessionStorage;
    } catch {
      return undefined;
    }
  }

  private forgetSignIn(): void {
    this.signOuts += 1;
    for (const kind of ['local', 'session'] as const) {
      try {
        BrowserTelemetry.storage(kind)?.removeItem(this.signInKey);
      } catch {
        // Nothing to forget.
      }
    }
  }

  private async identity(): Promise<TelemetryIdentity> {
    const claims: Record<string, unknown> | undefined = await this.dependencies.getClaims().catch(() => undefined);
    const user: unknown = claims?.[this.config.identity?.userClaim ?? 'sub'];
    const organization: unknown = claims?.[this.config.identity?.organizationClaim ?? 'ouId'];
    return {
      organizationId: typeof organization === 'string' ? organization : undefined,
      userId: typeof user === 'string' ? user : undefined,
    };
  }

  /**
   * The token the endpoint gets: a configured token only; none when the app runs behind a backend or
   * when `token` is `false`; the app's own token for an endpoint on the app's origin; else none.
   */
  private async token(): Promise<string | undefined> {
    const {token} = this.config;
    // A configured string, even an empty one, means the app's own token is never sent.
    if (typeof token === 'string') {
      return token || undefined;
    }
    if (token === false || this.dependencies.backend || this.endpointUrl.origin !== window.location.origin) {
      return undefined;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<undefined>((resolve: (value: undefined) => void) => {
      timer = setTimeout(() => resolve(undefined), TOKEN_TIMEOUT_MS);
    });
    try {
      return await Promise.race([this.dependencies.getAccessToken().catch(() => undefined), deadline]);
    } finally {
      clearTimeout(timer);
    }
  }

  private async send(body: string, keepalive: boolean): Promise<void> {
    const headers: Record<string, string> = {'Content-Type': 'application/json'};
    const token: string | undefined = await this.token();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // A send the endpoint never answers is abandoned, so it cannot hold a request open.
    const controller: AbortController = new AbortController();
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
    try {
      await fetch(this.endpointUrl.href, {
        body,
        credentials: this.endpointUrl.origin === window.location.origin ? 'same-origin' : 'omit',
        headers,
        keepalive,
        method: 'POST',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }
}

export default BrowserTelemetry;
