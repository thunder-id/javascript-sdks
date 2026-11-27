// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import BffConstants from './BffConstants';
import {BffAdapter, BffOptions, BffSession, BffSwitchResult} from './models';

const {Endpoints, Errors} = BffConstants;

/** Methods that do not change state, so the `Origin` check does not apply to them. */
const SAFE_METHODS: string[] = ['GET', 'HEAD', 'OPTIONS'];

/**
 * A JSON response that is never cached: every BFF answer depends on the session.
 */
export const bffJson = (body: unknown, status = 200, headers?: HeadersInit): Response => {
  const response = new Response(body === undefined ? null : JSON.stringify(body), {headers, status});

  if (body !== undefined) {
    response.headers.set('content-type', 'application/json');
  }
  response.headers.set('cache-control', 'no-store');

  return response;
};

/**
 * A redirect response. `Response.redirect` needs an absolute URL; this keeps a relative one as it is.
 */
export const bffRedirect = (location: string, status = 302): Response =>
  new Response(null, {headers: {'cache-control': 'no-store', location}, status});

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (char: string) => `&#${char.charCodeAt(0)};`);

/**
 * The page that moves the browser on to `location` after sign-in, for a session cookie that is
 * `SameSite=Strict`.
 *
 * The callback is the end of a redirect chain that ThunderID started, so the browser treats a redirect from it as
 * cross-site and leaves out a `Strict` cookie, including the one the callback just set. The app would then see no
 * session, and a protected page would send the user back through sign-in without end. Moving on from a page on the
 * app's own site makes the next request same-site. A `meta` refresh does it without a script, so a Content Security
 * Policy does not block it.
 *
 * @param location - Where to go next: a path on the app.
 * @returns The HTML of the page.
 */
export const renderSignInContinuePage = (location: string): string => {
  const href: string = escapeHtml(location);

  return (
    `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${href}">` +
    `<meta name="robots" content="noindex"><title>Signing in</title></head>` +
    `<body><a href="${href}">Continue</a></body></html>`
  );
};

/**
 * Ends the callback by sending the browser to `location`: a redirect, or the page of
 * `renderSignInContinuePage` when the session cookie is `SameSite=Strict`.
 *
 * @param location - Where to go next: a path on the app.
 * @param sameSite - The session cookie's `SameSite` attribute.
 * @returns The response.
 */
export const bffSignedIn = (location: string, sameSite: string): Response =>
  sameSite === 'strict'
    ? new Response(renderSignInContinuePage(location), {
        headers: {'cache-control': 'no-store', 'content-type': 'text/html; charset=utf-8'},
        status: 200,
      })
    : bffRedirect(location);

/**
 * Only a path on the app itself is a place to return to after sign-in, so sign-in cannot be used to
 * send the user to another site.
 *
 * @returns The path, or `/` when the value is not a local path.
 */
export const toSafeReturnTo = (value: unknown): string => {
  // A URL parser drops tabs and line breaks, so `/\t/evil.example` would resolve to `//evil.example`. Any control
  // character is refused, and the value must still resolve to this app's origin.
  // eslint-disable-next-line no-control-regex
  if (typeof value !== 'string' || !/^\/(?![/\\])/.test(value) || /[\u0000-\u001f\u007f]/.test(value)) {
    return '/';
  }

  const base = 'https://app.invalid';

  try {
    return new URL(value, base).origin === base ? value : '/';
  } catch {
    return '/';
  }
};

/**
 * The session as the browser sees it: the user's claims without the protocol claims, when the access
 * token expires, and its scopes. Never a token.
 */
export const toBrowserSession = (
  session: BffSession,
): {expiresAt: number; isSignedIn: true; scope?: string; user: Record<string, unknown>} => ({
  expiresAt: session.expiresAt,
  isSignedIn: true,
  scope: session.scope,
  user: Object.fromEntries(
    Object.entries(session.idTokenClaims).filter(
      ([claim]: [string, unknown]) => !(BffConstants.PROTOCOL_CLAIMS as readonly string[]).includes(claim),
    ),
  ),
});

/**
 * The origins a request may legitimately come from: the one the server sees and, behind a reverse
 * proxy, the one in `X-Forwarded-Host` and `X-Forwarded-Proto`. A cross-site page cannot set those
 * headers without a CORS preflight, so trusting them here does not weaken the check.
 */
export const getRequestOrigins = (request: Request): string[] => {
  const url = new URL(request.url);
  const host: string | undefined = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const proto: string = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ?? url.protocol.slice(0, -1);
  const origins: string[] = [url.origin];

  if (host) {
    try {
      origins.push(new URL(`${proto}://${host}`).origin);
    } catch {
      // A malformed header adds nothing.
    }
  }

  return [...new Set(origins)];
};

