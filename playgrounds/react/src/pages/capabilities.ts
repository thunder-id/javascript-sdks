// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  ApiFetcher,
  EmbeddedFlowType,
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
  getUserTypes,
  hasPermission,
  resolveResourceEndpoint,
  type SessionData,
} from '@thunderid/browser';
import type {I18nContextValue, ThemeContextValue, ThunderIDContextProps, UserContextProps} from '@thunderid/react';
import {COMPONENTS, STORY_COUNT} from './explorer/stories';
import playgroundConfig from '../config';
import {describeError, track} from '../lib/events';
import {checkServerHealth} from '../lib/health';
import {decodeJwt, formatDuration} from '../lib/jwt';
import {
  createRecordingFetcher,
  createTokenFetcher,
  describeManagementError,
  MANAGEMENT_COLLECTIONS,
  MANAGEMENT_KEYS,
  ManagementKey,
  NEW_MANAGEMENT_KEYS,
  PERMISSION_PROBES,
  resolveManagementEndpoints,
} from '../lib/management';
import {asText, sdkSignIn, sdkSignOut, sdkSignUp, toUser} from '../lib/sdk';
import {getDisplayName} from '../lib/user';

export type CapabilityStatus = 'idle' | 'running' | 'pass' | 'fail' | 'skip' | 'unavailable';

export interface CapabilityResult {
  note: string;
  status: Exclude<CapabilityStatus, 'idle' | 'running'>;
}

