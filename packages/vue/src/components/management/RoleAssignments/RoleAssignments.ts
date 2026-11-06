// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AgentQueryKeys,
  GroupQueryKeys,
  RoleQueryKeys,
  UserQueryKeys,
  addRoleAssignments,
  getAgentName,
  getAgents,
  getGroups,
  getRoleAssignments,
  getUsers,
  removeRoleAssignments,
  resolveManagedIdentityName,
  toEqualityFilter,
  toManagementErrorMessage,
} from '@thunderid/browser';
import type {
  AdministrationMode,
  AgentListResponse,
  BasicAgent,
  Group,
  GroupListResponse,
  ManagedUser,
  ManagedUserListResponse,
  Preferences,
  RoleAssigneeType,
  RoleAssignment,
  RoleAssignmentInput,
  RoleAssignmentListResponse,
} from '@thunderid/browser';
import {type Component, type PropType, type Ref, type SetupContext, type VNode, defineComponent, h, ref} from 'vue';
import BaseRoleAssignments from './BaseRoleAssignments';
import useManagementEndpoint, {type ManagementEndpoint} from '../../../composables/management/useManagementEndpoint';
import useResourceMutation, {type ResourceMutationResult} from '../../../composables/management/useResourceMutation';
import useResourceQuery, {type ResourceQueryResult} from '../../../composables/management/useResourceQuery';
import type {IdentityCandidate} from '../shared/IdentityPicker';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

type RoleAssignmentsProps = Readonly<{
  administrationMode: AdministrationMode | undefined;
  className: string;
  description: string | undefined;
  editable: boolean;
  filterable: boolean;
  ouId: string | undefined;
  preferences: Preferences | undefined;
  roleId: string;
  title: string | undefined;
}>;

interface RoleAssignmentsVariables {
  assignments: RoleAssignmentInput[];
  roleId: string;
}

/**
 * A candidate page with the filter it was listed with.
 */
interface FilteredPage<T> {
  filter: string | undefined;
  page: T;
}

/**
 * Lists who a role is assigned to and, unless `editable` is `false`, lets the signed-in user assign it
 * to users, groups and agents or remove assignments.
 *
 * @example
 * ```vue
 * <RoleAssignments :role-id="roleId" />
 * ```
 */
