// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  addGroupMembers,
  addRoleAssignments,
  ApiFetcher,
  createGroup,
  createRole,
  deleteGroup,
  deleteRole,
  EmbeddedFlowType,
  getAgentGroups,
  getAgentRoles,
  getAgents,
  getAgentTypes,
  getGroupMembers,
  getGroups,
  getRole,
  getRoleAssignments,
  getRoles,
  getTokenPermissions,
  getUserGroups,
  getUserTypes,
  hasPermission,
  ManagementRequestConfig,
  removeGroupMembers,
  removeRoleAssignments,
  resolveResourceEndpoint,
  updateGroup,
  updateRole,
} from '@thunderid/browser';
import type {
  GrantedPermissions,
  I18nContextValue,
  ThemeContextValue,
  ThunderIDContextProps as ReactContextProps,
  UserContextProps,
} from '@thunderid/react';
import {readConfig, readServerSession} from '../app/actions';
import {COMPONENTS, STORY_COUNT} from '../explorer/stories';
import {describeError, track} from '../lib/events';
import {checkServerHealth} from '../lib/health';
import {formatDuration} from '../lib/jwt';
import {defaultCollectionUrl, MANAGEMENT_KEYS, ManagementKey, NEW_ENDPOINT_KEYS} from '../lib/management';
import {asText, NextSdk, sdkSignIn, sdkSignOut, sdkSignUp, toUser} from '../lib/sdk';
import type {ServerSession} from '../lib/serverSession';
import {getDisplayName} from '../lib/user';

export type CapabilityStatus = 'idle' | 'running' | 'pass' | 'fail' | 'skip' | 'unavailable';

export interface CapabilityResult {
  note: string;
  status: Exclude<CapabilityStatus, 'idle' | 'running'>;
}

export interface CapabilityContext {
  /** `useGrantedPermissions()` from @thunderid/nextjs: the list comes from a server action. */
  granted: GrantedPermissions;
  i18n: I18nContextValue;
  /** `useGrantedPermissions()` from @thunderid/react, which reads the token in the browser. */
  reactGranted: GrantedPermissions;
  /** The @thunderid/react context that @thunderid/nextjs bridges for the components it reuses. */
  reactSdk: ReactContextProps;
  sdk: NextSdk;
  theme: ThemeContextValue;
  user: UserContextProps;
}

export interface RunOptions {
  /** True when the check was started from its own Run button, so it may navigate away. */
  interactive: boolean;
}

export interface Capability {
  api: string;
  id: string;
  name: string;
  run: (getContext: () => CapabilityContext, options: RunOptions) => Promise<CapabilityResult> | CapabilityResult;
  section: string;
}

const pass = (note: string): CapabilityResult => ({note, status: 'pass'});
const fail = (note: string): CapabilityResult => ({note, status: 'fail'});
const skip = (note: string): CapabilityResult => ({note, status: 'skip'});
const unavailable = (note: string): CapabilityResult => ({note, status: 'unavailable'});

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve: () => void) => {
    setTimeout(resolve, ms);
  });

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_resolve: (value: T) => void, reject: (reason: Error) => void) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    }),
  ]);

/**
 * Polls the latest context until the predicate holds or the timeout elapses.
 */
const waitFor = async (
  getContext: () => CapabilityContext,
  predicate: (context: CapabilityContext) => boolean,
  ms: number,
): Promise<boolean> => {
  const deadline: number = Date.now() + ms;

  while (Date.now() < deadline) {
    if (predicate(getContext())) return true;
    await sleep(150);
  }

  return predicate(getContext());
};

const requireSignedIn = (context: CapabilityContext): CapabilityResult | null =>
  context.sdk.isSignedIn ? null : skip('sign in first');

const flowSummary = (response: unknown): string => {
  const flow: Record<string, unknown> = (response ?? {}) as Record<string, unknown>;
  const data: Record<string, unknown> = (flow['data'] ?? {}) as Record<string, unknown>;
  const components: unknown[] = Array.isArray(data['components']) ? (data['components'] as unknown[]) : [];

  return `flowStatus=${asText(flow['flowStatus']) || 'unknown'}, ${components.length} components`;
};

const getJson = async (path: string, init: RequestInit = {}): Promise<{body: unknown; response: Response}> => {
  const response: Response = await fetch(path, {cache: 'no-store', ...init});
  const text: string = await response.text();
  let body: unknown = text;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Not JSON; keep the text.
  }

  return {body, response};
};

