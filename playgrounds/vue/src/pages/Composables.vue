<script setup lang="ts">
// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {EmbeddedFlowComponent, FetchSelectPage, SelectPage} from '@thunderid/browser';
import {
  ApiFetcher,
  getGroups,
  GroupListResponse,
  GroupQueryKeys,
  ManagementEndpoint,
  ManagementEndpointKey,
  ResourceQueryOptions,
  ResourceQueryResult,
  useAddGroupMembers,
  useAddRoleAssignments,
  useCreateAgent,
  useCreateApplication,
  useCreateGroup,
  useCreateRole,
  useCreateUser,
  useDeleteAgent,
  useDeleteApplication,
  useDeleteGroup,
  useDeleteRole,
  useDeleteUser,
  useFetchAuthFlows,
  useFetchUsers,
  useFetchUserTypes,
  useFlow,
  useFlowMeta,
  useGetAgent,
  useGetAgentGroups,
  useGetAgentRoles,
  useGetAgents,
  useGetAgentTypes,
  useGetApplication,
  useGetApplications,
  useGetGroup,
  useGetGroupMembers,
  useGetGroups,
  useGetRole,
  useGetRoleAssignments,
  useGetRoles,
  useGetUser,
  useGetUserGroups,
  useGetUsers,
  useGetUserTypes,
  useGrantedPermissions,
  useI18n,
  useManagementEndpoint,
  useRemoveGroupMembers,
  useRemoveRoleAssignments,
  useResourceMutation,
  useResourceQuery,
  useTheme,
  useThunderID,
  useUpdateAgent,
  useUpdateApplication,
  useUpdateGroup,
  useUpdateRole,
  useUpdateUser,
  useUser,
} from '@thunderid/vue';
import {computed, ComputedRef, Ref, ref, shallowRef, ShallowRef} from 'vue';
import ComposableCard from '../components/ComposableCard.vue';
import EventLog from '../components/EventLog.vue';
import {describeError, track} from '../lib/events';
import {asText, toUser} from '../lib/sdk';

interface FetcherState {
  data: SelectPage | null;
  error: string | null;
  isLoading: boolean;
}

const sdk = useThunderID();
const user = useUser();
const i18n = useI18n();
const theme = useTheme();
const flow = useFlow();
const flowMeta = useFlowMeta();
const {isSignedIn} = sdk;
const error: Ref<string | null> = ref<string | null>(null);

const FETCHERS: [string, FetchSelectPage][] = [
  ['useFetchUsers()', useFetchUsers()],
  ['useFetchUserTypes()', useFetchUserTypes()],
  ['useFetchAuthFlows()', useFetchAuthFlows()],
];

const fetched: ShallowRef<Record<string, FetcherState>> = shallowRef<Record<string, FetcherState>>({});

const call = (label: string, run: () => Promise<unknown>): void => {
  error.value = null;
  track(label, run).catch((caught: unknown) => {
    error.value = describeError(caught);
  });
};

const runFetcher = async (name: string, fetcher: FetchSelectPage): Promise<void> => {
  const set = (state: FetcherState): void => {
    fetched.value = {...fetched.value, [name]: state};
  };

  set({data: null, error: null, isLoading: true});

  try {
    const page: SelectPage = await track(
      name,
      () =>
        fetcher({
          // The fetchers only read paging fields; the flow component is passed through by selects.
          component: {} as EmbeddedFlowComponent,
          limit: 5,
          offset: 0,
          signal: new AbortController().signal,
        }),
      (result: SelectPage) => `${(result.options ?? result.items ?? []).length} results`,
    );

    set({data: page, error: null, isLoading: false});
  } catch (caught) {
    set({data: null, error: describeError(caught), isLoading: false});
  }
};

const languages: ComputedRef<string[]> = computed(() => Object.keys(i18n.bundles.value));

const i18nValue: ComputedRef<Record<string, unknown>> = computed(() => ({
  ...i18n,
  bundles: languages.value,
  samples: {
    "t('elements.buttons.signin.text')": i18n.t('elements.buttons.signin.text'),
    "t('elements.buttons.signout.text')": i18n.t('elements.buttons.signout.text'),
    "t('elements.buttons.signup.text')": i18n.t('elements.buttons.signup.text'),
  },
}));

// ── Management composables ──
// Queries wait for a session (`enabled`), so a signed-out page makes no requests. Refetch runs one
// anyway, which shows the error a signed-out or unauthorized call gets.

interface QueryEntry {
  name: string;
  query: ResourceQueryResult<unknown>;
  signature: string;
}

interface MutationLike {
  error: Readonly<Ref<Error | null>>;
  isLoading: Readonly<Ref<boolean>>;
}