export interface CapabilityContext {
  i18n: I18nContextValue;
  sdk: ThunderIDContextProps;
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

/**
 * The inputs every core management API function takes: where the collection lives (honoring the
 * provider's `endpoints` override, as `useManagementEndpoint()` does) and an authenticated fetcher.
 */
const management = (
  context: CapabilityContext,
  key: ManagementKey,
): {baseUrl: string | undefined; fetcher: ApiFetcher; url: string | undefined} => ({
  baseUrl: context.sdk.baseUrl,
  fetcher: createTokenFetcher(context.sdk.getAccessToken),
  url: resolveResourceEndpoint(key, {endpoints: context.sdk.endpoints}),
});

/**
 * Runs a management read and turns an HTTP failure into a reason naming the missing permission.
 */
const readManagement = async <T>(name: string, permission: string, call: () => Promise<T>): Promise<T> => {
  try {
    return await track(name, call);
  } catch (error) {
    throw new Error(describeManagementError(error, permission));
  }
};

const plural = (count: number, noun: string): string => `${count} ${noun}${count === 1 ? '' : 's'}`;

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
    api: '<ThunderIDProvider clientId baseUrl />',
    id: 'config',
    name: 'Provider configuration',
    run: (getContext: () => CapabilityContext) => {
      const {sdk} = getContext();

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
    run: async (getContext: () => CapabilityContext) =>
      (await waitFor(getContext, (context: CapabilityContext) => context.sdk.isInitialized, 8000))
        ? pass('client ready')
        : fail('isInitialized stayed false for 8s'),
    section: 'Setup',
  },
  {
    api: 'useThunderID().discovery.wellKnown',
    id: 'discovery',
    name: 'OIDC discovery',
    run: async (getContext: () => CapabilityContext) => {
      await waitFor(getContext, (context: CapabilityContext) => !!context.sdk.discovery.wellKnown?.issuer, 5000);

      const issuer: string = asText(getContext().sdk.discovery.wellKnown?.issuer);

      return issuer
        ? pass(`issuer ${issuer}`)
        : fail('wellKnown has no issuer: discovery not loaded into SDK storage yet');
    },
    section: 'Setup',
  },
  {
    api: 'useThunderID().meta',
    id: 'meta',
    name: 'Flow metadata',
    run: async (getContext: () => CapabilityContext) => {
      const loaded: boolean = await waitFor(
        getContext,
        (context: CapabilityContext) => !!context.sdk.meta || !context.sdk.isMetaLoading,
        5000,
      );
      const {meta} = getContext().sdk;

      if (loaded && meta) return pass('GET /flow/meta resolved');

      return fail('meta is null: /flow/meta failed or needs applicationId');
    },
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

      if (!sdk.applicationId) return fail('VITE_THUNDERID_APPLICATION_ID is not set');

      const response: unknown = await track(
        'signIn:embedded',
        () =>
          withTimeout(
            sdkSignIn(sdk, {applicationId: sdk.applicationId, flowType: EmbeddedFlowType.Authentication}),
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
    run: async (getContext: () => CapabilityContext) => {
      const {sdk} = getContext();

      if (!sdk.applicationId) return fail('VITE_THUNDERID_APPLICATION_ID is not set');

      const response: unknown = await track(
        'signUp:embedded',
        () =>
          withTimeout(
            sdkSignUp(sdk, {applicationId: sdk.applicationId, flowType: EmbeddedFlowType.Registration}),
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
    api: '<Recovery /> · recover({applicationId, flowType})',
    id: 'recovery',
    name: 'Account recovery',
    run: async (getContext: () => CapabilityContext) => {
      const {sdk} = getContext();

      if (!sdk.applicationId) return fail('VITE_THUNDERID_APPLICATION_ID is not set');

      const response: unknown = await track(
        'recover',
        () =>
          withTimeout(
            sdk.recover({applicationId: sdk.applicationId, flowType: EmbeddedFlowType.Recovery}),
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
    api: 'signInSilently()',
    id: 'silent',
    name: 'Silent sign-in',
    run: async (getContext: () => CapabilityContext) => {
      const {sdk} = getContext();
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
    run: async (getContext: () => CapabilityContext) => {
      await waitFor(getContext, (context: CapabilityContext) => context.sdk.isInitialized, 8000);

      return getContext().sdk.isSignedIn
        ? pass('session restored from storage')
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
    api: 'getAccessToken()',
    id: 'accessToken',
    name: 'Access token',
    run: async (getContext: () => CapabilityContext) => {
      const {sdk} = getContext();
      const gate: CapabilityResult | null = requireSignedIn(getContext());

      if (gate) return gate;

      const token: string = await track('getAccessToken', () => sdk.getAccessToken());

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
    run: async (getContext: () => CapabilityContext) => {
      const {sdk} = getContext();
      const gate: CapabilityResult | null = requireSignedIn(getContext());

      if (gate) return gate;

      const idToken: string = await track('getIdToken', () => sdk.getIdToken());
      const claims: Record<string, unknown> = (await track('getDecodedIdToken', () =>
        sdk.getDecodedIdToken(),
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
    run: async (getContext: () => CapabilityContext) => {
      const {sdk} = getContext();
      const gate: CapabilityResult | null = requireSignedIn(getContext());

      if (gate) return gate;

      const session: Partial<SessionData> = (await (await sdk.getStorageManager())?.getSessionData()) ?? {};

      if (!session.refresh_token) {
        return fail('no refresh_token in session: add offline_access or enable refresh tokens for the app');
      }

      return pass('refresh_token present; ThunderIDProvider schedules auto refresh');
    },
    section: 'Session and tokens',
  },
  {
    api: 'http.request()',
    id: 'http',
    name: 'Authenticated request',
    run: async (getContext: () => CapabilityContext) => {
      const {sdk} = getContext();
      const gate: CapabilityResult | null = requireSignedIn(getContext());

      if (gate) return gate;

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
    run: (getContext: () => CapabilityContext) => {
      const gate: CapabilityResult | null = requireSignedIn(getContext());

      if (gate) return gate;

      const user = toUser(getContext().sdk.user);

      return user ? pass(getDisplayName(user)) : fail('user is null while signed in');
    },
    section: 'User',
  },
  {
    api: 'useUser().revalidateProfile()',
    id: 'profile',
    name: 'User profile',
    run: async (getContext: () => CapabilityContext) => {
      const gate: CapabilityResult | null = requireSignedIn(getContext());

      if (gate) return gate;

      await track('revalidateProfile', () => getContext().user.revalidateProfile());

      const {profile, userSchema} = getContext().user;

      if (!profile) return fail('profile is null after revalidateProfile()');

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
    run: () => unavailable('@thunderid/react has no organization API'),
    section: 'User',
  },
  {
    api: '<ThunderIDProvider endpoints /> · resolveResourceEndpoint()',
    id: 'endpoints',
    name: 'Management endpoints',
    run: (getContext: () => CapabilityContext) => {
      const {sdk} = getContext();
      const configured: Partial<Record<ManagementKey, string>> = playgroundConfig.endpoints ?? {};
      const lost: ManagementKey[] = MANAGEMENT_KEYS.filter(
        (key: ManagementKey) => configured[key] !== resolveResourceEndpoint(key, {endpoints: sdk.endpoints}),
      );

      if (lost.length) return fail(`provider context does not carry the override for ${lost.join(', ')}`);

      const overridden: string[] = resolveManagementEndpoints(sdk.baseUrl, sdk.endpoints)
        .filter((endpoint: {override?: string}) => endpoint.override)
        .map((endpoint: {key: string}) => endpoint.key);

      return pass(
        overridden.length
          ? `${overridden.length} overridden (${overridden.join(', ')}), ${MANAGEMENT_KEYS.length - overridden.length} under baseUrl`
          : `all ${MANAGEMENT_KEYS.length} collections under baseUrl; set VITE_THUNDERID_ENDPOINT_<KEY> to override one`,
      );
    },
    section: 'Management endpoints',
  },
  {
    api: 'getGroups · getRoles · getAgentTypes ({url | baseUrl})',
    id: 'endpointRouting',
    name: 'Endpoint routing (new keys)',
    run: async () => {
      const base = 'https://base.playground.invalid';
      const overrideHost = 'https://api.playground.invalid';
      const calls: Record<string, (config: {baseUrl?: string; fetcher: ApiFetcher; url?: string}) => Promise<unknown>> =
        {agentTypes: getAgentTypes, groups: getGroups, roles: getRoles};
      const problems: string[] = [];

      for (const key of NEW_MANAGEMENT_KEYS) {
        const override = `${overrideHost}/${MANAGEMENT_COLLECTIONS[key]}`;
        const explicit = `${overrideHost}/explicit`;
        const urls: string[] = [];
        const fetcher: ApiFetcher = createRecordingFetcher(urls);

        // Precedence: explicit url, then the endpoints override, then {baseUrl}/{collection}.
        if (resolveResourceEndpoint(key, {endpoints: {[key]: override}}, explicit) !== explicit) {
          problems.push(`${key}: explicit url lost`);
        }

        await calls[key]({baseUrl: base, fetcher});
        await calls[key]({baseUrl: base, fetcher, url: resolveResourceEndpoint(key, {endpoints: {[key]: override}})});

        if (!urls[0]?.startsWith(`${base}/${MANAGEMENT_COLLECTIONS[key]}`)) problems.push(`${key}: default ${urls[0]}`);
        if (!urls[1]?.startsWith(override)) problems.push(`${key}: override ${urls[1]}`);
      }

      return problems.length
        ? fail(problems.join('; '))
        : pass(`${NEW_MANAGEMENT_KEYS.join(', ')}: default, override, and explicit url route as expected`);
    },
    section: 'Management endpoints',
  },
  {
    api: 'getTokenPermissions() · hasPermission()',
    id: 'permissions',
    name: 'Granted permissions',
    run: async (getContext: () => CapabilityContext) => {
      // The prefix rule is checked offline first: a parent covers its children, not its siblings.
      if (
        !hasPermission(['system:user'], 'system:user:view') ||
        hasPermission(['system:user'], 'system:username') ||
        !hasPermission([], '')
      ) {
        return fail('hasPermission() prefix rule is wrong');
      }

      const gate: CapabilityResult | null = requireSignedIn(getContext());

      if (gate) return skip('hasPermission() rule ok; sign in to read the token permissions');

      const permissions: string[] = getTokenPermissions(await getContext().sdk.getAccessToken());
      const granted: string[] = PERMISSION_PROBES.filter((probe: string) => hasPermission(permissions, probe));

      if (!permissions.length) return fail('token has no scope/scopes claim: opaque token or no permissions granted');

      return pass(`${plural(permissions.length, 'permission')}; covers ${granted.join(', ') || 'no system probes'}`);
    },
    section: 'Management',
  },
  {
    api: 'getGroups() · getGroup() · getGroupMembers()',
    id: 'groups',
    name: 'Groups',
    run: async (getContext: () => CapabilityContext) => {
      const gate: CapabilityResult | null = requireSignedIn(getContext());

      if (gate) return gate;

      const config = management(getContext(), 'groups');
      const list = await readManagement('getGroups', 'system:group:view', () => getGroups({...config, limit: 5}));
      const first = list.groups[0];

      if (!first) return pass('0 groups; create one in Components > GroupCreate (live)');

      const group = await readManagement('getGroup', 'system:group:view', () =>
        getGroup({...config, groupId: first.id}),
      );
      const members = await readManagement('getGroupMembers', 'system:group:view', () =>
        getGroupMembers({...config, groupId: first.id, limit: 5}),
      );

      return pass(
        `${plural(list.totalResults, 'group')}; "${group.name}" has ${plural(members.totalResults, 'member')}`,
      );
    },
    section: 'Management',
  },
  {
    api: 'getRoles() · getRole() · getRoleAssignments()',
    id: 'roles',
    name: 'Roles',
    run: async (getContext: () => CapabilityContext) => {
      const gate: CapabilityResult | null = requireSignedIn(getContext());

      if (gate) return gate;

      const config = management(getContext(), 'roles');
      const list = await readManagement('getRoles', 'system:role:view', () => getRoles({...config, limit: 5}));
      const first = list.roles[0];

      if (!first) return pass('0 roles; create one in Components > RoleCreate (live)');

      const role = await readManagement('getRole', 'system:role:view', () => getRole({...config, roleId: first.id}));
      const assignments = await readManagement('getRoleAssignments', 'system:role:view', () =>
        getRoleAssignments({...config, limit: 5, roleId: first.id}),
      );
      const permissionCount: number = (role.permissions ?? []).reduce(
        (total: number, entry: {permissions: string[]}) => total + entry.permissions.length,
        0,
      );

      return pass(
        `${plural(list.totalResults, 'role')}; "${role.name}" grants ${plural(permissionCount, 'permission')}, ${plural(
          assignments.totalResults,
          'assignment',
        )}`,
      );
    },
    section: 'Management',
  },
  {
    api: 'getUserTypes()',
    id: 'userTypes',
    name: 'User types',
    run: async (getContext: () => CapabilityContext) => {
      const gate: CapabilityResult | null = requireSignedIn(getContext());

      if (gate) return gate;

      const list = await readManagement('getUserTypes', 'system:usertype:view', () =>
        getUserTypes({...management(getContext(), 'userTypes'), limit: 10}),
      );
      const handles: string = list.types.map((type: {handle: string}) => type.handle).join(', ');

      return pass(`${plural(list.totalResults, 'user type')}${handles ? `: ${handles}` : ''}`);
    },
    section: 'Management',
  },
  {
    api: 'getUserGroups({userId})',
    id: 'userGroups',
    name: 'User groups',
    run: async (getContext: () => CapabilityContext) => {
      const gate: CapabilityResult | null = requireSignedIn(getContext());

      if (gate) return gate;

      // The signed-in user's ID is the sub claim; user memberships live under the users collection.
      const userId: string = asText(((await getContext().sdk.getDecodedIdToken()) as Record<string, unknown>)['sub']);

      if (!userId) return fail('ID token has no sub claim');

      const list = await readManagement('getUserGroups', 'system:user:view', () =>
        getUserGroups({...management(getContext(), 'users'), limit: 10, userId}),
      );

      return pass(`signed-in user is in ${plural(list.totalResults, 'group')}`);
    },
    section: 'Management',
  },
  {
    api: 'getAgentTypes()',
    id: 'agentTypes',
    name: 'Agent types',
    run: async (getContext: () => CapabilityContext) => {
      const gate: CapabilityResult | null = requireSignedIn(getContext());

      if (gate) return gate;

      const list = await readManagement('getAgentTypes', 'system:agent', () =>
        getAgentTypes({...management(getContext(), 'agentTypes'), limit: 10}),
      );
      const handles: string = list.types.map((type: {handle: string}) => type.handle).join(', ');

      return pass(`${plural(list.totalResults, 'agent type')}${handles ? `: ${handles}` : ''}`);
    },
    section: 'Management',
  },
  {
    api: 'getAgentGroups({agentId}) · getAgentRoles({agentId})',
    id: 'agentMemberships',
    name: 'Agent groups and roles',
    run: async (getContext: () => CapabilityContext) => {
      const gate: CapabilityResult | null = requireSignedIn(getContext());

      if (gate) return gate;

      const config = management(getContext(), 'agents');
      const agents = await readManagement('getAgents', 'system:agent', () => getAgents({...config, limit: 1}));
      const agent = agents.agents[0];

      if (!agent) return skip('no agents to inspect; create one in Components > AgentCreate (live)');

      const groups = await readManagement('getAgentGroups', 'system:agent', () =>
        getAgentGroups({...config, agentId: agent.id}),
      );
      const roles = await readManagement('getAgentRoles', 'system:agent', () =>
        getAgentRoles({...config, agentId: agent.id}),
      );

      return pass(`"${agent.name}": ${plural(groups.totalResults, 'group')}, ${plural(roles.totalResults, 'role')}`);
    },
    section: 'Management',
  },
  {
    api: 'createGroup · createRole · add/remove members and assignments',
    id: 'managementWrites',
    name: 'Group and role writes',
    run: (getContext: () => CapabilityContext) => {
      const gate: CapabilityResult | null = requireSignedIn(getContext());

      if (gate) return gate;

      return skip('writes data: use the mutation buttons on Hooks or the live admin stories');
    },
    section: 'Management',
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