/**
 * The inputs a core management API function needs, resolved the way the SDK's hooks resolve them:
 * the `endpoints` override the Next.js provider received, or `baseUrl`, and the provider's
 * `http.fetcher`, which sends the request through the SDK's management server action.
 */
const managementConfig = (context: CapabilityContext, key: ManagementKey): ManagementRequestConfig => {
  const fetcher: ApiFetcher | undefined = context.reactSdk.http?.fetcher;

  if (!fetcher) throw new Error('the provider installed no http.fetcher: management requests would leave the browser');

  return {
    baseUrl: context.reactSdk.baseUrl ?? context.sdk.baseUrl,
    fetcher,
    url: resolveResourceEndpoint(key, {endpoints: context.reactSdk.endpoints}),
  };
};

/**
 * Turns a management failure into a reason. The server action answers with a status and a message
 * it built itself, so the status says what went wrong.
 */
const managementFailure = (error: unknown): CapabilityResult => {
  const status: unknown = (error as {statusCode?: unknown})?.statusCode;

  switch (status) {
    case 401:
      return fail('HTTP 401 from the management server action: no session, sign in first');
    case 403:
      return fail('HTTP 403: the access token lacks the permission for this collection');
    case 400:
      return fail('HTTP 400: the server action refused the URL (not a configured management collection)');
    case 502:
      return fail('HTTP 502: the Next.js server could not reach the management API');
    default:
      return fail(describeError(error));
  }
};

/** Runs a management check, mapping a rejected request onto a reason. */
const management = async (run: () => Promise<CapabilityResult>): Promise<CapabilityResult> => {
  try {
    return await run();
  } catch (error) {
    return managementFailure(error);
  }
};

const signedInSubject = async (): Promise<string | null> => {
  const session: ServerSession = await readServerSession();
  const sub: unknown = session.claims?.['sub'];

  return typeof sub === 'string' ? sub : null;
};

const profileOuId = (context: CapabilityContext): string | null => {
  const source: Record<string, unknown> = (context.user.flattenedProfile ?? context.user.profile ?? {}) as Record<
    string,
    unknown
  >;

  return typeof source['ouId'] === 'string' ? source['ouId'] : null;
};

interface CapturedRequest {
  hasAuthorization: boolean;
  isServerAction: boolean;
  method: string;
  url: URL;
}

/**
 * Records every `fetch` the page makes while `run` is pending, so a check can tell a request the
 * browser sent to ThunderID from a Next.js server action call (a POST carrying `Next-Action`).
 */
const captureFetches = async <T>(
  run: () => Promise<T>,
): Promise<{captured: CapturedRequest[]; error: unknown; value: T | undefined}> => {
  const original: typeof fetch = window.fetch;
  const captured: CapturedRequest[] = [];

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const raw: string = input instanceof Request ? input.url : String(input);
    const headers: Headers = new Headers(input instanceof Request ? input.headers : init?.headers);

    captured.push({
      hasAuthorization: headers.has('authorization'),
      isServerAction: headers.has('next-action'),
      method: (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase(),
      url: new URL(raw, window.location.href),
    });

    return original(input, init);
  };

  try {
    return {captured, error: null, value: await run()};
  } catch (error) {
    return {captured, error, value: undefined};
  } finally {
    window.fetch = original;
  }
};

const temporaryName = (kind: string): string => `playground-${kind}-${Date.now().toString(36)}`;