/**
 * Checks that a request comes from the app's own pages: it carries the request header, the browser
 * does not report it as cross-site, and a state-changing request's `Origin` is allowed.
 *
 * @returns Why the request is refused, or `undefined` when it is accepted.
 */
export const checkBffRequest = (request: Request, allowedOrigins?: string[]): string | undefined => {
  if (request.headers.get(BffConstants.REQUEST_HEADER) !== BffConstants.REQUEST_HEADER_VALUE) {
    return `Missing the ${BffConstants.REQUEST_HEADER}: ${BffConstants.REQUEST_HEADER_VALUE} header.`;
  }

  // Sent by every current browser and cannot be set by a page. `none` is a request the user started.
  const fetchSite: string | null = request.headers.get('sec-fetch-site');

  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    return `A ${fetchSite} request is not accepted.`;
  }

  const origin: string | null = request.headers.get('origin');

  if (!SAFE_METHODS.includes(request.method) && origin && allowedOrigins && !allowedOrigins.includes(origin)) {
    return `Requests from ${origin} are not accepted.`;
  }

  return undefined;
};

const readOuId = async (request: Request, url: URL): Promise<string | undefined> => {
  const fromQuery: string | null = url.searchParams.get('ouId');

  if (fromQuery) {
    return fromQuery;
  }

  try {
    const body: {ouId?: unknown} = (await request.clone().json()) as {ouId?: unknown};

    return typeof body?.ouId === 'string' ? body.ouId : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Sends a request on to the API and the API's answer back, passing only the headers the contract
 * allows each way. A redirect from the API is passed back, never followed.
 */
export const forwardToApi = async (request: Request, target: string, accessToken?: string): Promise<Response> => {
  const headers = new Headers();

  BffConstants.PROXY_REQUEST_HEADERS.forEach((name: string) => {
    const value: string | null = request.headers.get(name);

    if (value) {
      headers.set(name, value);
    }
  });

  if (accessToken) {
    headers.set('authorization', `Bearer ${accessToken}`);
  }

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  let upstream: Response;

  try {
    upstream = await fetch(target, {
      body: hasBody ? await request.arrayBuffer() : undefined,
      headers,
      method: request.method,
      redirect: 'manual',
    });
  } catch {
    return bffJson({error: Errors.BAD_GATEWAY}, 502);
  }

  const response = new Response(upstream.body, {status: upstream.status});

  BffConstants.PROXY_RESPONSE_HEADERS.forEach((name: string) => {
    const value: string | null = upstream.headers.get(name);

    if (value) {
      response.headers.set(name, value);
    }
  });
  response.headers.set('cache-control', 'no-store');

  return response;
};

/**
 * Resolves `<apiBaseUrl>/<path>`, or `undefined` when the path would leave the API, such as with
 * `..` or an encoded slash.
 */
const resolveProxyTarget = (apiBaseUrl: string, pathAndQuery: string): string | undefined => {
  const base: string = apiBaseUrl.replace(/\/+$/, '');
  let target: URL;

  try {
    target = new URL(`${base}${pathAndQuery}`);
  } catch {
    return undefined;
  }

  const within: boolean =
    target.href === base || target.href.startsWith(`${base}/`) || target.href.startsWith(`${base}?`);

  return within && !/%2f|%5c/i.test(pathAndQuery) ? target.href : undefined;
};

/**
 * Routes one request to the contract endpoint it names.
 */
const dispatch = async (request: Request, adapter: BffAdapter, options: BffOptions): Promise<Response | undefined> => {
  const url = new URL(request.url);
  const prefix: string = (options.prefix ?? BffConstants.DEFAULT_PREFIX).replace(/\/+$/, '');

  if (url.pathname !== prefix && !url.pathname.startsWith(`${prefix}/`)) {
    return undefined;
  }

  const path: string = url.pathname.slice(prefix.length) || '/';
  const isProxy: boolean = path === Endpoints.PROXY || path.startsWith(`${Endpoints.PROXY}/`);
  const proxyPath: string = isProxy ? path.slice(Endpoints.PROXY.length) || '/' : '';
  const route = `${request.method} ${path}`;

  // Navigations and server-to-server calls, which cannot carry the request header.
  if (route === `GET ${Endpoints.SIGN_IN}`) {
    return adapter.signIn(request, {
      ouId: url.searchParams.get('ouId') ?? undefined,
      returnTo: toSafeReturnTo(url.searchParams.get('returnTo')),
    });
  }
  if (route === `GET ${Endpoints.CALLBACK}`) {
    return adapter.callback(request);
  }
  if (route === `POST ${Endpoints.BACKCHANNEL_LOGOUT}` && adapter.backchannelLogout) {
    return adapter.backchannelLogout(request);
  }
  if (
    isProxy &&
    options.apiBaseUrl &&
    request.method === 'GET' &&
    (BffConstants.PUBLIC_PROXY_PATHS as readonly string[]).includes(proxyPath)
  ) {
    const target: string | undefined = resolveProxyTarget(options.apiBaseUrl, `${proxyPath}${url.search}`);

    return target ? forwardToApi(request, target) : bffJson({error: Errors.INVALID_PATH}, 400);
  }

  // Everything else is a call from the browser SDK.
  const refusal: string | undefined = checkBffRequest(request, options.allowedOrigins);

  if (refusal) {
    return bffJson({error: Errors.FORBIDDEN, message: refusal}, 403);
  }

  if (isProxy && options.apiBaseUrl) {
    const session: BffSession | null = await adapter.getSession(request);

    if (!session) {
      return bffJson({error: Errors.LOGIN_REQUIRED}, 401);
    }

    const target: string | undefined = resolveProxyTarget(options.apiBaseUrl, `${proxyPath}${url.search}`);

    // A 401 from the API passes through unchanged: only the BFF's own `login_required` ends the session.
    return target ? forwardToApi(request, target, session.accessToken) : bffJson({error: Errors.INVALID_PATH}, 400);
  }

  switch (route) {
    case `GET ${Endpoints.SESSION}`: {
      const session: BffSession | null = await adapter.getSession(request);

      return bffJson(session ? toBrowserSession(session) : {isSignedIn: false});
    }
    case `GET ${Endpoints.CHECK_SESSION}`:
      return bffJson({isSignedIn: await adapter.isSessionLive(request)});
    case `POST ${Endpoints.REFRESH}`:
      return (await adapter.refresh(request)) ? bffJson(undefined, 204) : bffJson({error: Errors.LOGIN_REQUIRED}, 401);
    case `POST ${Endpoints.SIGN_OUT}`:
      return bffJson(await adapter.signOut(request));
    case `POST ${Endpoints.SWITCH}`: {
      if (!adapter.switchOrganizationUnit) {
        break;
      }

      const ouId: string | undefined = await readOuId(request, url);

      if (!ouId?.trim()) {
        return bffJson({error: Errors.INVALID_REQUEST}, 400);
      }

      const result: BffSwitchResult = await adapter.switchOrganizationUnit(request, ouId);

      return 'ok' in result ? bffJson({}) : bffJson({error: result.error}, result.status ?? 400);
    }
    case `POST ${Endpoints.TOKEN}`: {
      if (!options.exposeAccessToken) {
        break;
      }

      const session: BffSession | null = await adapter.getSession(request);

      if (!session) {
        return bffJson({error: Errors.LOGIN_REQUIRED}, 401);
      }

      // Without the refresh token, which never leaves the BFF.
      return bffJson({
        access_token: session.accessToken,
        expires_in: Math.max(0, session.expiresAt - Math.floor(Date.now() / 1000)),
        scope: session.scope,
        token_type: 'Bearer',
      });
    }
    default:
      break;
  }

  return bffJson({error: Errors.NOT_FOUND}, 404);
};

/**
 * Serves the BFF contract for one request: sign-in, the session, refresh, sign-out, organization unit
 * switch, back-channel logout and the API proxy, under `options.prefix`.
 *
 * Every response is `Cache-Control: no-store`, no response carries a token unless `exposeAccessToken`
 * is set, and every call the browser SDK makes must pass {@link checkBffRequest}. Only the redirects the
 * browser navigates to (`signin`, `callback`), the back-channel logout from the authorization server and
 * the public proxy paths are exempt from it. A failure in the adapter is answered with `500` and no
 * detail.
 *
 * @param request - The request.
 * @param adapter - The framework SDK's sign-in and session operations.
 * @param options - The prefix, the API to proxy to, and the allowed origins.
 * @returns The response, or `undefined` when the request is not under the prefix, so the framework can
 *   pass it on.
 */
const handleBffRequest = async (
  request: Request,
  adapter: BffAdapter,
  options: BffOptions = {},
): Promise<Response | undefined> => {
  try {
    return await dispatch(request, adapter, options);
  } catch {
    return bffJson({error: Errors.SERVER_ERROR}, 500);
  }
};

export default handleBffRequest;
