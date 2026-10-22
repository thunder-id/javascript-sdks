// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  createHttpClientFetcher,
  EmbeddedFlowType,
  getUserTypes,
  ManagedUserTypeListResponse,
  resolveResourceEndpoint,
  ResourceEndpointKey,
  SessionData,
} from '@thunderid/browser';
import {
  AgentListResponse,
  AgentRoleListResponse,
  AgentTypeListResponse,
  ApiFetcher,
  createCallbackRoute,
  createThunderIDGuard,
  FlowMetaContextValue,
  getAgentGroups,
  getAgentRoles,
  getAgents,
  getAgentTypes,
  getGroup,
  getGroupMembers,
  getGroups,
  getRole,
  getRoleAssignments,
  getRoles,
  getTokenPermissions,
  getUserGroups,
  GrantedPermissions,
  Group,
  GroupListResponse,
  GroupMemberListResponse,
  hasPermission,
  I18nContextValue,
  ManagementEndpoint,
  ManagementEndpointKey,
  ManagementRequestConfig,
  MembershipGroupListResponse,
  NavigationGuardReturn,
  Role,
  RoleAssignmentListResponse,
  RoleListResponse,
  THUNDERID_KEY,
  ThemeContextValue,
  ThunderIDAPIError,
  ThunderIDContext,
  ThunderIDRouteRecord,
  useGrantedPermissions,
  useManagementEndpoint,
  UserContextValue,
} from '@thunderid/vue';
import {App, effectScope, EffectScope, inject} from 'vue';
import {COMPONENTS, STORY_COUNT} from './explorer/stories';
import playgroundConfig from '../config';
import {describeError, track} from '../lib/events';
import {checkServerHealth} from '../lib/health';
import {decodeJwt, formatDuration} from '../lib/jwt';
import {asText, toUser} from '../lib/sdk';
import {getDisplayName} from '../lib/user';

export type CapabilityStatus = 'idle' | 'running' | 'pass' | 'fail' | 'skip' | 'unavailable';

export interface CapabilityResult {
  note: string;
  status: Exclude<CapabilityStatus, 'idle' | 'running'>;
}

/**
 * Everything a check needs. The SDK contexts hold refs, so reading `.value` always sees the latest
 * state without re-reading the context.
 */
export interface CapabilityContext {
  app: App;
  flowMeta: FlowMetaContextValue;
  i18n: I18nContextValue;
  sdk: ThunderIDContext;
  theme: ThemeContextValue;
  user: UserContextValue;
}

export interface RunOptions {
  /** True when the check was started from its own Run button, so it may navigate away. */
  interactive: boolean;
}