const signedIn: ResourceQueryOptions = {enabled: () => isSignedIn.value};
const page = {limit: 5};

const groups = useGetGroups(page, signedIn);
const roles = useGetRoles(page, signedIn);
const agents = useGetAgents(page, signedIn);
const users = useGetUsers(page, signedIn);
const applications = useGetApplications(page, signedIn);

// The single-resource and membership composables follow the first row of each list.
const firstGroupId = (): string | undefined => groups.data.value?.groups[0]?.id;
const firstRoleId = (): string | undefined => roles.data.value?.roles[0]?.id;
const firstAgentId = (): string | undefined => agents.data.value?.agents[0]?.id;
const firstUserId = (): string | undefined => users.data.value?.users[0]?.id;
const firstApplicationId = (): string | undefined => applications.data.value?.applications[0]?.id;
// ThunderID issues the user's ID as the `sub` claim.
const signedInUserId = (): string | undefined => asText(toUser(sdk.user.value)?.['sub']) || undefined;

const groupsEndpoint: ManagementEndpoint = useManagementEndpoint('groups');
// A custom query on the same primitives the management composables use.
const groupCount = useResourceQuery(
  () => ['playground', 'group-count'],
  (fetcher: ApiFetcher) =>
    getGroups({...groupsEndpoint, fetcher, limit: 1}).then((result: GroupListResponse) => result.totalResults),
  signedIn,
);

const QUERIES: QueryEntry[] = [
  {
    name: 'useGetUsers()',
    query: users,
    signature: '(params?: {limit, offset, filter}, options?) => ResourceQueryResult',
  },
  {
    name: 'useGetUser(firstUserId)',
    query: useGetUser(firstUserId, signedIn),
    signature: '(userId) => ResourceQueryResult<ManagedUser>',
  },
  {
    name: 'useGetUserGroups(signedInUserId)',
    query: useGetUserGroups(signedInUserId, page, signedIn),
    signature: '(userId, params?) => ResourceQueryResult<MembershipGroupListResponse>',
  },
  {name: 'useGetUserTypes()', query: useGetUserTypes(page, signedIn), signature: '(params?) => ResourceQueryResult'},
  {name: 'useGetGroups()', query: groups, signature: '(params?: {limit, offset}) => ResourceQueryResult'},
  {
    name: 'useGetGroup(firstGroupId)',
    query: useGetGroup(firstGroupId, signedIn),
    signature: '(groupId) => ResourceQueryResult<Group>',
  },
  {
    name: 'useGetGroupMembers(firstGroupId)',
    query: useGetGroupMembers(firstGroupId, page, signedIn),
    signature: '(groupId, params?) => ResourceQueryResult<GroupMemberListResponse>',
  },
  {name: 'useGetRoles()', query: roles, signature: '(params?: {limit, offset}) => ResourceQueryResult'},
  {
    name: 'useGetRole(firstRoleId)',
    query: useGetRole(firstRoleId, signedIn),
    signature: '(roleId) => ResourceQueryResult<Role>',
  },
  {
    name: 'useGetRoleAssignments(firstRoleId)',
    query: useGetRoleAssignments(firstRoleId, page, signedIn),
    signature: '(roleId, params?: {limit, offset, type}) => ResourceQueryResult',
  },
  {name: 'useGetAgents()', query: agents, signature: '(params?: {limit, offset}) => ResourceQueryResult'},
  {
    name: 'useGetAgent(firstAgentId)',
    query: useGetAgent(firstAgentId, signedIn),
    signature: '(agentId) => ResourceQueryResult<Agent>',
  },
  {
    name: 'useGetAgentGroups(firstAgentId)',
    query: useGetAgentGroups(firstAgentId, page, signedIn),
    signature: '(agentId, params?) => ResourceQueryResult<MembershipGroupListResponse>',
  },
  {
    name: 'useGetAgentRoles(firstAgentId)',
    query: useGetAgentRoles(firstAgentId, page, signedIn),
    signature: '(agentId, params?) => ResourceQueryResult<AgentRoleListResponse>',
  },
  {name: 'useGetAgentTypes()', query: useGetAgentTypes(page, signedIn), signature: '(params?) => ResourceQueryResult'},
  {name: 'useGetApplications()', query: applications, signature: '(params?) => ResourceQueryResult'},
  {
    name: 'useGetApplication(firstApplicationId)',
    query: useGetApplication(firstApplicationId, signedIn),
    signature: '(applicationId) => ResourceQueryResult<Application>',
  },
  {
    name: "useResourceQuery(['playground', 'group-count'])",
    query: groupCount,
    signature: '(queryKey, queryFn: (fetcher) => Promise<T>, options?) => ResourceQueryResult<T>',
  },
];

