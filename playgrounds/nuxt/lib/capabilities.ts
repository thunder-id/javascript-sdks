// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  getAgentGroups,
  getAgentRoles,
  getAgents,
  getAgentTypes,
  getGroupMembers,
  getGroups,
  getRoleAssignments,
  getRoles,
  getTokenPermissions,
  getUserGroups,
  getUsers,
  getUserTypes,
  hasPermission,
  resolveResourceEndpoint,
  type ApiFetcher,
} from '@thunderid/browser';
import type {GrantedPermissions, ManagementEndpoint, ManagementEndpointKey, ThunderIDContext} from '@thunderid/vue';
import {describeError, track} from './events';
import {checkServerHealth} from './health';
import {decodeJwt, formatDuration} from './jwt';
import {
  AUTO_IMPORTED_COMPONENTS,
  AUTO_IMPORTED_COMPOSABLES,
  MANAGEMENT_COLLECTIONS,
  MANAGEMENT_ROUTE,
  NEW_ENDPOINT_KEYS,
  describeManagementError,
  mismatchedAutoImports,
  observeManagementRequests,
  requestConfig,
  type EndpointOverrides,
} from './management';
import {loadServerSession} from './session';
import {COMPONENTS, STORY_COUNT} from './stories';
import type {PlaygroundSession, SsrSnapshot} from './types';
import {getDisplayName} from './user';
import type {useFlowMeta, useTheme, useThunderIDI18n, useUser} from '#imports';

export type CapabilityStatus = 'idle' | 'running' | 'pass' | 'fail' | 'skip' | 'unavailable';

export interface CapabilityResult {
  note: string;
  status: Exclude<CapabilityStatus, 'idle' | 'running'>;
}

export interface PublicThunderIDConfig {
  applicationId?: string;
  baseUrl?: string;
  clientId?: string;
  endpoints?: EndpointOverrides;
  management?: boolean;
  scopes?: string | string[];
}

/** What the management checks need from the page's setup, where composables can run. */
export interface ManagementContext {
  /** `useManagementEndpoint(key)` for each collection. */
  endpoint: (key: ManagementEndpointKey) => ManagementEndpoint;
  permissions: GrantedPermissions;
}

/**
 * The live SDK state a check reads. Composables return refs, so this object stays current for the
 * whole run without being rebuilt.
 */
export interface CapabilityContext {
  config: PublicThunderIDConfig;
  flowMeta: ReturnType<typeof useFlowMeta>;
  i18n: ReturnType<typeof useThunderIDI18n>;
  management: ManagementContext;
  sdk: ThunderIDContext;
  ssr: SsrSnapshot | null;
  theme: ReturnType<typeof useTheme>;
  user: ReturnType<typeof useUser>;
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

const waitFor = async (predicate: () => boolean, ms: number): Promise<boolean> => {
  const deadline: number = Date.now() + ms;

  while (Date.now() < deadline) {
    if (predicate()) return true;
    await sleep(150);
  }

  return predicate();
};

const requireSignedIn = (context: CapabilityContext): CapabilityResult | null =>
  context.sdk.isSignedIn.value ? null : skip('sign in first');

const asText = (value: unknown): string => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  return JSON.stringify(value);
};

const flowSummary = (response: unknown): string => {
  const flow: Record<string, unknown> = (response ?? {}) as Record<string, unknown>;
  const data: Record<string, unknown> = (flow.data ?? {}) as Record<string, unknown>;
  const components: unknown[] = Array.isArray(data.components) ? (data.components as unknown[]) : [];

  return `flowStatus=${asText(flow.flowStatus) || 'unknown'}, ${components.length} components`;
};

const userOf = (context: CapabilityContext): Record<string, unknown> | null => {
  const value: unknown = context.sdk.user.value;

  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
};

/** Fetches a page without following redirects, so a route middleware redirect shows up as one. */
const probePage = async (path: string): Promise<'redirect' | number> => {
  const response: Response = await fetch(path, {credentials: 'same-origin', redirect: 'manual'});

  return response.type === 'opaqueredirect' ? 'redirect' : response.status;
};

/** The fetcher the module installs as `http.fetcher` when `management` is on. */
const fetcherOf = (context: CapabilityContext): ApiFetcher | undefined => context.sdk.http?.fetcher;

/**
 * Calls a management API function with the endpoint and fetcher the management composables use. A
 * request is made even without a session, so the module's route answers with the reason.
 */