const RoleAssignments: Component = defineComponent({
  name: 'RoleAssignments',
  props: {
    /**
     * How an assignment is removed. `flow` runs the administration flow the server configures for it, which can revoke
     * grants and end sessions first. It needs `baseUrl`. Defaults to `native`.
     */
    administrationMode: {default: undefined, type: String as PropType<AdministrationMode>},
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** Text shown under the title. */
    description: {default: undefined, type: String},
    /** Whether assignments can be added and removed. */
    editable: {default: false, type: Boolean},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    /** Whether to show the assignee type filter, which narrows the list on the server. */
    filterable: {default: true, type: Boolean},
    /**
     * Organization unit the users, groups and agents offered for assignment are listed from.
     */
    ouId: {default: undefined, type: String},
    /** Identifier of the role. */
    roleId: {required: true, type: String},
    /** Heading of the section. Pass an empty string to hide it. */
    title: {default: undefined, type: String},
  },
  setup(props: RoleAssignmentsProps, {slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const typeFilter: Ref<RoleAssigneeType | null> = ref(null);
    const rolesEndpoint: ManagementEndpoint = useManagementEndpoint('roles');
    const usersEndpoint: ManagementEndpoint = useManagementEndpoint('users');
    const groupsEndpoint: ManagementEndpoint = useManagementEndpoint('groups');
    const agentsEndpoint: ManagementEndpoint = useManagementEndpoint('agents');
    const assignments: ResourceQueryResult<RoleAssignmentListResponse> = useResourceQuery(
      () => [RoleQueryKeys.ROLE_ASSIGNMENTS, props.roleId, {limit: 100, type: typeFilter.value ?? undefined}],
      (fetcher) =>
        getRoleAssignments({
          ...rolesEndpoint,
          fetcher,
          limit: 100,
          roleId: props.roleId,
          type: typeFilter.value ?? undefined,
        }),
      {enabled: () => Boolean(props.roleId)},
    );
    const editable = (): boolean => props.editable;
    const filter = (): string | undefined => toEqualityFilter('ouId', props.ouId);
    const users: ResourceQueryResult<FilteredPage<ManagedUserListResponse>> = useResourceQuery(
      () => [UserQueryKeys.USERS, {filter: filter(), limit: 100}],
      async (fetcher) => {
        const listed: string | undefined = filter();

        return {filter: listed, page: await getUsers({...usersEndpoint, fetcher, filter: listed, limit: 100})};
      },
      {enabled: editable},
    );
    const groups: ResourceQueryResult<FilteredPage<GroupListResponse>> = useResourceQuery(
      () => [GroupQueryKeys.GROUPS, {filter: filter(), limit: 100}],
      async (fetcher) => {
        const listed: string | undefined = filter();

        return {filter: listed, page: await getGroups({...groupsEndpoint, fetcher, filter: listed, limit: 100})};
      },
      {enabled: editable},
    );
    const agents: ResourceQueryResult<FilteredPage<AgentListResponse>> = useResourceQuery(
      () => [AgentQueryKeys.AGENTS, {filter: filter(), limit: 100}],
      async (fetcher) => {
        const listed: string | undefined = filter();

        return {filter: listed, page: await getAgents({...agentsEndpoint, fetcher, filter: listed, limit: 100})};
      },
      {enabled: editable},
    );
    // Every mounted assignment list is refetched, including the roles listed for an agent.
    const assign: ResourceMutationResult<void, RoleAssignmentsVariables> = useResourceMutation(
      ({roleId, assignments: added}: RoleAssignmentsVariables, fetcher) =>
        addRoleAssignments({...rolesEndpoint, assignments: added, fetcher, roleId}),
      () => [[RoleQueryKeys.ROLE_ASSIGNMENTS]],
    );
    const unassign: ResourceMutationResult<void, RoleAssignmentsVariables> = useResourceMutation(
      ({roleId, assignments: removed}: RoleAssignmentsVariables, fetcher) =>
        removeRoleAssignments({
          ...rolesEndpoint,
          administrationMode: props.administrationMode,
          assignments: removed,
          fetcher,
          roleId,
        }),
      () => [[RoleQueryKeys.ROLE_ASSIGNMENTS]],
    );

    // A page listed for an earlier ouId stays in a query until the next one succeeds, so it is not offered.
    const current = <T>(data: FilteredPage<T> | undefined): T | undefined =>
      data && data.filter === filter() ? data.page : undefined;

    return (): VNode => {
      const candidates: Partial<Record<'user' | 'group' | 'agent', IdentityCandidate[]>> = {
        agent: (current(agents.data.value)?.agents ?? []).map((agent: BasicAgent) => ({
          id: agent.id,
          label: getAgentName(agent),
        })),
        group: (current(groups.data.value)?.groups ?? []).map((group: Group) => ({id: group.id, label: group.name})),
        user: (current(users.data.value)?.users ?? []).map((user: ManagedUser) => ({
          id: user.id,
          label: resolveManagedIdentityName(user),
        })),
      };

      return h(
        BaseRoleAssignments,
        {
          assignments: assignments.data.value?.assignments ?? [],
          candidates: props.editable ? candidates : undefined,
          className: props.className,
          description: props.description,
          error:
            toManagementErrorMessage(t, assignments.error.value, 'admin.roles.assignments.error') ??
            toManagementErrorMessage(
              t,
              assign.error.value ?? unassign.error.value,
              'admin.roles.assignments.update_error',
            ),
          isLoading: assignments.isLoading.value,
          isMutating: assign.isLoading.value || unassign.isLoading.value,
          onAssign: props.editable
            ? (assignment: RoleAssignmentInput): void =>
                void assign.mutate({assignments: [assignment], roleId: props.roleId})
            : undefined,
          onUnassign: props.editable
            ? (assignment: RoleAssignment): void =>
                void unassign.mutate({
                  assignments: [{id: assignment.id, type: assignment.type}],
                  roleId: props.roleId,
                })
            : undefined,
          onTypeFilterChange: props.filterable
            ? (type: RoleAssigneeType | null): void => {
                typeFilter.value = type;
              }
            : undefined,
          preferences: props.preferences,
          title: props.title,
          typeFilter: typeFilter.value,
        },
        {...slots},
      );
    };
  },
});

export default RoleAssignments;