const queryValue = (query: ResourceQueryResult<unknown>): Record<string, unknown> => ({
  data: query.data.value,
  error: query.error.value?.message ?? null,
  isLoading: query.isLoading.value,
  refetch: query.refetch,
});

const refetch = (name: string, query: ResourceQueryResult<unknown>): void =>
  call(name, async () => {
    await query.refetch();
    // refetch() resolves undefined on failure instead of rejecting; surface the error.
    if (query.error.value) throw query.error.value;
  });

// Mutations write data, so the page only shows their state; the admin components in the explorer
// drive them.
const MUTATIONS: [string, MutationLike][] = [
  ['useCreateUser', useCreateUser()],
  ['useUpdateUser', useUpdateUser()],
  ['useDeleteUser', useDeleteUser()],
  ['useCreateGroup', useCreateGroup()],
  ['useUpdateGroup', useUpdateGroup()],
  ['useDeleteGroup', useDeleteGroup()],
  ['useAddGroupMembers', useAddGroupMembers()],
  ['useRemoveGroupMembers', useRemoveGroupMembers()],
  ['useCreateRole', useCreateRole()],
  ['useUpdateRole', useUpdateRole()],
  ['useDeleteRole', useDeleteRole()],
  ['useAddRoleAssignments', useAddRoleAssignments()],
  ['useRemoveRoleAssignments', useRemoveRoleAssignments()],
  ['useCreateAgent', useCreateAgent()],
  ['useUpdateAgent', useUpdateAgent()],
  ['useDeleteAgent', useDeleteAgent()],
  ['useCreateApplication', useCreateApplication()],
  ['useUpdateApplication', useUpdateApplication()],
  ['useDeleteApplication', useDeleteApplication()],
];

// A custom mutation on the shared primitive. It writes nothing: it resolves locally and invalidates
// the group queries, so pressing it refetches every mounted group list above.
const touchGroups = useResourceMutation(
  (label: string) => Promise.resolve(label),
  () => [[GroupQueryKeys.GROUPS], [GroupQueryKeys.GROUP_MEMBERS]],
);

const mutationsValue: ComputedRef<Record<string, unknown>> = computed(() =>
  Object.fromEntries(
    [...MUTATIONS, ['useResourceMutation', touchGroups] as [string, MutationLike]].map(
      ([name, mutation]: [string, MutationLike]) => [
        name,
        mutation.error.value ? `error: ${mutation.error.value.message}` : mutation.isLoading.value ? 'running' : 'idle',
      ],
    ),
  ),
);

const ENDPOINT_KEYS: ManagementEndpointKey[] = [
  'applications',
  'users',
  'userTypes',
  'groups',
  'roles',
  'agents',
  'agentTypes',
];

const endpointsValue: Record<string, ManagementEndpoint> = Object.fromEntries(
  ENDPOINT_KEYS.map((key: ManagementEndpointKey) => [key, useManagementEndpoint(key)]),
);

const granted = useGrantedPermissions();
const probes: string[] = ['system', 'system:user:view', 'system:group:view', 'system:role:view', 'system:agent:view'];

const grantedValue: ComputedRef<Record<string, unknown>> = computed(() => ({
  can: Object.fromEntries(probes.map((probe: string) => [`can('${probe}')`, granted.can(probe)])),
  isLoading: granted.isLoading.value,
  permissions: granted.permissions.value,
}));

const themeValue: ComputedRef<Record<string, unknown>> = computed(() => {
  const variables: Record<string, string> = theme.theme.value.cssVariables ?? {};

  return {
    colorScheme: theme.colorScheme.value,
    cssVariables: `${Object.keys(variables).length} variables`,
    direction: theme.direction.value,
    sample: Object.fromEntries(Object.entries(variables).slice(0, 8)),
    toggleTheme: theme.toggleTheme,
  };
});
</script>

