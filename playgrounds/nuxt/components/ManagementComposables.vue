<script setup lang="ts">
// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {toManagementErrorMessage} from '@thunderid/browser';
import {useManagementEndpoint, type ManagementEndpointKey} from '@thunderid/vue';
import {computed, type ComputedRef} from 'vue';
import {
  useCreateGroup,
  useGetAgentGroups,
  useGetAgentRoles,
  useGetAgents,
  useGetAgentTypes,
  useGetGroupMembers,
  useGetGroups,
  useGetRoleAssignments,
  useGetRoles,
  useGetUserGroups,
  useGetUsers,
  useGetUserTypes,
  useGrantedPermissions,
  useRuntimeConfig,
  useThunderID,
  useThunderIDI18n,
} from '#imports';
import {describeManagementError, MANAGEMENT_COLLECTIONS, MANAGEMENT_ROUTE} from '~/lib/management';

// Every composable below is auto-imported by the module (thunderid.management) and fetches through
// http.fetcher, which posts to /api/auth/management. Without a session each query ends in a 401 error.
const {isSignedIn} = useThunderID();
const {t} = useThunderIDI18n();
const clientId: string | undefined = (useRuntimeConfig().public.thunderid as {clientId?: string}).clientId;

const permissions = useGrantedPermissions();
const groups = useGetGroups({limit: 5});
const roles = useGetRoles({limit: 5});
const users = useGetUsers({limit: 5});
const agents = useGetAgents({limit: 5});
const agentTypes = useGetAgentTypes({limit: 5});
const userTypes = useGetUserTypes({limit: 5});

// The sub-resource composables wait for an identifier, so they start once the first page has one.
const firstGroupId: ComputedRef<string | undefined> = computed(() => groups.data.value?.groups[0]?.id);
const firstRoleId: ComputedRef<string | undefined> = computed(() => roles.data.value?.roles[0]?.id);
const firstUserId: ComputedRef<string | undefined> = computed(() => users.data.value?.users[0]?.id);
const firstAgentId: ComputedRef<string | undefined> = computed(() => agents.data.value?.agents[0]?.id);

const groupMembers = useGetGroupMembers(firstGroupId);
const roleAssignments = useGetRoleAssignments(firstRoleId);
const userGroups = useGetUserGroups(firstUserId);
const agentGroups = useGetAgentGroups(firstAgentId);
const agentRoles = useGetAgentRoles(firstAgentId);

// A mutation is shown, not run: it would write to the directory.
const createGroup = useCreateGroup();

const endpoints: Record<string, unknown> = Object.fromEntries(
  MANAGEMENT_COLLECTIONS.map(({key}: {key: ManagementEndpointKey}) => [key, useManagementEndpoint(key)]),
);

interface QueryState {
  data: {value: unknown};
  error: {value: Error | null};
  isLoading: {value: boolean};
  refetch: () => Promise<unknown>;
}

/** Shows a query with its error explained, and the translated message the admin components would show. */
const view = (query: QueryState, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  ...extra,
  data: query.data.value,
  error: query.error.value
    ? {
        reason: describeManagementError(query.error.value, clientId),
        shownByComponents: toManagementErrorMessage(t, query.error.value, 'admin.groups.list.error'),
      }
    : null,
  isLoading: query.isLoading.value,
  refetch: query.refetch,
});

const permissionsValue: ComputedRef<Record<string, unknown>> = computed(() => ({
  "can('system:group:view')": permissions.can('system:group:view'),
  "can('system:role:view')": permissions.can('system:role:view'),
  "can('system:user')": permissions.can('system:user'),
  isLoading: permissions.isLoading.value,
  permissions: permissions.permissions.value,
}));

const queries: ComputedRef<{name: string; signature: string; value: Record<string, unknown>}[]> = computed(() => [
  {name: 'useGetGroups({limit: 5})', signature: 'ResourceQueryResult<GroupListResponse>', value: view(groups)},
  {
    name: 'useGetGroupMembers(groupId)',
    signature: 'members of the first group; waits for an id',
    value: view(groupMembers, {groupId: firstGroupId.value ?? null}),
  },
  {name: 'useGetRoles({limit: 5})', signature: 'ResourceQueryResult<RoleListResponse>', value: view(roles)},
  {
    name: 'useGetRoleAssignments(roleId)',
    signature: 'assignments of the first role; waits for an id',
    value: view(roleAssignments, {roleId: firstRoleId.value ?? null}),
  },
  {name: 'useGetUserTypes({limit: 5})', signature: 'endpoints.userTypes', value: view(userTypes)},
  {
    name: 'useGetUserGroups(userId)',
    signature: 'groups of the first user (endpoints.users); waits for an id',
    value: view(userGroups, {userId: firstUserId.value ?? null}),
  },
  {name: 'useGetAgentTypes({limit: 5})', signature: 'endpoints.agentTypes', value: view(agentTypes)},
  {
    name: 'useGetAgentGroups(agentId)',
    signature: 'groups of the first agent; waits for an id',
    value: view(agentGroups, {agentId: firstAgentId.value ?? null}),
  },
  {
    name: 'useGetAgentRoles(agentId)',
    signature: 'roles of the first agent; waits for an id',
    value: view(agentRoles, {agentId: firstAgentId.value ?? null}),
  },
]);

const mutationValue: ComputedRef<Record<string, unknown>> = computed(() => ({
  data: createGroup.data.value,
  error: createGroup.error.value?.message ?? null,
  isLoading: createGroup.isLoading.value,
  mutate: createGroup.mutate,
  mutateAsync: createGroup.mutateAsync,
  reset: createGroup.reset,
}));
</script>

<template>
  <div class="pg-heading">
    <div>
      <h2>Management composables</h2>
      <p>
        Auto-imported with <code>thunderid.management</code>. Each one fetches through <code>http.fetcher</code>, which
        posts to <code>{{ MANAGEMENT_ROUTE }}</code
        >; the server adds the session's access token.
        {{ isSignedIn ? '' : 'Not signed in: every query ends in an HTTP 401 error from that route.' }}
      </p>
    </div>
  </div>
  <div class="pg-grid-2">
    <ComposableCard
      name="useGrantedPermissions()"
      signature="{permissions, isLoading, can(required)}: read from the access token, not verified"
      :value="permissionsValue"
    >
      <p v-if="!isSignedIn" class="pg-empty">No session: permissions stay [] and can() is false.</p>
    </ComposableCard>
    <ComposableCard
      name="useManagementEndpoint(key)"
      signature="{baseUrl, url}: url is the endpoints override, else undefined for {baseUrl}/{collection}"
      :value="endpoints"
    />
    <ComposableCard
      v-for="query in queries"
      :key="query.name"
      :name="query.name"
      :signature="query.signature"
      :value="query.value"
    >
      <template #actions>
        <button type="button" class="pg-btn" data-size="sm" @click="(query.value.refetch as () => Promise<unknown>)()">
          refetch()
        </button>
      </template>
    </ComposableCard>
    <ComposableCard
      name="useCreateGroup()"
      signature="ResourceMutationResult: mutate({name, ouId}) invalidates useGetGroups; not run here, it writes data"
      :value="mutationValue"
    />
  </div>
</template>
