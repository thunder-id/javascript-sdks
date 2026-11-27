// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * A signed-in session, as a BFF holds it. Only `idTokenClaims`, `expiresAt` and `scope` ever reach the
 * browser; the access token stays on the server.
 */
export interface BffSession {
  /** The access token, sent to the API by the proxy and never to the browser. */
  accessToken: string;
  /** When the access token expires, in seconds since the epoch. */
  expiresAt: number;
  /** The ID token's claims. The protocol claims are dropped before they are sent to the browser. */
  idTokenClaims: Record<string, unknown>;
  /** The scopes the access token was granted, space separated. */
  scope?: string;
}

/**
 * The outcome of switching the session to another organization unit. `error` is an OAuth error code;
 * `interaction_required` and `login_required` send the browser through sign-in for the unit instead.
 */
export type BffSwitchResult = {ok: true} | {error: string; status?: number};

/**
 * What a framework SDK provides so the BFF handler can serve the contract: its own way of starting
 * and finishing sign-in, and of keeping the session. Each method may set cookies on the response it
 * is building; the handler adds `headers` from the result, when given, to its response.
 *
 * None of these methods returns a token to the browser. The handler shapes every response.
 */
export interface BffAdapter {
  /**
   * Starts sign-in: answers with a redirect to the authorization server, or straight to `returnTo`
   * when the session is already signed in.
   */
  signIn(request: Request, params: {ouId?: string; returnTo: string}): Promise<Response>;
  /** Completes sign-in on the authorization server's redirect, and redirects to where it began. */
  callback(request: Request): Promise<Response>;
  /**
   * The session, refreshing an expired access token when it can. `null` when there is no signed-in
   * session, which includes one a back-channel logout ended.
   */
  getSession(request: Request): Promise<BffSession | null>;
  /**
   * Whether the session is still live, without refreshing it or counting the call as activity, so
   * the browser can poll it.
   */
  isSessionLive(request: Request): Promise<boolean>;
  /** Refreshes the session's tokens. `false` when it cannot, and the session is then over. */
  refresh(request: Request): Promise<boolean>;
  /**
   * Ends the session here and returns where the browser goes to end it at the authorization server.
   * Called with no session too, and then only returns where the browser goes.
   */
  signOut(request: Request): Promise<{redirectUrl: string}>;
  /** Switches the session to another organization unit without a redirect. Omitted when not supported. */
  switchOrganizationUnit?(request: Request, ouId: string): Promise<BffSwitchResult>;
  /** Receives a back-channel logout token from the authorization server. Omitted when not served. */
  backchannelLogout?(request: Request): Promise<Response>;
}

/**
 * How the BFF handler is set up.
 */
export interface BffOptions {
  /**
   * Where the BFF endpoints are served. Requests outside it are not handled. Defaults to `/api/auth`.
   */
  prefix?: string;
  /**
   * The API the proxy forwards to. A request to `<prefix>/proxy/<path>` goes to `<apiBaseUrl>/<path>`
   * with the session's access token. Without it, the proxy is not served.
   */
  apiBaseUrl?: string;
  /**
   * The origins a state-changing request may come from, checked against its `Origin` header. Without
   * it, only `Sec-Fetch-Site` is checked, which a browser always sends.
   */
  allowedOrigins?: string[];
  /**
   * Serve `POST <prefix>/token`, which hands the access token to the browser for requests that skip
   * the proxy (`endpoints.backend.bypass` in the browser SDK). That is the token-mediating pattern of
   * RFC 10017 section 6.2, so it is off unless turned on. Defaults to `false`.
   */
  exposeAccessToken?: boolean;
}