const manage = <T>(
  context: CapabilityContext,
  key: ManagementEndpointKey,
  label: string,
  call: (config: ManagementEndpoint & {fetcher?: ApiFetcher}) => Promise<T>,
): Promise<T> => track(label, () => call(requestConfig(context.management.endpoint(key), fetcherOf(context))));

const managementCheck =
  (
    run: (context: CapabilityContext) => Promise<CapabilityResult>,
  ): ((context: CapabilityContext) => Promise<CapabilityResult>) =>
  async (context: CapabilityContext) => {
    if (!context.config.management) return fail('thunderid.management is off in nuxt.config.ts');

    try {
      return await run(context);
    } catch (error) {
      return fail(describeManagementError(error, context.config.clientId));
    }
  };

/** Posts one request body to the management route and returns the upstream status it reports. */
const postManagement = async (body: Record<string, unknown>): Promise<number> =>
  (await $fetch<{status: number}>(MANAGEMENT_ROUTE, {body, method: 'POST'})).status;

/** A JWT with the given payload and no valid signature: enough for `getTokenPermissions`, which only decodes. */
const unsignedJwt = (payload: Record<string, unknown>): string =>
  `e30.${btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.sig`;

export const CAPABILITIES: Capability[] = [
  {
    api: 'GET /api/playground/health',
    id: 'server',
    name: 'Server reachable from Nuxt',
    run: async () => {
      const health = await checkServerHealth();

      return health.state === 'up' ? pass('ThunderID is healthy') : fail(health.detail);
    },
    section: 'Setup',
  },
  {
    api: 'runtimeConfig.public.thunderid',
    id: 'config',
    name: 'Module configuration',
    run: ({config}: CapabilityContext) => {
      if (!config.baseUrl) return fail('NUXT_PUBLIC_THUNDERID_BASE_URL is empty');
      if (!config.clientId && !config.applicationId) {
        return fail('set NUXT_PUBLIC_THUNDERID_CLIENT_ID or NUXT_PUBLIC_THUNDERID_APPLICATION_ID in .env');
      }

      return pass(config.clientId ? `clientId ${config.clientId}` : `applicationId ${config.applicationId}`);
    },
    section: 'Setup',
  },
  {
    api: 'useThunderID().isInitialized',
    id: 'init',
    name: 'Plugin initialized',
    run: async ({sdk}: CapabilityContext) =>
      (await waitFor(() => sdk.isInitialized.value, 5000))
        ? pass('auth state hydrated from the server')
        : fail('isInitialized stayed false for 5s'),
    section: 'Setup',
  },
  {
    api: 'Nitro plugin · getThunderIDContext(event)',
    id: 'ssr',
    name: 'Server-side context',
    run: ({ssr}: CapabilityContext) => {
      if (!ssr) return fail('no server render recorded: reload the page');
      if (!ssr.present)
        return fail('event.context.thunderid is empty: the plugin did not initialize (see the server log)');

      return pass(`isSignedIn ${String(ssr.isSignedIn)}, flow meta ${ssr.flowMeta ? 'loaded' : 'missing'}`);
    },
    section: 'Setup',
  },
  {
    api: 'useFlowMeta().meta · GET /api/auth/meta',
    id: 'meta',
    name: 'Flow metadata',
    run: async ({flowMeta}: CapabilityContext) => {
      if (flowMeta.meta.value) return pass('seeded from the server render');

      try {
        await track('GET /api/auth/meta', () => $fetch<Record<string, unknown>>('/api/auth/meta'));

        return pass('GET /api/auth/meta resolved');
      } catch (error) {
        return fail(`meta is null: ${describeError(error)}`);
      }
    },
    section: 'Setup',
  },
  {
    api: '<SignInButton /> · signIn() · GET /api/auth/signin',
    id: 'redirect',
    name: 'Sign in (redirect)',
    run: async (context: CapabilityContext, {interactive}: RunOptions) => {
      const {config, sdk} = context;

      if (sdk.isSignedIn.value) return pass(`signed in as ${getDisplayName(userOf(context))}`);
      if (!config.clientId) return fail('NUXT_PUBLIC_THUNDERID_CLIENT_ID is not set');
      if (!interactive) return skip('interactive: press Run to redirect to ThunderID');

      await track('signIn', () => sdk.signIn() as Promise<unknown>);

      return skip('redirecting to ThunderID');
    },
    section: 'Authentication',
  },
  {
    api: '<SignIn /> · signIn({applicationId, flowType}) · POST /api/auth/signin',
    id: 'native',
    name: 'Sign in (app-native flow)',
    run: async ({config, sdk}: CapabilityContext) => {
      if (!config.applicationId) return fail('NUXT_PUBLIC_THUNDERID_APPLICATION_ID is not set');

      const response: unknown = await track(
        'signIn:embedded',
        () =>
          withTimeout(
            sdk.signIn({applicationId: config.applicationId, flowType: 'AUTHENTICATION'}) as Promise<unknown>,
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
    api: '<SignUp /> · signUp({applicationId, flowType}) · POST /api/auth/signup',
    id: 'signup',
    name: 'Sign up (app-native flow)',
    run: async ({config, sdk}: CapabilityContext) => {
      if (!config.applicationId) return fail('NUXT_PUBLIC_THUNDERID_APPLICATION_ID is not set');

      const response: unknown = await track(
        'signUp:embedded',
        () =>
          withTimeout(
            sdk.signUp({applicationId: config.applicationId, flowType: 'REGISTRATION'}) as Promise<unknown>,
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
    api: 'useState(thunderid:auth) after reload',
    id: 'restore',
    name: 'Session restore (SSR hydration)',
    run: ({sdk, ssr}: CapabilityContext) => {
      if (!sdk.isSignedIn.value) return skip('no session: sign in, then reload the page');
      if (ssr?.isSignedIn) return pass('server render already knew the session; no client fetch');

      return pass('signed in on the client');
    },
    section: 'Authentication',
  },
  {
    api: 'signInSilently()',
    id: 'silent',
    name: 'Silent sign-in',
    run: () => unavailable('no-op in @thunderid/nuxt: the session lives in a server cookie'),
    section: 'Authentication',
  },
  {
    api: '<SignOutButton /> · signOut() · POST /api/auth/signout',
    id: 'signout',
    name: 'Sign out',
    run: async ({sdk}: CapabilityContext, {interactive}: RunOptions) => {
      if (!sdk.isSignedIn.value) return skip('not signed in');
      if (!interactive) return skip('interactive: press Run to sign out');

      await track('signOut', () => sdk.signOut() as Promise<unknown>);

      return pass('signOut() resolved');
    },
    section: 'Authentication',
  },
  {
    api: 'GET /api/auth/session',
    id: 'sessionRoute',
    name: 'Session route',
    run: async ({sdk}: CapabilityContext) => {
      const state: {isSignedIn: boolean} = await track('GET /api/auth/session', () =>
        $fetch<{isSignedIn: boolean}>('/api/auth/session'),
      );

      return state.isSignedIn === sdk.isSignedIn.value
        ? pass(`isSignedIn ${String(state.isSignedIn)}, matches the client`)
        : fail(`server says isSignedIn ${String(state.isSignedIn)}, client says ${String(sdk.isSignedIn.value)}`);
    },
    section: 'Server routes',
  },
  {
    api: 'getAccessToken() · GET /api/auth/token',
    id: 'accessToken',
    name: 'Access token',
    run: async (context: CapabilityContext) => {
      const gate: CapabilityResult | null = requireSignedIn(context);

      if (gate) return gate;

      const token: string = await track('getAccessToken', () => context.sdk.getAccessToken());

      if (!token) return fail('empty: GET /api/auth/token failed');

      const exp: unknown = decodeJwt(token)?.payload.exp;

      return pass(
        typeof exp === 'number'
          ? `JWT, expires in ${formatDuration(exp * 1000 - Date.now())}`
          : `opaque token, ${token.length} chars`,
      );
    },
    section: 'Server routes',
  },
  {
    api: 'GET /api/auth/user',
    id: 'userRoute',
    name: 'User route',
    run: async (context: CapabilityContext) => {
      const gate: CapabilityResult | null = requireSignedIn(context);

      if (gate) return gate;

      const user: Record<string, unknown> = await track('GET /api/auth/user', () =>
        $fetch<Record<string, unknown>>('/api/auth/user'),
      );

      return pass(`${getDisplayName(user)}, ${Object.keys(user).length} fields`);
    },
    section: 'Server routes',
  },
  {
    api: 'getIdToken() · getDecodedIdToken()',
    id: 'idToken',
    name: 'ID token on the client',
    run: () => unavailable('no-op in @thunderid/nuxt; read claims on the server (Server page)'),
    section: 'Server routes',
  },
  {
    api: 'http.request()',
    id: 'http',
    name: 'Authenticated request',
    run: () => unavailable('no-op in @thunderid/nuxt; call a server route that uses getValidAccessToken()'),
    section: 'Server routes',
  },
  {
    api: 'exchangeToken()',
    id: 'exchange',
    name: 'Token exchange',
    run: () => unavailable('no-op in @thunderid/nuxt'),
    section: 'Server routes',
  },
  {
    api: 'useServerSession(event)',
    id: 'useServerSession',
    name: 'Read the session on the server',
    run: async ({sdk}: CapabilityContext) => {
      const session: PlaygroundSession | null = await track('GET /api/playground/session', () => loadServerSession());

      if (!session) return fail('GET /api/playground/session failed');
      if (session.signedIn !== sdk.isSignedIn.value) {
        return fail(`server signedIn ${String(session.signedIn)}, client ${String(sdk.isSignedIn.value)}`);
      }

      return pass(
        session.signedIn ? `sub ${session.sub ?? '?'}, scopes ${session.scopes ?? '?'}` : 'null without a session',
      );
    },
    section: 'Server utilities',
  },
  {
    api: 'requireServerSession(event)',
    id: 'requireServerSession',
    name: 'Protect an API route',
    run: async ({sdk}: CapabilityContext) => {
      const anonymous: Response = await fetch('/api/playground/protected', {credentials: 'omit'});

      if (anonymous.status !== 401) return fail(`anonymous request got ${anonymous.status}, expected 401`);
      if (!sdk.isSignedIn.value) return pass('anonymous request gets 401');

      const signedIn: Response = await fetch('/api/playground/protected', {credentials: 'same-origin'});

      return signedIn.ok
        ? pass('401 anonymous, 200 with the session cookie')
        : fail(`signed-in request got ${signedIn.status}`);
    },
    section: 'Server utilities',
  },
  {
    api: 'getValidAccessToken(event)',
    id: 'refresh',
    name: 'Token refresh on the server',
    run: async (context: CapabilityContext) => {
      const gate: CapabilityResult | null = requireSignedIn(context);

      if (gate) return gate;

      const token: {length: number} = await track('GET /api/playground/token', () =>
        $fetch<{length: number}>('/api/playground/token'),
      );
      const session: PlaygroundSession | null = await loadServerSession();

      if (!session?.hasRefreshToken) {
        return fail(`token ok (${token.length} chars) but no refresh token: request offline_access`);
      }

      return pass(`token ok, refresh token present: refreshed within 60s of expiry`);
    },
    section: 'Server utilities',
  },
  {
    api: "definePageMeta({middleware: ['auth']})",
    id: 'routeMiddleware',
    name: 'Protect a page',
    run: async ({sdk}: CapabilityContext) => {
      const result: 'redirect' | number = await track('GET /protected', () => probePage('/protected'), String);

      if (!sdk.isSignedIn.value) {
        return result === 'redirect'
          ? pass('signed out: redirected to /api/auth/signin')
          : fail(`expected a redirect, got ${String(result)}`);
      }

      return result === 200 ? pass('signed in: page rendered') : fail(`signed in but got ${String(result)}`);
    },
    section: 'Middleware',
  },
  {
    api: 'defineThunderIDMiddleware({requireScopes})',
    id: 'scopeMiddleware',
    name: 'Require scopes',
    run: async ({sdk}: CapabilityContext) => {
      const result: 'redirect' | number = await track(
        'GET /protected/scopes',
        () => probePage('/protected/scopes'),
        String,
      );

      if (!sdk.isSignedIn.value) {
        return result === 'redirect'
          ? pass('signed out: redirected to /api/auth/signin')
          : fail(`expected a redirect, got ${String(result)}`);
      }

      // The middleware must decide on the scopes granted to the session, so the expected outcome comes from there.
      const session: PlaygroundSession | null = await loadServerSession();
      const granted: string[] = (session?.scopes ?? '').split(' ');
      const hasScopes: boolean = ['openid', 'profile'].every((scope: string) => granted.includes(scope));

      if (hasScopes) {
        return result === 200
          ? pass('session granted openid and profile: page rendered')
          : fail(`session granted openid and profile, but got ${String(result)}`);
      }

      return result === 'redirect'
        ? pass(`session granted "${granted.join(' ')}", not openid and profile: redirected`)
        : fail(`session lacks openid or profile, but got ${String(result)}`);
    },
    section: 'Middleware',
  },
  {
    api: 'server/middleware · createRouteMatcher()',
    id: 'serverMiddleware',
    name: 'Server middleware',
    run: async () => {
      const response: Response = await fetch('/api/auth/session', {credentials: 'same-origin'});
      const trace: string | null = response.headers.get('x-playground-trace');

      if (!trace) return fail('no x-playground-trace header: server/middleware/playground.ts did not run');

      const steps: unknown[] = JSON.parse(decodeURIComponent(trace)) as unknown[];

      return pass(`ran before /api/auth/session, ${steps.length} trace steps`);
    },
    section: 'Middleware',
  },
  {
    api: 'useThunderID().user',
    id: 'user',
    name: 'User info',
    run: (context: CapabilityContext) => {
      const gate: CapabilityResult | null = requireSignedIn(context);

      if (gate) return gate;

      const user: Record<string, unknown> | null = userOf(context);

      return user ? pass(getDisplayName(user)) : fail('user is null while signed in');
    },
    section: 'User',
  },
  {
    api: 'useUser().revalidateProfile() · GET /api/auth/user/profile',
    id: 'profile',
    name: 'User profile',
    run: async (context: CapabilityContext) => {
      const gate: CapabilityResult | null = requireSignedIn(context);

      if (gate) return gate;

      await track('revalidateProfile', () => context.user.revalidateProfile());

      const profile: unknown = context.user.profile.value;

      if (!profile) return fail('profile is null after revalidateProfile()');

      return pass(
        `${Object.keys(profile as object).length} fields, schema ${context.user.userSchema?.value ? 'loaded' : 'missing'}`,
      );
    },
    section: 'User',
  },
  {
    api: '<UserProfile /> · PATCH /api/auth/user/profile',
    id: 'updateProfile',
    name: 'Update profile',
    run: (context: CapabilityContext) =>
      requireSignedIn(context) ?? skip('writes data: edit a field in Components > UserProfile'),
    section: 'User',
  },
  {
    api: 'useOrganization() · switchOrganization()',
    id: 'orgs',
    name: 'Organizations',
    run: () => unavailable('@thunderid/nuxt has no organization API'),
    section: 'User',
  },
  {
    api: 'useThunderIDI18n() · preferences.i18n',
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
  {
    api: 'nuxt.config thunderid.management · runtimeConfig.public.thunderid.management',
    id: 'managementOption',
    name: 'Management surface on',
    run: ({config, sdk}: CapabilityContext) => {
      if (!config.management) return fail('thunderid.management is not true in nuxt.config.ts');
      if (typeof sdk.http?.fetcher !== 'function') return fail('management is on but http.fetcher is not installed');

      return pass(`http.fetcher installed: requests go to POST ${MANAGEMENT_ROUTE}`);
    },
    section: 'Management',
  },
  {
    api: 'addComponent / addImports from @thunderid/vue · #components · #imports',
    id: 'managementAutoImports',
    name: 'Admin components and composables auto-imported',
    run: () => {
      const components: string[] = mismatchedAutoImports(AUTO_IMPORTED_COMPONENTS);
      const composables: string[] = mismatchedAutoImports(AUTO_IMPORTED_COMPOSABLES);

      if (components.length || composables.length) {
        return fail(`not the @thunderid/vue export: ${[...components, ...composables].join(', ')}`);
      }

      return pass(
        `${Object.keys(AUTO_IMPORTED_COMPONENTS).length} components, ${Object.keys(AUTO_IMPORTED_COMPOSABLES).length} composables resolve to @thunderid/vue`,
      );
    },
    section: 'Management',
  },
  {
    api: `POST ${MANAGEMENT_ROUTE} · URL allowlist`,
    id: 'managementRoute',
    name: 'Management route',
    run: async (context: CapabilityContext) => {
      if (!context.config.management) return fail('thunderid.management is off in nuxt.config.ts');

      const foreign: number = await track(`POST ${MANAGEMENT_ROUTE} (foreign host)`, () =>
        postManagement({method: 'GET', url: 'https://example.invalid/groups'}),
      );
      const groups: ManagementEndpoint = context.management.endpoint('groups');
      const target: string = groups.url ?? `${(groups.baseUrl ?? '').replace(/\/+$/, '')}/groups`;
      const allowed: number = await track(
        `POST ${MANAGEMENT_ROUTE} (groups)`,
        () => postManagement({method: 'GET', url: target}),
        String,
      );

      if (foreign !== 400) return fail(`a foreign host got HTTP ${foreign}, expected 400`);
      if (allowed === 400) return fail(`the configured groups collection ${target} was refused`);

      return pass(`foreign host 400; ${target} accepted (HTTP ${allowed}${allowed === 401 ? ': no session' : ''})`);
    },
    section: 'Management',
  },
  {
    api: `http.fetcher → POST ${MANAGEMENT_ROUTE}`,
    id: 'managementRelay',
    name: 'Requests go through the server route',
    run: async (context: CapabilityContext) => {
      if (!context.config.management) return fail('thunderid.management is off in nuxt.config.ts');
      if (typeof PerformanceObserver === 'undefined') return unavailable('no PerformanceObserver in this browser');

      const observed = await observeManagementRequests(() =>
        manage(context, 'groups', 'getGroups (relay)', (config) => getGroups({...config, limit: 1})),
      );

      if (observed.direct.length) return fail(`browser called ${observed.direct.join(', ')} directly`);
      if (!observed.relayed) return fail(`no request to ${MANAGEMENT_ROUTE} was observed`);

      return pass(
        `${observed.relayed} request via ${MANAGEMENT_ROUTE}, none to ThunderID; ${
          observed.error ? describeManagementError(observed.error, context.config.clientId) : 'HTTP 200'
        }`,
      );
    },
    section: 'Management',
  },
  {
    api: 'useManagementEndpoint(key) · resolveResourceEndpoint() · endpoints.{agentTypes,groups,roles}',
    id: 'endpoints',
    name: 'Endpoint resolution and overrides',
    run: ({config, management}: CapabilityContext) => {
      const sample: EndpointOverrides = {
        agentTypes: 'https://api.example/agent-types',
        groups: 'https://api.example/groups',
        roles: 'https://api.example/roles',
      };
      const broken: string[] = NEW_ENDPOINT_KEYS.filter(
        (key) =>
          resolveResourceEndpoint(key, {endpoints: sample}) !== sample[key] ||
          resolveResourceEndpoint(key, {endpoints: sample}, 'https://explicit.example') !==
            'https://explicit.example' ||
          resolveResourceEndpoint(key, {endpoints: {}}) !== undefined,
      );

      if (broken.length) return fail(`resolveResourceEndpoint ignores the override of ${broken.join(', ')}`);

      const drift: string[] = MANAGEMENT_COLLECTIONS.filter(
        ({key}) => management.endpoint(key).url !== config.endpoints?.[key],
      ).map(({key}) => key);

      if (drift.length) return fail(`useManagementEndpoint disagrees with the config for ${drift.join(', ')}`);

      const overridden: string[] = MANAGEMENT_COLLECTIONS.filter(({key}) => management.endpoint(key).url).map(
        ({key}) => key,
      );

      return pass(
        `override > {baseUrl}/{path} for agentTypes, groups, roles; ${
          overridden.length ? `overridden here: ${overridden.join(', ')}` : 'no overrides set'
        }`,
      );
    },
    section: 'Management',
  },
  {
    api: 'getGroups() · getGroupMembers() · useGetGroups()',
    id: 'groups',
    name: 'Groups',
    run: managementCheck(async (context: CapabilityContext) => {
      const page = await manage(context, 'groups', 'getGroups', (config) => getGroups({...config, limit: 5}));
      const first = page.groups[0];

      if (!first) return pass(`0 groups (${page.totalResults} total)`);

      const members = await manage(context, 'groups', 'getGroupMembers', (config) =>
        getGroupMembers({...config, groupId: first.id, limit: 5}),
      );

      return pass(`${page.totalResults} groups; "${first.name}" has ${members.totalResults} members`);
    }),
    section: 'Management',
  },
  {
    api: 'getRoles() · getRoleAssignments() · useGetRoles()',
    id: 'roles',
    name: 'Roles',
    run: managementCheck(async (context: CapabilityContext) => {
      const page = await manage(context, 'roles', 'getRoles', (config) => getRoles({...config, limit: 5}));
      const first = page.roles[0];

      if (!first) return pass(`0 roles (${page.totalResults} total)`);

      const assignments = await manage(context, 'roles', 'getRoleAssignments', (config) =>
        getRoleAssignments({...config, limit: 5, roleId: first.id}),
      );

      return pass(`${page.totalResults} roles; "${first.name}" has ${assignments.totalResults} assignments`);
    }),
    section: 'Management',
  },
  {
    api: 'getAgentTypes() · useGetAgentTypes() · endpoints.agentTypes',
    id: 'agentTypes',
    name: 'Agent types',
    run: managementCheck(async (context: CapabilityContext) => {
      const page = await manage(context, 'agentTypes', 'getAgentTypes', (config) =>
        getAgentTypes({...config, limit: 5}),
      );

      return pass(
        `${page.totalResults} agent types${page.types.length ? `: ${page.types.map((type) => type.handle).join(', ')}` : ''}`,
      );
    }),
    section: 'Management',
  },
  {
    api: 'getAgentGroups() · getAgentRoles() · useGetAgentGroups() · useGetAgentRoles()',
    id: 'agentMemberships',
    name: 'Agent groups and roles',
    run: managementCheck(async (context: CapabilityContext) => {
      const agents = await manage(context, 'agents', 'getAgents', (config) => getAgents({...config, limit: 1}));
      const agent = agents.agents[0];

      if (!agent) return skip('no agents to read groups and roles of: create one in the Console');

      const groups = await manage(context, 'agents', 'getAgentGroups', (config) =>
        getAgentGroups({...config, agentId: agent.id}),
      );
      const roles = await manage(context, 'agents', 'getAgentRoles', (config) =>
        getAgentRoles({...config, agentId: agent.id}),
      );

      return pass(`"${agent.name}": ${groups.totalResults} groups, ${roles.totalResults} roles`);
    }),
    section: 'Management',
  },
  {
    api: 'getUserGroups() · getUserTypes() · useGetUserGroups() · useGetUserTypes()',
    id: 'userMemberships',
    name: 'User groups and types',
    run: managementCheck(async (context: CapabilityContext) => {
      const types = await manage(context, 'userTypes', 'getUserTypes', (config) => getUserTypes({...config, limit: 5}));
      const users = await manage(context, 'users', 'getUsers', (config) => getUsers({...config, limit: 1}));
      const user = users.users[0];

      if (!user) return pass(`${types.totalResults} user types; no users to read groups of`);

      const groups = await manage(context, 'users', 'getUserGroups', (config) =>
        getUserGroups({...config, userId: user.id}),
      );

      return pass(
        `${types.totalResults} user types; user ${user.display ?? user.id} is in ${groups.totalResults} groups`,
      );
    }),
    section: 'Management',
  },
  {
    api: 'getTokenPermissions() · hasPermission()',
    id: 'permissionHelpers',
    name: 'Permission helpers',
    run: () => {
      const fromScope: string[] = getTokenPermissions(unsignedJwt({scope: 'openid system:user'}));
      const fromScopes: string[] = getTokenPermissions(unsignedJwt({scopes: ['system:group']}));

      if (fromScope.join(' ') !== 'openid system:user') return fail(`scope claim read as ${fromScope.join(' ')}`);
      if (fromScopes.join(' ') !== 'system:group') return fail(`scopes claim read as ${fromScopes.join(' ')}`);
      if (getTokenPermissions('not-a-jwt').length) return fail('an opaque token produced permissions');
      if (!hasPermission(['system:user'], 'system:user:view'))
        return fail('system:user does not cover system:user:view');
      if (hasPermission(['system:user'], 'system:userx')) return fail('system:user covers system:userx');

      return pass('scope and scopes claims read; system:user covers system:user:view, not system:userx');
    },
    section: 'Management',
  },
  {
    api: 'useGrantedPermissions() · can()',
    id: 'grantedPermissions',
    name: 'Granted permissions',
    run: async ({config, management, sdk}: CapabilityContext) => {
      const {can, isLoading, permissions} = management.permissions;

      if (!sdk.isSignedIn.value) {
        return fail(
          `no session: permissions stay [] until you sign in${config.clientId ? '' : ' (NUXT_PUBLIC_THUNDERID_CLIENT_ID is not set)'}`,
        );
      }
      if (!(await waitFor(() => !isLoading.value, 5000))) return fail('isLoading stayed true for 5s');

      const granted: string[] = permissions.value;
      const sample: string[] = ['system:user:view', 'system:group:view', 'system:role:view'].filter(can);

      return pass(
        `${granted.length} permissions from the access token; can: ${sample.length ? sample.join(', ') : 'none of system:{user,group,role}:view'}`,
      );
    },
    section: 'Management',
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