export const CAPABILITIES: Capability[] = [
  {
    api: 'server action · GET /health/liveness',
    id: 'server',
    name: 'Server reachable',
    run: async () => {
      const health = await checkServerHealth();

      return health.state === 'up'
        ? pass('ThunderID is healthy (probed from the Next.js server)')
        : fail(health.detail);
    },
    section: 'Setup',
  },
  {
    api: '<ThunderIDProvider /> · NEXT_PUBLIC_THUNDERID_*',
    id: 'config',
    name: 'Provider configuration',
    run: async (getContext: () => CapabilityContext) => {
      const config = await readConfig();
      const {sdk} = getContext();

      if (!config.clientId && !config.applicationId) {
        return fail('set NEXT_PUBLIC_THUNDERID_CLIENT_ID or NEXT_PUBLIC_THUNDERID_APPLICATION_ID in .env');
      }
      if (!sdk.baseUrl) return fail('the client context has no baseUrl');

      const missing: string[] = [
        config.clientId && !config.clientSecretSet ? 'THUNDERID_CLIENT_SECRET' : '',
        config.sessionSecretSet ? '' : 'THUNDERID_SECRET',
      ].filter(Boolean);

      return pass(
        `${config.clientId ? `clientId ${config.clientId}` : `applicationId ${config.applicationId}`}${
          missing.length ? `; ${missing.join(', ')} not set` : ''
        }`,
      );
    },
    section: 'Setup',
  },
  {
    api: 'useThunderID().isLoading',
    id: 'init',
    name: 'Provider ready',
    run: async (getContext: () => CapabilityContext) =>
      (await waitFor(getContext, (context: CapabilityContext) => !context.sdk.isLoading, 8000))
        ? pass('session resolved on the server, client context hydrated')
        : fail('isLoading stayed true for 8s'),
    section: 'Setup',
  },
  {
    api: 'ThunderIDProvider · getFlowMeta()',
    id: 'meta',
    name: 'Flow metadata',
    run: (getContext: () => CapabilityContext) =>
      getContext().reactSdk.meta
        ? pass('GET /flow/meta resolved on the server and seeded the client')
        : fail(
            getContext().sdk.baseUrl
              ? 'meta is null: /flow/meta failed on the server or needs an application ID'
              : 'meta is null: NEXT_PUBLIC_THUNDERID_BASE_URL is not set',
          ),
    section: 'Setup',
  },
  {
    api: '<SignInButton /> · signIn()',
    id: 'redirect',
    name: 'Sign in (redirect)',
    run: async (getContext: () => CapabilityContext, {interactive}: RunOptions) => {
      const {sdk} = getContext();

      if (sdk.isSignedIn) return pass(`signed in as ${getDisplayName(toUser(sdk.user))}`);
      if (!interactive) return skip('interactive: press Run to redirect to ThunderID');

      await track('signIn', () => sdkSignIn(sdk));

      return skip('redirecting to ThunderID');
    },
    section: 'Authentication',
  },
  {
    api: '<SignIn /> · signIn({applicationId, flowType})',
    id: 'native',
    name: 'Sign in (app-native flow)',
    run: async (getContext: () => CapabilityContext) => {
      const {sdk} = getContext();

      if (!sdk.applicationId) return fail('NEXT_PUBLIC_THUNDERID_APPLICATION_ID is not set');

      const response: unknown = await track(
        'signIn:embedded',
        () =>
          withTimeout(
            sdkSignIn(sdk, {applicationId: sdk.applicationId, flowType: EmbeddedFlowType.Authentication}, {}),
            10000,
            'flow initiation',
          ),
        flowSummary,
      );

      return pass(`flow started through a server action: ${flowSummary(response)}`);
    },
    section: 'Authentication',
  },
  {
    api: '<SignUp /> · signUp({applicationId, flowType})',
    id: 'signup',
    name: 'Sign up (app-native flow)',
    run: async (getContext: () => CapabilityContext) => {
      const {sdk} = getContext();

      if (!sdk.applicationId) return fail('NEXT_PUBLIC_THUNDERID_APPLICATION_ID is not set');

      const response: unknown = await track(
        'signUp:embedded',
        () =>
          withTimeout(
            sdkSignUp(sdk, {applicationId: sdk.applicationId, flowType: EmbeddedFlowType.Registration}, {}),
            10000,
            'flow initiation',
          ),
        flowSummary,
      );

      return pass(`flow started through a server action: ${flowSummary(response)}`);
    },
    section: 'Authentication',
  },
  {
    api: 'useThunderID().isSignedIn after reload',
    id: 'restore',
    name: 'Session restore',
    run: async (getContext: () => CapabilityContext) => {
      await waitFor(getContext, (context: CapabilityContext) => !context.sdk.isLoading, 8000);

      return getContext().sdk.isSignedIn
        ? pass('session cookie verified by the server render')
        : skip('no session: sign in, then reload the page');
    },
    section: 'Authentication',
  },
  {
    api: '<SignOutButton /> · signOut()',
    id: 'signout',
    name: 'Sign out',
    run: async (getContext: () => CapabilityContext, {interactive}: RunOptions) => {
      const {sdk} = getContext();

      if (!sdk.isSignedIn) return skip('not signed in');
      if (!interactive) return skip('interactive: press Run to sign out');

      await track('signOut', () => sdkSignOut(sdk));

      return pass('signOut() resolved');
    },
    section: 'Authentication',
  },
  {
    api: 'thunderIDProxy() · middleware.ts',
    id: 'proxy',
    name: 'Proxy (middleware)',
    run: async (getContext: () => CapabilityContext) => {
      const {body, response} = await track(
        'GET /api/proxy-trace',
        () => getJson('/api/proxy-trace'),
        ({response: value}: {response: Response}) => `HTTP ${value.status}`,
      );
      const trace: Record<string, unknown> = (body ?? {}) as Record<string, unknown>;

      if (!response.ok || trace['handledBy'] !== 'thunderIDProxy') {
        return fail(`HTTP ${response.status}: the proxy did not answer; is src/middleware.ts running?`);
      }

      const proxySignedIn = trace['isSignedIn'] === true;
      const clientSignedIn = !!getContext().sdk.isSignedIn;

      if (proxySignedIn !== clientSignedIn) {
        return fail(`proxy says isSignedIn=${proxySignedIn}, client context says ${clientSignedIn}`);
      }

      return pass(`ran on the request, isSignedIn()=${proxySignedIn}`);
    },
    section: 'Server',
  },
  {
    api: 'createRouteMatcher() · protectRoute()',
    id: 'protect',
    name: 'Route protection',
    run: async (getContext: () => CapabilityContext) => {
      const anonymous: Response = await track(
        'GET /protected (anonymous)',
        () => fetch('/protected', {cache: 'no-store', credentials: 'omit', redirect: 'manual'}),
        (value: Response) => (value.type === 'opaqueredirect' ? 'redirected' : `HTTP ${value.status}`),
      );

      if (anonymous.type !== 'opaqueredirect') {
        return fail(`anonymous request was not redirected (HTTP ${anonymous.status})`);
      }
      if (!getContext().sdk.isSignedIn) return pass('anonymous request redirected; sign in to test the allowed path');

      const signedIn: Response = await track(
        'GET /protected (session)',
        () => fetch('/protected', {cache: 'no-store', redirect: 'manual'}),
        (value: Response) => `HTTP ${value.status}`,
      );

      return signedIn.ok
        ? pass('anonymous request redirected, signed-in request allowed')
        : fail(`signed-in request got HTTP ${signedIn.status || 'redirect'}`);
    },
    section: 'Server',
  },
  {
    api: "createRouteMatcher(['/protected(.*)'])",
    id: 'routeMatcher',
    name: 'Route matcher patterns',
    run: async () => {
      const {body} = await getJson('/api/proxy-trace');
      const matcher: Record<string, unknown> =
        ((body ?? {}) as Record<string, Record<string, unknown>>)['routeMatcher'] ?? {};
      const results: Record<string, boolean> = (matcher['results'] ?? {}) as Record<string, boolean>;
      const missed: string[] = Object.keys(results).filter((pathname: string) => !results[pathname]);

      if (!Object.keys(results).length) return fail('the proxy trace has no route matcher results');
      if (missed.length) {
        return fail(`the documented pattern ${asText(matcher['pattern'])} does not match ${missed.join(', ')}`);
      }

      return pass(`${asText(matcher['pattern'])} matches ${Object.keys(results).join(', ')}`);
    },
    section: 'Server',
  },
  {
    api: 'thunderid().getSessionId() in a route handler',
    id: 'routeHandler',
    name: 'Route handler session',
    run: async (getContext: () => CapabilityContext) => {
      const {body, response} = await track(
        'GET /api/session',
        () => getJson('/api/session'),
        ({response: value}: {response: Response}) => `HTTP ${value.status}`,
      );
      const session: Record<string, unknown> = (body ?? {}) as Record<string, unknown>;

      if (!response.ok) return fail(`HTTP ${response.status}`);
      if (session['signedIn'] !== !!getContext().sdk.isSignedIn) {
        return fail(`route handler says signedIn=${String(session['signedIn'])}: ${asText(session['error'])}`);
      }

      return session['signedIn'] ? pass(`session ${asText(session['sessionId'])}`) : pass('no session, as expected');
    },
    section: 'Server',
  },
  {
    api: 'thunderid().getAccessToken() in a server action',
    id: 'serverAction',
    name: 'Server action access token',
    run: async (getContext: () => CapabilityContext) => {
      const gate: CapabilityResult | null = requireSignedIn(getContext());

      if (gate) return gate;

      const session: ServerSession = await track('readServerSession', () => readServerSession());

      if (!session.accessToken) return fail(session.error ?? 'no access token in the session cookie');

      const exp: unknown = session.claims?.['exp'];

      return pass(
        typeof exp === 'number'
          ? `JWT, expires in ${formatDuration(exp * 1000 - Date.now())}`
          : `opaque token, ${session.accessToken.length} chars`,
      );
    },
    section: 'Server',
  },
  {
    api: 'useThunderID().refreshToken()',
    id: 'refresh',
    name: 'Token refresh',
    run: async (getContext: () => CapabilityContext) => {
      const {sdk} = getContext();
      const gate: CapabilityResult | null = requireSignedIn(getContext());

      if (gate) return gate;
      if (!sdk.refreshToken) return unavailable('refreshToken is not on the context');

      const result: {expiresAt: number} = await track(
        'refreshToken',
        () => sdk.refreshToken!(),
        (value: {expiresAt: number}) => `expiresAt ${value.expiresAt}`,
      );

      return pass(`new access token, expires in ${formatDuration(result.expiresAt * 1000 - Date.now())}`);
    },
    section: 'Server',
  },
  {
    api: 'backchannelLogout() · POST',
    id: 'backchannel',
    name: 'Back-channel logout endpoint',
    run: async () => {
      const response: Response = await track(
        'POST /api/auth/backchannel-logout',
        () =>
          fetch('/api/auth/backchannel-logout', {
            body: '',
            cache: 'no-store',
            headers: {'content-type': 'application/x-www-form-urlencoded'},
            method: 'POST',
          }),
        (value: Response) => `HTTP ${value.status}`,
      );

      return response.status === 400
        ? pass('mounted; rejects a request without a logout_token (400)')
        : fail(`expected 400 for a missing logout_token, got ${response.status}`);
    },
    section: 'Server',
  },
  {
    api: 'thunderid().exchangeToken()',
    id: 'exchange',
    name: 'Token exchange',
    run: () => skip('needs a grant-specific config; call exchangeToken() from server code'),
    section: 'Server',
  },
  {
    api: 'useThunderID().user',
    id: 'user',
    name: 'User info',
    run: (getContext: () => CapabilityContext) => {
      const gate: CapabilityResult | null = requireSignedIn(getContext());

      if (gate) return gate;

      const user = toUser(getContext().sdk.user);

      return user && Object.keys(user).length
        ? pass(getDisplayName(user))
        : fail('user is empty while signed in: /users/me failed on the server');
    },
    section: 'User',
  },
  {
    api: 'useUser().profile',
    id: 'profile',
    name: 'User profile',
    run: (getContext: () => CapabilityContext) => {
      const gate: CapabilityResult | null = requireSignedIn(getContext());

      if (gate) return gate;

      const {profile, userSchema} = getContext().user;

      if (!profile || !Object.keys(profile).length) return fail('profile is empty: fetched on the server render');

      return pass(`${Object.keys(profile).length} fields, schema ${userSchema ? 'loaded' : 'missing'}`);
    },
    section: 'User',
  },
  {
    api: '<UserProfile /> · updateProfile()',
    id: 'updateProfile',
    name: 'Update profile',
    run: (getContext: () => CapabilityContext) => {
      const gate: CapabilityResult | null = requireSignedIn(getContext());

      if (gate) return gate;

      return skip('writes data: edit a field in Components > UserProfile');
    },
    section: 'User',
  },
  {
    api: 'useOrganization() · switchOrganization()',
    id: 'orgs',
    name: 'Organizations',
    run: () => unavailable('@thunderid/nextjs has no organization API'),
    section: 'User',
  },
  {
    api: 'endpoints.{groups, roles, agentTypes} · resolveResourceEndpoint()',
    id: 'mgmtEndpoints',
    name: 'Management endpoints',
    run: async (getContext: () => CapabilityContext) => {
      const config = await readConfig();
      const {reactSdk} = getContext();
      const received: Record<string, unknown> = (reactSdk.endpoints ?? {}) as Record<string, unknown>;
      // The server provider hands the browser only the management overrides it was configured with.
      const mismatched: string[] = MANAGEMENT_KEYS.filter(
        (key: ManagementKey) => (received[key] ?? undefined) !== config.endpointOverrides[key],
      );

      if (mismatched.length) {
        return fail(`the client context's endpoints differ from the server's for ${mismatched.join(', ')}`);
      }

      const leaked: string[] = Object.keys(received).filter(
        (key: string) => !MANAGEMENT_KEYS.includes(key as ManagementKey),
      );

      if (leaked.length) return fail(`non-management overrides reached the browser: ${leaked.join(', ')}`);

      // An explicit per-call URL wins over the override, and no override falls back to baseUrl.
      const explicit: string | undefined = resolveResourceEndpoint(
        'roles',
        {endpoints: {roles: 'https://api.example/roles'}},
        'https://call.example/roles',
      );

      if (explicit !== 'https://call.example/roles') return fail('an explicit URL did not win over the override');

      const resolved: string[] = NEW_ENDPOINT_KEYS.map((key: ManagementKey) => {
        const override: string | undefined = resolveResourceEndpoint(key, {endpoints: reactSdk.endpoints});

        return `${key} → ${override ?? defaultCollectionUrl(config.baseUrl, key)}${override ? ' (override)' : ''}`;
      });

      return pass(resolved.join(', '));
    },
    section: 'Management',
  },
  {
    api: 'ThunderIDProvider http.fetcher → managementRequestAction',
    id: 'mgmtRelay',
    name: 'Management via server action',
    run: async (getContext: () => CapabilityContext) => {
      const context: CapabilityContext = getContext();
      const config: ManagementRequestConfig = managementConfig(context, 'groups');
      const target: URL = new URL(config.url ?? defaultCollectionUrl(config.baseUrl ?? '', 'groups'));
      const {captured, error} = await track(
        'getGroups (relay)',
        () => captureFetches(() => getGroups({...config, limit: 1})),
        ({captured: requests}: {captured: CapturedRequest[]}) => `${requests.length} browser requests`,
      );
      const direct: CapturedRequest[] = captured.filter(
        (request: CapturedRequest) => request.url.origin === target.origin,
      );
      const actions: CapturedRequest[] = captured.filter(
        (request: CapturedRequest) => request.isServerAction && request.url.origin === window.location.origin,
      );

      if (direct.length) return fail(`the browser called ${target.origin} directly (${direct.length} requests)`);
      if (!actions.length) return fail('no server action request was observed for the management call');
      if (actions.some((request: CapturedRequest) => request.hasAuthorization)) {
        return fail('the server action request carried an Authorization header from the browser');
      }

      const status: unknown = (error as {statusCode?: unknown})?.statusCode;
      const outcome: string = error ? `HTTP ${asText(status) || 'error'}` : 'HTTP 200';

      return pass(
        `${actions.length} Next-Action POST to ${window.location.origin}, none to ${target.origin}, no token in the browser; ${outcome}`,
      );
    },
    section: 'Management',
  },
  {
    api: 'getGroups() · getGroupMembers()',
    id: 'groups',
    name: 'Groups',
    run: (getContext: () => CapabilityContext) =>
      management(async () => {
        const config: ManagementRequestConfig = managementConfig(getContext(), 'groups');
        const page = await track('getGroups', () => getGroups({...config, limit: 5}));
        const first = page.groups[0];

        if (!first) return pass(`${page.totalResults} groups`);

        const members = await track('getGroupMembers', () => getGroupMembers({...config, groupId: first.id, limit: 5}));

        return pass(`${page.totalResults} groups; "${first.name}" has ${members.totalResults} members`);
      }),
    section: 'Management',
  },
  {
    api: 'getRoles() · getRole() · getRoleAssignments()',
    id: 'roles',
    name: 'Roles',
    run: (getContext: () => CapabilityContext) =>
      management(async () => {
        const config: ManagementRequestConfig = managementConfig(getContext(), 'roles');
        const page = await track('getRoles', () => getRoles({...config, limit: 5}));
        const first = page.roles[0];

        if (!first) return pass(`${page.totalResults} roles`);

        const role = await track('getRole', () => getRole({...config, roleId: first.id}));
        const assignments = await track('getRoleAssignments', () =>
          getRoleAssignments({...config, limit: 5, roleId: first.id}),
        );
        const permissions: number = role.permissions.reduce(
          (total: number, entry: {permissions: string[]}) => total + entry.permissions.length,
          0,
        );

        return pass(
          `${page.totalResults} roles; "${role.name}" grants ${permissions} permissions, ${assignments.totalResults} assignments`,
        );
      }),
    section: 'Management',
  },
  {
    api: 'getAgentTypes()',
    id: 'agentTypes',
    name: 'Agent types',
    run: (getContext: () => CapabilityContext) =>
      management(async () => {
        const page = await track('getAgentTypes', () =>
          getAgentTypes({...managementConfig(getContext(), 'agentTypes'), limit: 10}),
        );

        return pass(
          `${page.totalResults} agent types${page.types.length ? `: ${page.types.map((type: {handle: string}) => type.handle).join(', ')}` : ''}`,
        );
      }),
    section: 'Management',
  },
  {
    api: 'getAgents() · getAgentGroups() · getAgentRoles()',
    id: 'agentMemberships',
    name: 'Agent groups and roles',
    run: (getContext: () => CapabilityContext) =>
      management(async () => {
        const config: ManagementRequestConfig = managementConfig(getContext(), 'agents');
        const page = await track('getAgents', () => getAgents({...config, limit: 1}));
        const agent = page.agents[0];

        if (!agent) return skip('no agents to read: create one in Components > AgentCreate');

        const groups = await track('getAgentGroups', () => getAgentGroups({...config, agentId: agent.id}));
        const roles = await track('getAgentRoles', () => getAgentRoles({...config, agentId: agent.id}));

        return pass(`"${agent.name}": ${groups.totalResults} groups, roles [${roles.roles.join(', ')}]`);
      }),
    section: 'Management',
  },
  {
    api: 'getUserGroups(sub)',
    id: 'userGroups',
    name: 'User groups',
    run: (getContext: () => CapabilityContext) =>
      management(async () => {
        const config: ManagementRequestConfig = managementConfig(getContext(), 'users');
        const userId: string | null = await signedInSubject();
        // Without a session there is no user to ask about; send the request anyway so the reason
        // comes from the server action.
        const groups = await track('getUserGroups', () => getUserGroups({...config, userId: userId ?? 'me'}));

        return pass(
          `${groups.totalResults} groups${groups.groups.length ? `: ${groups.groups.map((group: {name: string}) => group.name).join(', ')}` : ''}`,
        );
      }),
    section: 'Management',
  },
  {
    api: 'getUserTypes()',
    id: 'userTypes',
    name: 'User types',
    run: (getContext: () => CapabilityContext) =>
      management(async () => {
        const page = await track('getUserTypes', () =>
          getUserTypes({...managementConfig(getContext(), 'userTypes'), limit: 10}),
        );

        return pass(
          `${page.totalResults} user types${page.types.length ? `: ${page.types.map((type: {handle: string}) => type.handle).join(', ')}` : ''}`,
        );
      }),
    section: 'Management',
  },
  {
    api: 'createGroup() · updateGroup() · add/removeGroupMembers() · deleteGroup()',
    id: 'groupWrite',
    name: 'Group lifecycle',
    run: async (getContext: () => CapabilityContext, {interactive}: RunOptions) => {
      if (!interactive) return skip('writes data: press Run to create and delete a temporary group');

      return management(async () => {
        const context: CapabilityContext = getContext();
        const config: ManagementRequestConfig = managementConfig(context, 'groups');
        const ouId: string | null = profileOuId(context);
        const userId: string | null = await signedInSubject();

        if (!ouId || !userId) return fail('sign in first: the group needs your ouId and user id');

        const group = await track('createGroup', () =>
          createGroup({...config, payload: {name: temporaryName('group'), ouId}}),
        );

        try {
          await track('updateGroup', () =>
            updateGroup({...config, groupId: group.id, payload: {description: 'updated', name: group.name, ouId}}),
          );
          await track('addGroupMembers', () =>
            addGroupMembers({...config, groupId: group.id, members: [{id: userId, type: 'user'}]}),
          );
          await track('removeGroupMembers', () =>
            removeGroupMembers({...config, groupId: group.id, members: [{id: userId, type: 'user'}]}),
          );
        } finally {
          await track('deleteGroup', () => deleteGroup({...config, groupId: group.id}));
        }

        return pass(`created, renamed, added and removed you, and deleted ${group.name}`);
      });
    },
    section: 'Management',
  },
  {
    api: 'createRole() · updateRole() · add/removeRoleAssignments() · deleteRole()',
    id: 'roleWrite',
    name: 'Role lifecycle',
    run: async (getContext: () => CapabilityContext, {interactive}: RunOptions) => {
      if (!interactive) return skip('writes data: press Run to create and delete a temporary role');

      return management(async () => {
        const context: CapabilityContext = getContext();
        const config: ManagementRequestConfig = managementConfig(context, 'roles');
        const ouId: string | null = profileOuId(context);
        const userId: string | null = await signedInSubject();

        if (!ouId || !userId) return fail('sign in first: the role needs your ouId and user id');

        const role = await track('createRole', () =>
          createRole({...config, payload: {name: temporaryName('role'), ouId}}),
        );

        try {
          await track('updateRole', () =>
            updateRole({
              ...config,
              payload: {description: 'updated', name: role.name, ouId, permissions: []},
              roleId: role.id,
            }),
          );
          await track('addRoleAssignments', () =>
            addRoleAssignments({...config, assignments: [{id: userId, type: 'user'}], roleId: role.id}),
          );
          await track('removeRoleAssignments', () =>
            removeRoleAssignments({...config, assignments: [{id: userId, type: 'user'}], roleId: role.id}),
          );
        } finally {
          await track('deleteRole', () => deleteRole({...config, roleId: role.id}));
        }

        return pass(`created, updated, assigned and unassigned you, and deleted ${role.name}`);
      });
    },
    section: 'Management',
  },
  {
    api: 'useGrantedPermissions() · getGrantedPermissionsAction',
    id: 'grantedServer',
    name: 'Granted permissions (server)',
    run: async (getContext: () => CapabilityContext) => {
      if (!getContext().sdk.isSignedIn) {
        return fail('sign in first: without a session the server action returns no permissions');
      }

      await waitFor(getContext, (context: CapabilityContext) => !context.granted.isLoading, 8000);

      const {granted} = getContext();
      const session: ServerSession = await readServerSession();
      const fromToken: string[] = getTokenPermissions(session.accessToken ?? undefined);
      const same: boolean =
        fromToken.length === granted.permissions.length &&
        fromToken.every((permission: string) => granted.permissions.includes(permission));

      if (!same) {
        return fail(
          `hook has ${granted.permissions.length} permissions, the token's scope claim has ${fromToken.length}`,
        );
      }

      return pass(
        `${granted.permissions.length} permissions from the server action, same as the token's claim; can('system:group:view')=${granted.can('system:group:view')}`,
      );
    },
    section: 'Permissions',
  },
  {
    api: '@thunderid/react useGrantedPermissions() under Next.js',
    id: 'grantedClient',
    name: 'Granted permissions (client token)',
    run: async (getContext: () => CapabilityContext) => {
      if (!getContext().sdk.isSignedIn) return fail('sign in first: the hook returns [] without a session');

      await waitFor(getContext, (context: CapabilityContext) => !context.reactGranted.isLoading, 8000);

      const {reactGranted} = getContext();

      return reactGranted.permissions.length
        ? fail(`the browser read ${reactGranted.permissions.length} permissions from a token it should not hold`)
        : pass('[] as designed: the token stays on the server, so use the @thunderid/nextjs hook');
    },
    section: 'Permissions',
  },
  {
    api: 'hasPermission() · getTokenPermissions()',
    id: 'hasPermission',
    name: 'Permission helpers',
    run: () => {
      const payload: string = btoa(JSON.stringify({scope: 'system:user openid'}))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      const permissions: string[] = getTokenPermissions(`e30.${payload}.sig`);
      const cases: [string, boolean][] = [
        ['system:user', true],
        ['system:user:view', true],
        ['system:users', false],
        ['system:group:view', false],
        ['', true],
      ];
      const wrong: string[] = cases
        .filter(([required, expected]: [string, boolean]) => hasPermission(permissions, required) !== expected)
        .map(([required]: [string, boolean]) => required || "''");

      if (permissions.join(' ') !== 'system:user openid') {
        return fail(`getTokenPermissions read [${permissions.join(', ')}]`);
      }

      return wrong.length
        ? fail(`hasPermission() got ${wrong.join(', ')} wrong`)
        : pass(`[${permissions.join(', ')}] covers system:user:view, not system:users`);
    },
    section: 'Permissions',
  },
  {
    api: 'useI18n() · preferences.i18n',
    id: 'i18n',
    name: 'Translations',
    run: (getContext: () => CapabilityContext) => {
      const {i18n} = getContext();
      const key = 'elements.buttons.signin.text';
      const text: string = i18n.t(key);

      if (!text || text === key) return fail(`t('${key}') returned the key`);

      return pass(`${i18n.currentLanguage}: "${text}", ${Object.keys(i18n.bundles).length} bundles`);
    },
    section: 'UI',
  },
  {
    api: 'useTheme() · ThemeProvider',
    id: 'theme',
    name: 'Theming and dark mode',
    run: (getContext: () => CapabilityContext) => {
      const {theme} = getContext();
      const count: number = Object.keys(theme.theme.cssVariables ?? {}).length;

      if (!count) return fail('theme exposes no CSS variables');

      return pass(`${theme.colorScheme} scheme, ${count} CSS variables`);
    },
    section: 'UI',
  },
  {
    api: 'Component explorer',
    id: 'components',
    name: 'Components',
    run: () => pass(`${COMPONENTS.length} components · ${STORY_COUNT} stories`),
    section: 'UI',
  },
];

export const runCapability = async (
  capability: Capability,
  getContext: () => CapabilityContext,
  options: RunOptions,
): Promise<CapabilityResult> => {
  try {
    return await capability.run(getContext, options);
  } catch (error) {
    return fail(describeError(error));
  }
};
