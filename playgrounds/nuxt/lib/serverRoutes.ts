// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

export type RouteGroup = 'Module routes' | 'Playground server routes' | 'Protected pages';

export interface RouteSpec {
  body?: string;
  contentType?: string;
  description: string;
  /** Sending it as the signed-in user ends the session. */
  destructive?: boolean;
  group: RouteGroup;
  /** Where the handler lives. */
  handler: string;
  id: string;
  /** Whether the route needs a session. */
  locked: boolean;
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
  /** File of the handler, for the routes of this playground; the Server page shows its source. */
  sourceFile?: string;
  summary: string;
}

const MODULE = '@thunderid/nuxt';

const moduleRoute = (route: Omit<RouteSpec, 'group' | 'handler'> & {file: string}): RouteSpec => {
  const {file, ...rest} = route;

  return {...rest, group: 'Module routes', handler: `${MODULE} · runtime/server/routes/auth/${file}`};
};

export const buildRoutes = (applicationId: string | undefined, groupsUrl: string): RouteSpec[] => [
  moduleRoute({
    description:
      'Verifies the session cookie and returns {isSignedIn, user, isLoading}. The client calls it to refresh auth state after an app-native sign-in.',
    file: 'session/session.get.ts',
    id: 'session',
    locked: false,
    method: 'GET',
    path: '/api/auth/session',
    summary: 'Auth state.',
  }),
  moduleRoute({
    description:
      'Returns {accessToken} for the session, refreshed first when it expires within 60 seconds and a refresh token is held. Backs useThunderID().getAccessToken(). Answers 401 without a session.',
    file: 'session/token.get.ts',
    id: 'token',
    locked: true,
    method: 'GET',
    path: '/api/auth/token',
    summary: 'Access token.',
  }),
  moduleRoute({
    description: 'Returns the signed-in user from the ID token and user info. Answers 401 without a session.',
    file: 'user/user.get.ts',
    id: 'user',
    locked: true,
    method: 'GET',
    path: '/api/auth/user',
    summary: 'Current user.',
  }),
  moduleRoute({
    description:
      'Returns the SCIM profile, its flattened form and the attribute schema. Backs useUser().revalidateProfile(); PATCH on the same path updates it.',
    file: 'user/profile.get.ts',
    id: 'profile',
    locked: true,
    method: 'GET',
    path: '/api/auth/user/profile',
    summary: 'User profile.',
  }),
  moduleRoute({
    description:
      'Flow metadata (design and i18n bundle) fetched on the server, so the browser never calls ThunderID directly. Accepts ?language=.',
    file: 'session/meta.get.ts',
    id: 'meta',
    locked: false,
    method: 'GET',
    path: '/api/auth/meta',
    summary: 'Flow metadata.',
  }),
  moduleRoute({
    description:
      'Redirect sign-in: sets a temporary session cookie and redirects to the ThunderID authorize endpoint. fetch() cannot read a cross-origin redirect, so the response shows as an opaque redirect.',
    file: 'session/signin.get.ts',
    id: 'signin-get',
    locked: false,
    method: 'GET',
    path: '/api/auth/signin',
    summary: 'Start redirect sign-in.',
  }),
  moduleRoute({
    body: JSON.stringify(
      {payload: {applicationId: applicationId ?? '<application id>', flowType: 'AUTHENTICATION'}, request: {}},
      null,
      2,
    ),
    contentType: 'application/json',
    description:
      'Drives the app-native sign-in flow one step at a time with the Flow Secret held on the server. On completion it sets the session cookie.',
    file: 'session/signin.post.ts',
    id: 'signin-post',
    locked: false,
    method: 'POST',
    path: '/api/auth/signin',
    summary: 'App-native sign-in step.',
  }),
  moduleRoute({
    body: JSON.stringify(
      {payload: {applicationId: applicationId ?? '<application id>', flowType: 'REGISTRATION'}},
      null,
      2,
    ),
    contentType: 'application/json',
    description: 'Drives the app-native sign-up flow one step at a time.',
    file: 'session/signup.post.ts',
    id: 'signup',
    locked: false,
    method: 'POST',
    path: '/api/auth/signup',
    summary: 'App-native sign-up step.',
  }),
  moduleRoute({
    description:
      'Clears the session cookie and returns {redirectUrl}, the ThunderID end-session URL. Sending it as your session signs you out of the playground.',
    destructive: true,
    file: 'session/signout.post.ts',
    id: 'signout',
    locked: false,
    method: 'POST',
    path: '/api/auth/signout',
    summary: 'Sign out.',
  }),
  moduleRoute({
    description:
      'One page of the user directory for UserSelect, loaded with the session. On with resourcePickers.users.',
    file: 'user/users.get.ts',
    id: 'users',
    locked: true,
    method: 'GET',
    path: '/api/auth/users',
    summary: 'User picker options.',
  }),
  moduleRoute({
    description: 'One page of authentication flows for AuthFlowSelect. On with resourcePickers.authFlows.',
    file: 'select/auth-flows.get.ts',
    id: 'auth-flows',
    locked: true,
    method: 'GET',
    path: '/api/auth/auth-flows',
    summary: 'Flow picker options.',
  }),
  moduleRoute({
    description: 'One page of user types for UserTypeSelect. On with resourcePickers.userTypes.',
    file: 'select/user-types.get.ts',
    id: 'user-types',
    locked: true,
    method: 'GET',
    path: '/api/auth/user-types',
    summary: 'User type picker options.',
  }),
  moduleRoute({
    body: JSON.stringify({method: 'GET', url: `${groupsUrl}?limit=5`}, null, 2),
    contentType: 'application/json',
    description:
      "The http.fetcher of the management composables and admin components. Performs one management request with the session's access token, only to a configured management collection (users, user types, groups, roles, agents, agent types, honoring endpoints overrides). Always 200 with {body, status, statusText}: a foreign URL reports 400, no session 401. On with management.",
    file: 'management.post.ts',
    id: 'management',
    locked: true,
    method: 'POST',
    path: '/api/auth/management',
    summary: 'Management relay.',
  }),
  moduleRoute({
    body: 'logout_token=not-a-real-token',
    contentType: 'application/x-www-form-urlencoded',
    description:
      'ThunderID posts a signed logout_token here when a session ends elsewhere. The handler verifies it and ends the matching sessions; an invalid token gets 400. On with backchannelLogout.enabled.',
    file: 'session/backchannel-logout.post.ts',
    id: 'backchannel',
    locked: false,
    method: 'POST',
    path: '/api/auth/backchannel-logout',
    summary: 'Back-channel logout.',
  }),
  {
    description: 'Reads the session cookie with useServerSession() and returns its expiry, scopes and decoded claims.',
    group: 'Playground server routes',
    handler: 'server/api/playground/session.get.ts',
    id: 'pg-session',
    locked: false,
    method: 'GET',
    path: '/api/playground/session',
    sourceFile: 'server/api/playground/session.get.ts',
    summary: 'useServerSession().',
  },
  {
    description: 'A protected API route: requireServerSession() answers 401 without a session.',
    group: 'Playground server routes',
    handler: 'server/api/playground/protected.get.ts',
    id: 'pg-protected',
    locked: true,
    method: 'GET',
    path: '/api/playground/protected',
    sourceFile: 'server/api/playground/protected.get.ts',
    summary: 'requireServerSession().',
  },
  {
    description: 'Gets an access token with getValidAccessToken(), which refreshes it when it is about to expire.',
    group: 'Playground server routes',
    handler: 'server/api/playground/token.get.ts',
    id: 'pg-token',
    locked: true,
    method: 'GET',
    path: '/api/playground/token',
    sourceFile: 'server/api/playground/token.get.ts',
    summary: 'getValidAccessToken().',
  },
  {
    description: 'Probes the ThunderID liveness endpoint from the Nuxt server.',
    group: 'Playground server routes',
    handler: 'server/api/playground/health.get.ts',
    id: 'pg-health',
    locked: false,
    method: 'GET',
    path: '/api/playground/health',
    sourceFile: 'server/api/playground/health.get.ts',
    summary: 'ThunderID reachability.',
  },
  {
    description:
      'The named auth middleware runs during the server render: without a session the response is a redirect to /api/auth/signin?returnTo=/protected.',
    group: 'Protected pages',
    handler: 'pages/protected/index.vue',
    id: 'page-auth',
    locked: true,
    method: 'GET',
    path: '/protected',
    sourceFile: 'pages/protected/index.vue',
    summary: "middleware: ['auth'].",
  },
  {
    description:
      'A route middleware from defineThunderIDMiddleware({requireScopes}). It redirects unless every scope is present.',
    group: 'Protected pages',
    handler: 'pages/protected/scopes.vue',
    id: 'page-scopes',
    locked: true,
    method: 'GET',
    path: '/protected/scopes',
    sourceFile: 'pages/protected/scopes.vue',
    summary: 'requireScopes.',
  },
];

export const SERVER_MIDDLEWARE_FILE = 'server/middleware/playground.ts';

/** Loads handler source through `GET /api/playground/source`. */
export const loadSource = async (file: string): Promise<string> => {
  try {
    return await $fetch<string>('/api/playground/source', {query: {file}, responseType: 'text'});
  } catch {
    return '';
  }
};