export interface Capability {
  api: string;
  id: string;
  name: string;
  run: (context: CapabilityContext, options: RunOptions) => Promise<CapabilityResult> | CapabilityResult;
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
 * Polls until the predicate holds or the timeout elapses.
 */
const waitFor = async (predicate: () => boolean | Promise<boolean>, ms: number): Promise<boolean> => {
  const deadline: number = Date.now() + ms;

  while (Date.now() < deadline) {
    if (await predicate()) return true;
    await sleep(150);
  }

  return predicate();
};

/** What the guard passed to `next()`; `undefined` means navigation was allowed. */
interface GuardTarget {
  next: NavigationGuardReturn;
}

const requireSignedIn = ({sdk}: CapabilityContext): CapabilityResult | null =>
  sdk.isSignedIn.value ? null : skip('sign in first');

/**
 * Management APIs need the signed-in user's access token. Without a client ID nobody can sign in, so
 * those checks fail with that reason instead of skipping.
 */
const requireManagementSession = (context: CapabilityContext): CapabilityResult | null => {
  if (!context.sdk.clientId) {
    return fail('VITE_THUNDERID_CLIENT_ID is empty: management APIs need a signed-in user, set it in .env');
  }

  return requireSignedIn(context);
};

/**
 * The request config the management composables build: the provider's endpoint for the collection
 * and the SDK's authenticated transport (the provider's `http.fetcher`, else the access token client).
 */
const managementConfig = ({sdk}: CapabilityContext, key: ManagementEndpointKey): ManagementRequestConfig => ({
  baseUrl: sdk.baseUrl,
  fetcher: sdk.http.fetcher ?? createHttpClientFetcher(sdk.instanceId),
  url: resolveResourceEndpoint(key, {endpoints: sdk.endpoints}),
});

/**
 * Runs a management request and rewrites its error into a reason that says what to fix.
 */
const manage = async <T>(name: string, permission: string, call: () => Promise<T>): Promise<T> => {
  try {
    return await track(name, call);
  } catch (error) {
    if (!(error instanceof ThunderIDAPIError)) throw error;

    const status: number = error.statusCode ?? 0;

    if (status === 0) throw new Error(`${name}: network error, is the management endpoint reachable (CORS)?`);
    if (status === 401) throw new Error(`${name}: HTTP 401, the access token was rejected`);
    if (status === 403) throw new Error(`${name}: HTTP 403, the token lacks ${permission}; add it to the app's scopes`);
    if (status === 404) throw new Error(`${name}: HTTP 404, check the endpoint overrides in .env`);

    throw new Error(`${name}: HTTP ${status} ${error.message}`);
  }
};

/** A fetcher that records the URL and answers with an empty page, so requests never leave the browser. */
const recordingFetcher =
  (urls: string[]): ApiFetcher =>
  (url: string): Promise<Response> => {
    urls.push(url);

    return Promise.resolve(new Response('{}', {headers: {'Content-Type': 'application/json'}, status: 200}));
  };

/** Builds an unsigned JWT carrying the given payload, for the token permission parsers. */
const fakeJwt = (payload: Record<string, unknown>): string => {
  const encode = (value: unknown): string =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return `${encode({alg: 'none'})}.${encode(payload)}.`;
};

/**
 * Runs a composable the way a component would: inside the app's injection context, in an effect
 * scope the caller stops when done.
 */
const runComposable = <T>(app: App, composable: () => T): {scope: EffectScope; value: T} => {
  const scope: EffectScope = effectScope(true);
  const value: T = app.runWithContext(() => scope.run(composable)!);

  return {scope, value};
};

const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? '' : 's'}`;

const flowSummary = (response: unknown): string => {
  const flow: Record<string, unknown> = (response ?? {}) as Record<string, unknown>;
  const data: Record<string, unknown> = (flow['data'] ?? {}) as Record<string, unknown>;
  const components: unknown[] = Array.isArray(data['components']) ? (data['components'] as unknown[]) : [];

  return `flowStatus=${asText(flow['flowStatus']) || 'unknown'}, ${components.length} components`;
};

export const CAPABILITIES: Capability[] = [
  {
    api: 'GET /health/liveness',
    id: 'server',
    name: 'Server reachable',
    run: async () => {
      const health = await checkServerHealth();

      return health.state === 'up' ? pass(`${playgroundConfig.baseUrl} is healthy`) : fail(health.detail);
    },
    section: 'Setup',
  },
  {
    api: '<ThunderIDProvider :client-id :base-url>',
    id: 'config',
    name: 'Provider configuration',
    run: ({sdk}: CapabilityContext) => {
      if (!sdk.clientId) return fail('VITE_THUNDERID_CLIENT_ID is empty; copy .env.example to .env');
      if (!sdk.baseUrl) return fail('VITE_THUNDERID_BASE_URL is empty');

      return pass(`clientId ${sdk.clientId}`);
    },
    section: 'Setup',
  },
  {
    api: 'useThunderID().isInitialized',
    id: 'init',
    name: 'Provider initialized',
    run: async ({sdk}: CapabilityContext) =>
      (await waitFor(() => sdk.isInitialized.value, 8000))
        ? pass('client ready')
        : fail('isInitialized stayed false for 8s'),
    section: 'Setup',
  },
  {
    api: "getStorageManager().getOIDCProviderMetaDataParameter('issuer')",
    id: 'discovery',
    name: 'OIDC discovery',
    run: async ({sdk}: CapabilityContext) => {
      const readIssuer = async (): Promise<string> =>
        asText(await sdk.getStorageManager().getOIDCProviderMetaDataParameter('issuer'));

      await waitFor(async () => !!(await readIssuer()), 5000);

      const issuer: string = await readIssuer();

      return issuer
        ? pass(`issuer ${issuer}`)
        : fail('no issuer in SDK storage: discovery did not load when the provider mounted');
    },
    section: 'Setup',
  },
  {
    api: 'useFlowMeta().meta',
    id: 'meta',
    name: 'Flow metadata',
    run: async ({flowMeta}: CapabilityContext) => {
      await waitFor(() => !!flowMeta.meta.value || !flowMeta.isLoading.value, 5000);

      if (flowMeta.meta.value) return pass('GET /flow/meta resolved');
      if (flowMeta.error.value) return fail(flowMeta.error.value.message);

      return fail('meta is null: /flow/meta failed or needs applicationId');
    },
    section: 'Setup',
  },
  {
    api: '<SignInButton /> · signIn()',
    id: 'redirect',
    name: 'Sign in (redirect)',
    run: async ({sdk}: CapabilityContext, {interactive}: RunOptions) => {
      if (sdk.isSignedIn.value) return pass(`signed in as ${getDisplayName(toUser(sdk.user.value))}`);
      if (!interactive) return skip('interactive: press Run to redirect to ThunderID');

      await track('signIn', () => sdk.signIn());

      return skip('redirecting to ThunderID');
    },
    section: 'Authentication',
  },
  {
    api: '<SignIn /> · signIn({applicationId, flowType})',
    id: 'native',
    name: 'Sign in (app-native flow)',
    run: async ({sdk}: CapabilityContext) => {
      if (!sdk.applicationId) return fail('VITE_THUNDERID_APPLICATION_ID is not set');

      const response: unknown = await track(
        'signIn:embedded',
        () =>
          withTimeout(
            sdk.signIn({applicationId: sdk.applicationId, flowType: EmbeddedFlowType.Authentication}),
            10000,
            'flow initiation',
          ),
        flowSummary,
      );

      return pass(`flow started: ${flowSummary(response)}`);
    },
    section: 'Authentication',
  },
  {
    api: '<SignUp /> · signUp({applicationId, flowType})',
    id: 'signup',
    name: 'Sign up (app-native flow)',
    run: async ({sdk}: CapabilityContext) => {
      if (!sdk.applicationId) return fail('VITE_THUNDERID_APPLICATION_ID is not set');

      const response: unknown = await track(
        'signUp:embedded',
        () =>
          withTimeout(
            sdk.signUp({applicationId: sdk.applicationId, flowType: EmbeddedFlowType.Registration}),
            10000,
            'flow initiation',
          ),
        flowSummary,
      );

      return pass(`flow started: ${flowSummary(response)}`);
    },
    section: 'Authentication',
  },
  {
    api: '<Recovery /> · recover()',
    id: 'recovery',
    name: 'Account recovery',
    run: () => unavailable('@thunderid/vue has no recover() or <Recovery /> component'),
    section: 'Authentication',
  },
  {
    api: 'signInSilently()',
    id: 'silent',
    name: 'Silent sign-in',
    run: async ({sdk}: CapabilityContext) => {
      const result: unknown = await track(
        'signInSilently',
        () => withTimeout(sdk.signInSilently(), 15000, 'signInSilently'),
        (value: unknown) => (value ? 'session renewed' : 'returned false'),
      );

      return result
        ? pass('session renewed without interaction')
        : fail('returned false: login_required or no session');
    },
    section: 'Authentication',
  },
  {
    api: 'useThunderID().isSignedIn after reload',
    id: 'restore',
    name: 'Session restore',
    run: async ({sdk}: CapabilityContext) => {
      await waitFor(() => sdk.isInitialized.value, 8000);

      return sdk.isSignedIn.value
        ? pass('session restored from storage')
        : skip('no session: sign in, then reload the page');
    },
    section: 'Authentication',
  },
  {
    api: '<SignOutButton /> · signOut()',
    id: 'signout',
    name: 'Sign out',
    run: async ({sdk}: CapabilityContext, {interactive}: RunOptions) => {
      if (!sdk.isSignedIn.value) return skip('not signed in');
      if (!interactive) return skip('interactive: press Run to sign out');

      await track('signOut', () => sdk.signOut());

      return pass('signOut() resolved');
    },
    section: 'Authentication',
  },
  {
    api: 'getAccessToken()',
    id: 'accessToken',
    name: 'Access token',
    run: async (context: CapabilityContext) => {
      const gate: CapabilityResult | null = requireSignedIn(context);

      if (gate) return gate;

      const token: string = await track('getAccessToken', () => context.sdk.getAccessToken());

      if (!token) return fail('empty access token');

      const exp: unknown = decodeJwt(token)?.payload['exp'];

      return pass(
        typeof exp === 'number'
          ? `JWT, expires in ${formatDuration(exp * 1000 - Date.now())}`
          : `opaque token, ${token.length} chars`,
      );
    },
    section: 'Session and tokens',
  },
  {
    api: 'getIdToken() · getDecodedIdToken()',
    id: 'idToken',
    name: 'ID token and claims',
    run: async (context: CapabilityContext) => {
      const gate: CapabilityResult | null = requireSignedIn(context);

      if (gate) return gate;

      const idToken: string = await track('getIdToken', () => context.sdk.getIdToken());
      const claims: Record<string, unknown> = (await track('getDecodedIdToken', () =>
        context.sdk.getDecodedIdToken(),
      )) as Record<string, unknown>;

      if (!idToken) return fail('empty ID token');

      return pass(`sub ${asText(claims['sub']) || '?'}, ${Object.keys(claims).length} claims`);
    },
    section: 'Session and tokens',
  },
  {
    api: 'getStorageManager().getSessionData()',
    id: 'refresh',
    name: 'Token refresh',
    run: async (context: CapabilityContext) => {
      const gate: CapabilityResult | null = requireSignedIn(context);

      if (gate) return gate;

      const session: Partial<SessionData> = (await context.sdk.getStorageManager().getSessionData()) ?? {};

      if (!session.refresh_token) {
        return fail('no refresh_token in session: add offline_access or enable refresh tokens for the app');
      }

      return pass('refresh_token present; the browser client refreshes it on expiry');
    },
    section: 'Session and tokens',
  },
  {
    api: 'http.request()',
    id: 'http',
    name: 'Authenticated request',
    run: async (context: CapabilityContext) => {
      const gate: CapabilityResult | null = requireSignedIn(context);

      if (gate) return gate;

      const {sdk} = context;
      const response: {status?: number} = await track(
        'http.request',
        () => sdk.http.request({method: 'GET', url: `${sdk.baseUrl}/users/me`}),
        (value: {status?: number}) => `GET /users/me ${String(value?.status ?? '')}`,
      );

      return response?.status && response.status < 400
        ? pass(`GET /users/me ${response.status}`)
        : fail(`GET /users/me ${String(response?.status ?? 'no response')}`);
    },
    section: 'Session and tokens',
  },
  {
    api: 'exchangeToken()',
    id: 'exchange',
    name: 'Token exchange',
    run: () => skip('needs a grant-specific config; call exchangeToken() from your app'),
    section: 'Session and tokens',
  },
  {
    api: 'useThunderID().user',
    id: 'user',
    name: 'User info',
    run: (context: CapabilityContext) => {
      const gate: CapabilityResult | null = requireSignedIn(context);

      if (gate) return gate;

      const user = toUser(context.sdk.user.value);

      return user ? pass(getDisplayName(user)) : fail('user is null while signed in');
    },
    section: 'User',
  },
  {
    api: 'useUser().revalidateProfile()',
    id: 'profile',
    name: 'User profile',
    run: async (context: CapabilityContext) => {
      const gate: CapabilityResult | null = requireSignedIn(context);

      if (gate) return gate;

      const {user} = context;

      await track('revalidateProfile', () => user.revalidateProfile());

      if (!user.profile.value) return fail('profile is null after revalidateProfile()');

      return pass(
        `${Object.keys(user.profile.value).length} fields, schema ${user.userSchema?.value ? 'loaded' : 'missing'}`,
      );
    },
    section: 'User',
  },
  {
    api: '<UserProfile /> · updateProfile()',
    id: 'updateProfile',
    name: 'Update profile',
    run: (context: CapabilityContext) => requireSignedIn(context) ?? skip('writes data: edit a field in Components'),
    section: 'User',
  },
  {
    api: 'useOrganization() · switchOrganization()',
    id: 'orgs',
    name: 'Organizations',
    run: () => unavailable('@thunderid/vue has no organization API'),
    section: 'User',
  },
  {
    api: 'resolveResourceEndpoint(agentTypes | groups | roles)',
    id: 'endpointKeys',
    name: 'Endpoint keys',
    run: () => {
      const keys: ResourceEndpointKey[] = ['agentTypes', 'groups', 'roles'];
      const problems: string[] = keys.flatMap((key: ResourceEndpointKey) => {
        const override = `https://api.playground.invalid/v2/${key}`;
        const explicit = `https://explicit.playground.invalid/${key}`;
        const found: string[] = [];

        if (resolveResourceEndpoint(key, {endpoints: {}}) !== undefined) found.push(`${key}: unset is not undefined`);
        if (resolveResourceEndpoint(key, {endpoints: {[key]: override}}) !== override) {
          found.push(`${key}: override ignored`);
        }
        if (resolveResourceEndpoint(key, {endpoints: {[key]: override}}, explicit) !== explicit) {
          found.push(`${key}: explicit URL did not win over the override`);
        }

        return found;
      });

      return problems.length
        ? fail(problems.join('; '))
        : pass('agentTypes, groups, roles: unset defers to baseUrl, override applies, explicit URL wins');
    },
    section: 'Management',
  },
  {
    api: 'getGroups · getGroupMembers · getRoles · getRoleAssignments · getAgentTypes · ... ({baseUrl, url})',
    id: 'endpointRequests',
    name: 'Requests honor overrides',
    run: async () => {
      const base = 'https://idp.playground.invalid';
      const overrideHost = 'https://api.playground.invalid/v2';
      const urls: string[] = [];
      const fetcher: ApiFetcher = recordingFetcher(urls);
      const onBase: ManagementRequestConfig = {baseUrl: base, fetcher};
      const at = (collection: string): ManagementRequestConfig => ({
        baseUrl: base,
        fetcher,
        url: `${overrideHost}/${collection}`,
      });
      // Each request, with the URL prefix it must hit. The collection override replaces {baseUrl}/{path}.
      const cases: [() => Promise<unknown>, string][] = [
        [() => getGroups(onBase), `${base}/groups`],
        [() => getGroups(at('groups')), `${overrideHost}/groups`],
        [() => getGroupMembers({...at('groups'), groupId: 'g1'}), `${overrideHost}/groups/g1/members`],
        [() => getRoles(onBase), `${base}/roles`],
        [() => getRoles(at('roles')), `${overrideHost}/roles`],
        [() => getRoleAssignments({...at('roles'), roleId: 'r1'}), `${overrideHost}/roles/r1/assignments`],
        [() => getAgentTypes(onBase), `${base}/agent-types`],
        [() => getAgentTypes(at('agent-types')), `${overrideHost}/agent-types`],
        [() => getAgentGroups({...at('agents'), agentId: 'a1'}), `${overrideHost}/agents/a1/groups`],
        [() => getAgentRoles({...at('agents'), agentId: 'a1'}), `${overrideHost}/agents/a1/roles`],
        [() => getUserGroups({...at('users'), userId: 'u1'}), `${overrideHost}/users/u1/groups`],
        [() => getUserTypes(at('user-types')), `${overrideHost}/user-types`],
      ];

      for (const [call] of cases) {
        // Sequential so each recorded URL lines up with its case.
        await call();
      }

      const wrong: string[] = cases
        .map(([, expected]: [() => Promise<unknown>, string], index: number) =>
          urls[index]?.startsWith(expected) ? '' : `expected ${expected}, got ${urls[index] ?? 'no request'}`,
        )
        .filter(Boolean);

      return wrong.length ? fail(wrong.join('; ')) : pass(`${cases.length} requests addressed the expected URL`);
    },
    section: 'Management',
  },
  {
    api: 'useManagementEndpoint(key) · <ThunderIDProvider :endpoints>',
    id: 'providerEndpoints',
    name: 'Provider endpoints',
    run: ({app}: CapabilityContext) => {
      const keys: ManagementEndpointKey[] = [
        'applications',
        'users',
        'userTypes',
        'groups',
        'roles',
        'agents',
        'agentTypes',
      ];
      const {scope, value: resolved} = runComposable(app, () =>
        keys.map((key: ManagementEndpointKey): [ManagementEndpointKey, ManagementEndpoint] => [
          key,
          useManagementEndpoint(key),
        ]),
      );

      scope.stop();

      const mismatched: string[] = resolved
        .filter(
          ([key, endpoint]: [ManagementEndpointKey, ManagementEndpoint]) =>
            endpoint.url !== playgroundConfig.endpoints?.[key] || endpoint.baseUrl !== playgroundConfig.baseUrl,
        )
        .map(([key]: [ManagementEndpointKey, ManagementEndpoint]) => key);

      if (mismatched.length) return fail(`does not match .env: ${mismatched.join(', ')}`);

      const overridden: string[] = resolved
        .filter(([, endpoint]: [ManagementEndpointKey, ManagementEndpoint]) => endpoint.url)
        .map(([key, endpoint]: [ManagementEndpointKey, ManagementEndpoint]) => `${key} → ${endpoint.url}`);

      return pass(
        overridden.length ? overridden.join(', ') : `${keys.length} collections on baseUrl (no overrides in .env)`,
      );
    },
    section: 'Management',
  },
  {
    api: 'getGroups() · getGroup() · getGroupMembers()',
    id: 'groups',
    name: 'Groups',
    run: async (context: CapabilityContext) => {
      const gate: CapabilityResult | null = requireManagementSession(context);

      if (gate) return gate;

      const config: ManagementRequestConfig = managementConfig(context, 'groups');
      const page: GroupListResponse = await manage('getGroups', 'system:group:view', () =>
        getGroups({...config, limit: 5}),
      );
      const first: Group | undefined = page.groups[0];

      if (!first) return pass('0 groups: create one in the Console or with <GroupCreate />');

      const group: Group = await manage('getGroup', 'system:group:view', () =>
        getGroup({...config, groupId: first.id}),
      );
      const members: GroupMemberListResponse = await manage('getGroupMembers', 'system:group:view', () =>
        getGroupMembers({...config, groupId: first.id, limit: 5}),
      );

      return pass(
        `${plural(page.totalResults, 'group')}; "${group.name}" has ${plural(members.totalResults, 'member')}`,
      );
    },
    section: 'Management',
  },
  {
    api: 'getRoles() · getRole() · getRoleAssignments()',
    id: 'roles',
    name: 'Roles',
    run: async (context: CapabilityContext) => {
      const gate: CapabilityResult | null = requireManagementSession(context);

      if (gate) return gate;

      const config: ManagementRequestConfig = managementConfig(context, 'roles');
      const page: RoleListResponse = await manage('getRoles', 'system:role:view', () =>
        getRoles({...config, limit: 5}),
      );
      const first: RoleListResponse['roles'][number] | undefined = page.roles[0];

      if (!first) return pass('0 roles: create one in the Console or with <RoleCreate />');

      const role: Role = await manage('getRole', 'system:role:view', () => getRole({...config, roleId: first.id}));
      const assignments: RoleAssignmentListResponse = await manage('getRoleAssignments', 'system:role:view', () =>
        getRoleAssignments({...config, limit: 5, roleId: first.id}),
      );
      const permissions: number = role.permissions.reduce(
        (total: number, resource: Role['permissions'][number]) => total + resource.permissions.length,
        0,
      );

      return pass(
        `${plural(page.totalResults, 'role')}; "${role.name}" grants ${plural(permissions, 'permission')}, ${plural(
          assignments.totalResults,
          'assignment',
        )}`,
      );
    },
    section: 'Management',
  },
  {
    api: 'getAgentTypes()',
    id: 'agentTypes',
    name: 'Agent types',
    run: async (context: CapabilityContext) => {
      const gate: CapabilityResult | null = requireManagementSession(context);

      if (gate) return gate;

      const page: AgentTypeListResponse = await manage('getAgentTypes', 'system:agent:view', () =>
        getAgentTypes({...managementConfig(context, 'agentTypes'), limit: 5}),
      );
      const names: string = page.types.map((type: AgentTypeListResponse['types'][number]) => type.handle).join(', ');

      return pass(`${plural(page.totalResults, 'agent type')}${names ? `: ${names}` : ''}`);
    },
    section: 'Management',
  },
  {
    api: 'getAgents() · getAgentGroups() · getAgentRoles()',
    id: 'agentMemberships',
    name: 'Agent groups and roles',
    run: async (context: CapabilityContext) => {
      const gate: CapabilityResult | null = requireManagementSession(context);

      if (gate) return gate;

      const config: ManagementRequestConfig = managementConfig(context, 'agents');
      const agents: AgentListResponse = await manage('getAgents', 'system:agent:view', () =>
        getAgents({...config, limit: 1}),
      );
      const agent: AgentListResponse['agents'][number] | undefined = agents.agents[0];

      if (!agent) return skip('no agents to inspect: create one with <AgentCreate />');

      const groups: MembershipGroupListResponse = await manage('getAgentGroups', 'system:agent:view', () =>
        getAgentGroups({...config, agentId: agent.id}),
      );
      const roles: AgentRoleListResponse = await manage('getAgentRoles', 'system:agent:view', () =>
        getAgentRoles({...config, agentId: agent.id}),
      );

      return pass(`"${agent.name}": ${plural(groups.totalResults, 'group')}, roles [${roles.roles.join(', ')}]`);
    },
    section: 'Management',
  },
  {
    api: 'getUserGroups({userId})',
    id: 'userGroups',
    name: 'User groups',
    run: async (context: CapabilityContext) => {
      const gate: CapabilityResult | null = requireManagementSession(context);

      if (gate) return gate;

      // ThunderID issues the user's ID as the `sub` claim.
      const claims: Record<string, unknown> = (await context.sdk.getDecodedIdToken()) as Record<string, unknown>;
      const userId: string = asText(claims['sub']);

      if (!userId) return fail('the ID token has no sub claim to look the user up by');

      const page: MembershipGroupListResponse = await manage('getUserGroups', 'system:user:view', () =>
        getUserGroups({...managementConfig(context, 'users'), userId}),
      );
      const names: string = page.groups
        .map((group: MembershipGroupListResponse['groups'][number]) => group.name)
        .join(', ');

      return pass(`signed-in user is in ${plural(page.totalResults, 'group')}${names ? `: ${names}` : ''}`);
    },
    section: 'Management',
  },
  {
    api: 'getUserTypes() · useGetUserTypes()',
    id: 'userTypes',
    name: 'User types',
    run: async (context: CapabilityContext) => {
      const gate: CapabilityResult | null = requireManagementSession(context);

      if (gate) return gate;

      const page: ManagedUserTypeListResponse = await manage('getUserTypes', 'system:user:view', () =>
        getUserTypes({...managementConfig(context, 'userTypes'), limit: 5}),
      );

      return pass(plural(page.totalResults, 'user type'));
    },
    section: 'Management',
  },
  {
    api: 'getTokenPermissions() · hasPermission()',
    id: 'permissionHelpers',
    name: 'Permission helpers',
    run: () => {
      const expectations: [string, boolean][] = [
        ["hasPermission(['system:user'], 'system:user:view')", hasPermission(['system:user'], 'system:user:view')],
        ["!hasPermission(['system:user'], 'system:users')", !hasPermission(['system:user'], 'system:users')],
        ["!hasPermission(['system:user:view'], 'system:user')", !hasPermission(['system:user:view'], 'system:user')],
        ["hasPermission([], '')", hasPermission([], '')],
        [
          'scope claim is split on spaces',
          getTokenPermissions(fakeJwt({scope: 'openid system:group:view'})).join(',') === 'openid,system:group:view',
        ],
        [
          'scopes claim is read as a list',
          getTokenPermissions(fakeJwt({scopes: ['system:role']})).join(',') === 'system:role',
        ],
        ['an opaque token grants nothing', getTokenPermissions('opaque-token').length === 0],
      ];
      const failed: string[] = expectations.filter(([, ok]: [string, boolean]) => !ok).map(([label]) => label);

      return failed.length ? fail(`failed: ${failed.join('; ')}`) : pass(`${expectations.length} cases hold`);
    },
    section: 'Permissions',
  },
  {
    api: 'useGrantedPermissions()',
    id: 'grantedPermissions',
    name: 'Granted permissions',
    run: async (context: CapabilityContext) => {
      const gate: CapabilityResult | null = requireManagementSession(context);

      if (gate) return gate;

      const {scope, value: granted} = runComposable<GrantedPermissions>(context.app, useGrantedPermissions);

      try {
        if (!(await waitFor(() => !granted.isLoading.value, 5000))) return fail('isLoading stayed true for 5s');

        const fromToken: string[] = getTokenPermissions(await context.sdk.getAccessToken());
        const permissions: string[] = granted.permissions.value;

        if (permissions.join(' ') !== fromToken.join(' ')) {
          return fail(`composable has ${permissions.length}, the access token has ${fromToken.length}`);
        }
        if (!permissions.length) return pass('0 permissions: the access token is opaque or has no scope claim');

        const probe = 'system:group:view';

        return pass(`${plural(permissions.length, 'permission')}; can('${probe}') = ${String(granted.can(probe))}`);
      } finally {
        scope.stop();
      }
    },
    section: 'Permissions',
  },
  {
    api: 'createThunderIDGuard()',
    id: 'guard',
    name: 'Route guard',
    run: async ({app, sdk}: CapabilityContext) => {
      // Vue Router runs guards inside app.runWithContext(), so the guard's inject() sees only
      // app-level provides. <ThunderIDProvider> provides its context there too; probe that first,
      // then run the guard the same way.
      const visible: boolean = app.runWithContext(() => !!inject(THUNDERID_KEY, null));
      const target: GuardTarget = await new Promise((resolve: (value: GuardTarget) => void) => {
        const guard = createThunderIDGuard({initTimeout: 3000, redirectTo: '/signed-out'});

        void app.runWithContext(() =>
          guard(
            {fullPath: '/protected', path: '/protected', query: {}},
            {fullPath: '/', path: '/'},
            (next?: NavigationGuardReturn) => resolve({next}),
          ),
        );
      });
      const allowed: boolean = target.next === undefined;
      const outcome: string = allowed ? 'allowed' : `redirected to ${JSON.stringify(target.next)}`;

      if (!visible) {
        return fail(`${outcome}: inject(THUNDERID_KEY) is empty in app context; is <ThunderIDProvider> mounted?`);
      }

      const expected: boolean = sdk.isSignedIn.value === allowed;

      return expected ? pass(outcome) : fail(`${outcome} while isSignedIn=${String(sdk.isSignedIn.value)}`);
    },
    section: 'Routing',
  },
  {
    api: 'createCallbackRoute()',
    id: 'callback',
    name: 'Callback route',
    run: () => {
      const route: ThunderIDRouteRecord = createCallbackRoute({path: '/callback'});

      return route.component ? pass(`route record for ${route.path} with <Callback />`) : fail('no component');
    },
    section: 'Routing',
  },
  {
    api: 'useI18n() · preferences.i18n',
    id: 'i18n',
    name: 'Translations',
    run: ({i18n}: CapabilityContext) => {
      const key = 'elements.buttons.signin.text';
      const text: string = i18n.t(key);

      if (!text || text === key) return fail(`t('${key}') returned the key`);

      return pass(`${i18n.currentLanguage.value}: "${text}", ${Object.keys(i18n.bundles.value).length} bundles`);
    },
    section: 'UI',
  },
  {
    api: 'useTheme() · ThemeProvider',
    id: 'theme',
    name: 'Theming and dark mode',
    run: ({theme}: CapabilityContext) => {
      const count: number = Object.keys(theme.theme.value.cssVariables ?? {}).length;

      if (!count) return fail('theme exposes no CSS variables');

      return pass(`${theme.colorScheme.value} scheme, ${count} CSS variables`);
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
  context: CapabilityContext,
  options: RunOptions,
): Promise<CapabilityResult> => {
  try {
    return await capability.run(context, options);
  } catch (error) {
    return fail(describeError(error));
  }
};
