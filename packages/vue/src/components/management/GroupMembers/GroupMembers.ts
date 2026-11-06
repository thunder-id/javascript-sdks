// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AgentQueryKeys,
  GroupQueryKeys,
  RoleQueryKeys,
  UserQueryKeys,
  addGroupMembers,
  getAgentName,
  getAgents,
  getGroupMembers,
  getUsers,
  removeGroupMembers,
  resolveManagedIdentityName,
  toEqualityFilter,
  toManagementErrorMessage,
} from '@thunderid/browser';
import type {
  AdministrationMode,
  AgentListResponse,
  BasicAgent,
  Group,
  GroupMember,
  GroupMemberListResponse,
  ManagedUser,
  ManagedUserListResponse,
  Preferences,
  ResourceQueryKey,
} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';
import BaseGroupMembers from './BaseGroupMembers';
import useManagementEndpoint, {type ManagementEndpoint} from '../../../composables/management/useManagementEndpoint';
import useResourceMutation, {type ResourceMutationResult} from '../../../composables/management/useResourceMutation';
import useResourceQuery, {type ResourceQueryResult} from '../../../composables/management/useResourceQuery';
import type {IdentityCandidate} from '../shared/IdentityPicker';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

type GroupMembersProps = Readonly<{
  administrationMode: AdministrationMode | undefined;
  className: string;
  description: string | undefined;
  editable: boolean;
  groupId: string;
  ouId: string | undefined;
  preferences: Preferences | undefined;
  title: string | undefined;
}>;

interface GroupMembersVariables {
  groupId: string;
  members: Pick<GroupMember, 'id' | 'type'>[];
}

/**
 * A candidate page with the filter it was listed with.
 */
interface FilteredPage<T> {
  filter: string | undefined;
  page: T;
}

/**
 * Lists a group's members and, unless `editable` is `false`, lets the signed-in user add users and
 * agents to it or remove members.
 *
 * @example
 * ```vue
 * <GroupMembers :group-id="groupId" />
 * ```
 */
const GroupMembers: Component = defineComponent({
  name: 'GroupMembers',
  props: {
    /**
     * How a member is removed. `flow` runs the administration flow the server configures for it, which can revoke
     * grants and end sessions first. It needs `baseUrl`. Defaults to `native`.
     */
    administrationMode: {default: undefined, type: String as PropType<AdministrationMode>},
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** Text shown under the title. */
    description: {default: undefined, type: String},
    /** Whether members can be added and removed. */
    editable: {default: false, type: Boolean},
    /** Identifier of the group. */
    groupId: {required: true, type: String},
    /**
     * Organization unit the users and agents offered for adding are listed from.
     */
    ouId: {default: undefined, type: String},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    /** Heading of the section. Pass an empty string to hide it. */
    title: {default: undefined, type: String},
  },
  setup(props: GroupMembersProps, {slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const groupsEndpoint: ManagementEndpoint = useManagementEndpoint('groups');
    const usersEndpoint: ManagementEndpoint = useManagementEndpoint('users');
    const agentsEndpoint: ManagementEndpoint = useManagementEndpoint('agents');
    const editable = (): boolean => props.editable;
    // Membership changes the roles a member inherits, so role assignment lists are refetched too.
    const invalidatedByMembership = ({groupId}: GroupMembersVariables): ResourceQueryKey[] => [
      [GroupQueryKeys.GROUP, groupId],
      [GroupQueryKeys.GROUP_MEMBERS, groupId],
      [GroupQueryKeys.MEMBERSHIPS],
      [RoleQueryKeys.ROLE_ASSIGNMENTS],
    ];
    const members: ResourceQueryResult<GroupMemberListResponse> = useResourceQuery(
      () => [GroupQueryKeys.GROUP_MEMBERS, props.groupId, {limit: 100}],
      (fetcher) => getGroupMembers({...groupsEndpoint, fetcher, groupId: props.groupId, limit: 100}),
      {enabled: () => Boolean(props.groupId)},
    );
    const filter = (): string | undefined => toEqualityFilter('ouId', props.ouId);
    const users: ResourceQueryResult<FilteredPage<ManagedUserListResponse>> = useResourceQuery(
      () => [UserQueryKeys.USERS, {filter: filter(), limit: 100}],
      async (fetcher) => {
        const listed: string | undefined = filter();

        return {filter: listed, page: await getUsers({...usersEndpoint, fetcher, filter: listed, limit: 100})};
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
    const add: ResourceMutationResult<Group, GroupMembersVariables> = useResourceMutation(
      ({groupId, members: added}: GroupMembersVariables, fetcher) =>
        addGroupMembers({...groupsEndpoint, fetcher, groupId, members: added}),
      invalidatedByMembership,
    );
    const remove: ResourceMutationResult<Group, GroupMembersVariables> = useResourceMutation(
      ({groupId, members: removed}: GroupMembersVariables, fetcher) =>
        removeGroupMembers({
          ...groupsEndpoint,
          administrationMode: props.administrationMode,
          fetcher,
          groupId,
          members: removed,
        }),
      invalidatedByMembership,
    );

    // A page listed for an earlier ouId stays in a query until the next one succeeds, so it is not offered.
    const current = <T>(data: FilteredPage<T> | undefined): T | undefined =>
      data && data.filter === filter() ? data.page : undefined;

    return (): VNode => {
      const candidates: Partial<Record<'user' | 'agent', IdentityCandidate[]>> = {
        agent: (current(agents.data.value)?.agents ?? []).map((agent: BasicAgent) => ({
          id: agent.id,
          label: getAgentName(agent),
        })),
        user: (current(users.data.value)?.users ?? []).map((user: ManagedUser) => ({
          id: user.id,
          label: resolveManagedIdentityName(user),
        })),
      };

      return h(
        BaseGroupMembers,
        {
          candidates: props.editable ? candidates : undefined,
          className: props.className,
          description: props.description,
          error:
            toManagementErrorMessage(t, members.error.value, 'admin.groups.members.error') ??
            toManagementErrorMessage(t, add.error.value ?? remove.error.value, 'admin.groups.members.update_error'),
          isLoading: members.isLoading.value,
          isMutating: add.isLoading.value || remove.isLoading.value,
          members: members.data.value?.members ?? [],
          onAdd: props.editable
            ? (member: Pick<GroupMember, 'id' | 'type'>): void =>
                void add.mutate({groupId: props.groupId, members: [member]})
            : undefined,
          onRemove: props.editable
            ? (member: GroupMember): void =>
                void remove.mutate({groupId: props.groupId, members: [{id: member.id, type: member.type}]})
            : undefined,
          preferences: props.preferences,
          title: props.title,
        },
        {...slots},
      );
    };
  },
});

export default GroupMembers;