<template>
  <main class="pg-main">
    <div class="pg-heading">
      <div>
        <h1>Composables</h1>
        <p>
          Live values from every composable <span class="pg-accent">@thunderid/vue</span> exposes. Refs are unwrapped,
          functions are shown as signatures; use the buttons to call them.
        </p>
      </div>
    </div>

    <div v-if="error" class="pg-warning" role="alert">{{ error }}</div>

    <div class="pg-grid-2">
      <ComposableCard
        name="useThunderID()"
        signature="ThunderIDContext: reactive state refs, config, and auth functions"
        :value="sdk"
      >
        <template #actions>
          <button
            type="button"
            class="pg-btn"
            data-size="sm"
            :disabled="isSignedIn"
            @click="call('signIn', sdk.signIn)"
          >
            signIn()
          </button>
          <button
            type="button"
            class="pg-btn"
            data-size="sm"
            @click="call('signInSilently', () => sdk.signInSilently())"
          >
            signInSilently()
          </button>
          <button
            type="button"
            class="pg-btn"
            data-size="sm"
            :disabled="!isSignedIn"
            @click="call('signOut', sdk.signOut)"
          >
            signOut()
          </button>
        </template>
      </ComposableCard>

      <ComposableCard
        name="useUser()"
        signature="{profile, flattenedProfile, userSchema, revalidateProfile, updateProfile, onUpdateProfile}"
        :value="user"
      >
        <template #actions>
          <button
            type="button"
            class="pg-btn"
            data-size="sm"
            :disabled="!isSignedIn"
            @click="call('revalidateProfile', user.revalidateProfile)"
          >
            revalidateProfile()
          </button>
        </template>
      </ComposableCard>

      <ComposableCard
        name="useI18n()"
        signature="{currentLanguage, fallbackLanguage, bundles, setLanguage, injectBundles, t}"
        :value="i18nValue"
      >
        <template #actions>
          <button
            v-for="language in languages"
            :key="language"
            type="button"
            class="pg-btn"
            data-size="sm"
            :aria-pressed="language === i18n.currentLanguage.value"
            @click="i18n.setLanguage(language)"
          >
            {{ language }}
          </button>
        </template>
      </ComposableCard>

      <ComposableCard name="useTheme()" signature="{theme, colorScheme, direction, toggleTheme}" :value="themeValue">
        <template #actions>
          <button type="button" class="pg-btn" data-size="sm" @click="theme.toggleTheme()">toggleTheme()</button>
        </template>
      </ComposableCard>

      <ComposableCard
        name="useFlow()"
        signature="FlowContextValue: current step, title, and messages for embedded flows"
        :value="flow"
      />

      <ComposableCard
        name="useFlowMeta()"
        signature="{meta, isLoading, error, fetchFlowMeta, switchLanguage}"
        :value="{error: flowMeta.error.value?.message ?? null, isLoading: flowMeta.isLoading, meta: flowMeta.meta}"
      >
        <template #actions>
          <button type="button" class="pg-btn" data-size="sm" @click="call('fetchFlowMeta', flowMeta.fetchFlowMeta)">
            fetchFlowMeta()
          </button>
        </template>
      </ComposableCard>

      <ComposableCard
        v-for="[name, fetcher] in FETCHERS"
        :key="name"
        :name="name"
        signature="() => ({limit, offset, filter, signal}) => Promise<SelectPage>"
        :value="fetched[name] ?? {data: null, error: null, isLoading: false}"
      >
        <template #actions>
          <button type="button" class="pg-btn" data-size="sm" @click="runFetcher(name, fetcher)">Fetch</button>
        </template>
        <p class="pg-empty">
          Page loader for the select components. Calls the ThunderID API with the signed-in user's token.
        </p>
      </ComposableCard>
    </div>

    <div class="pg-heading">
      <div>
        <h2>Management</h2>
        <p>
          The management composables, <span class="pg-accent">useGrantedPermissions</span>, and
          <span class="pg-accent">useManagementEndpoint</span>. Queries wait for a session and follow the first row of
          each list; Refetch runs one anyway and shows its error.
        </p>
      </div>
    </div>

    <div class="pg-grid-2">
      <ComposableCard
        name="useGrantedPermissions()"
        signature="{permissions, isLoading, can(required)}: read from the access token"
        :value="grantedValue"
      >
        <p v-if="!isSignedIn" class="pg-empty">Signed out: no token, so no permissions.</p>
      </ComposableCard>

      <ComposableCard
        name="useManagementEndpoint(key)"
        signature="(key) => {baseUrl, url}: url is the endpoints override, undefined means {baseUrl}/{collection}"
        :value="endpointsValue"
      />

      <ComposableCard
        v-for="entry in QUERIES"
        :key="entry.name"
        :name="entry.name"
        :signature="entry.signature"
        :value="queryValue(entry.query)"
      >
        <template #actions>
          <button type="button" class="pg-btn" data-size="sm" @click="refetch(entry.name, entry.query)">
            refetch()
          </button>
        </template>
      </ComposableCard>

      <ComposableCard
        name="Mutation composables"
        signature="(options?) => {mutate, mutateAsync, reset, data, error, isLoading}"
        :value="mutationsValue"
      >
        <template #actions>
          <button
            type="button"
            class="pg-btn"
            data-size="sm"
            @click="call('useResourceMutation', () => touchGroups.mutateAsync('touch'))"
          >
            Invalidate groups
          </button>
        </template>
        <p class="pg-empty">
          Mutations write data, so they run from the admin components in Components. The custom
          <code>useResourceMutation</code> writes nothing and invalidates the group queries.
        </p>
      </ComposableCard>

      <EventLog />
    </div>
  </main>
</template>
