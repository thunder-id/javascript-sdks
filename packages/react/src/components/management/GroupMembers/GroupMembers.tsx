// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AdministrationMode,
  AgentListResponse,
  AgentQueryKeys,
  BasicAgent,
  Group,
  GroupMember,
  GroupMemberListResponse,
  GroupQueryKeys,
  ManagedUser,
  ManagedUserListResponse,
  ResourceQueryKey,
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
import {FC, ReactElement, useMemo} from 'react';
import BaseGroupMembers, {BaseGroupMembersProps} from './BaseGroupMembers';
import useManagementEndpoint, {ManagementEndpoint} from '../../../hooks/management/useManagementEndpoint';
import useResourceMutation, {ResourceMutationResult} from '../../../hooks/management/useResourceMutation';
import useResourceQuery, {ResourceQueryResult} from '../../../hooks/management/useResourceQuery';
import useTranslation from '../../../hooks/useTranslation';
import {IdentityCandidate} from '../shared/IdentityPicker';

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
 * Query keys to refetch after a group's membership changes.
 */
const getMembershipInvalidatedKeys = ({groupId}: GroupMembersVariables): ResourceQueryKey[] => [
  [GroupQueryKeys.GROUP, groupId],
  [GroupQueryKeys.GROUP_MEMBERS, groupId],
  [GroupQueryKeys.MEMBERSHIPS],
  [RoleQueryKeys.ROLE_ASSIGNMENTS],
];

export type GroupMembersProps = Omit<
  BaseGroupMembersProps,
  'candidates' | 'error' | 'isLoading' | 'isMutating' | 'members' | 'onAdd' | 'onRemove'
> & {
  /**
   * How a member is removed. `flow` runs the administration flow the server configures for it, which can revoke
   * grants and end sessions first. It needs `baseUrl`.
   * @default 'native'
   */
  administrationMode?: AdministrationMode;
  /**
   * Whether members can be added and removed from this view.
   * @default false
   */
  editable?: boolean;
  groupId: string;
  /**
   * Organization unit the users and agents offered for adding are listed from.
   */
  ouId?: string;
};

/**
 * Lists the users and agents in a group, and lets the signed-in user add and remove them.
 *
 * @example
 * ```tsx
 * <GroupMembers groupId={groupId} />
 * ```
 */
const GroupMembers: FC<GroupMembersProps> = ({
  administrationMode,
  editable = false,
  groupId,
  ouId,
  preferences,
  ...rest
}: GroupMembersProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const groupsEndpoint: ManagementEndpoint = useManagementEndpoint('groups');
  const usersEndpoint: ManagementEndpoint = useManagementEndpoint('users');
  const agentsEndpoint: ManagementEndpoint = useManagementEndpoint('agents');
  const filter: string | undefined = toEqualityFilter('ouId', ouId);
  const members: ResourceQueryResult<GroupMemberListResponse> = useResourceQuery(
    [GroupQueryKeys.GROUP_MEMBERS, groupId, {limit: 100}],
    (fetcher) => getGroupMembers({...groupsEndpoint, fetcher, groupId, limit: 100}),
    {enabled: Boolean(groupId)},
  );
  const users: ResourceQueryResult<FilteredPage<ManagedUserListResponse>> = useResourceQuery(
    [UserQueryKeys.USERS, {filter, limit: 100}],
    async (fetcher) => ({filter, page: await getUsers({...usersEndpoint, fetcher, filter, limit: 100})}),
    {enabled: editable},
  );
  const agents: ResourceQueryResult<FilteredPage<AgentListResponse>> = useResourceQuery(
    [AgentQueryKeys.AGENTS, {filter, limit: 100}],
    async (fetcher) => ({filter, page: await getAgents({...agentsEndpoint, fetcher, filter, limit: 100})}),
    {enabled: editable},
  );
  const add: ResourceMutationResult<Group, GroupMembersVariables> = useResourceMutation(
    ({groupId: id, members: changes}: GroupMembersVariables, fetcher) =>
      addGroupMembers({...groupsEndpoint, fetcher, groupId: id, members: changes}),
    getMembershipInvalidatedKeys,
  );
  const remove: ResourceMutationResult<Group, GroupMembersVariables> = useResourceMutation(
    ({groupId: id, members: changes}: GroupMembersVariables, fetcher) =>
      removeGroupMembers({...groupsEndpoint, administrationMode, fetcher, groupId: id, members: changes}),
    getMembershipInvalidatedKeys,
  );

  const candidates: Partial<Record<'user' | 'agent', IdentityCandidate[]>> = useMemo(() => {
    // A page listed for an earlier ouId stays in a query until the next one succeeds, so it is not offered.
    const current = <T,>(data: FilteredPage<T> | undefined): T | undefined =>
      data && data.filter === filter ? data.page : undefined;

    return {
      agent: (current(agents.data)?.agents ?? []).map((agent: BasicAgent) => ({
        id: agent.id,
        label: getAgentName(agent),
      })),
      user: (current(users.data)?.users ?? []).map((user: ManagedUser) => ({
        id: user.id,
        label: resolveManagedIdentityName(user),
      })),
    };
  }, [agents.data, filter, users.data]);

  return (
    <BaseGroupMembers
      members={members.data?.members ?? []}
      isLoading={members.isLoading}
      isMutating={add.isLoading || remove.isLoading}
      error={
        toManagementErrorMessage(t, members.error, 'admin.groups.members.error') ??
        toManagementErrorMessage(t, add.error ?? remove.error, 'admin.groups.members.update_error')
      }
      candidates={editable ? candidates : undefined}
      onAdd={
        editable
          ? (member: Pick<GroupMember, 'id' | 'type'>): void => void add.mutate({groupId, members: [member]})
          : undefined
      }
      onRemove={
        editable
          ? (member: GroupMember): void => void remove.mutate({groupId, members: [{id: member.id, type: member.type}]})
          : undefined
      }
      preferences={preferences}
      {...rest}
    />
  );
};

export default GroupMembers;
