// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AdministrationMode,
  AgentListResponse,
  AgentQueryKeys,
  BasicAgent,
  Group,
  GroupListResponse,
  GroupQueryKeys,
  ManagedUser,
  ManagedUserListResponse,
  RoleAssigneeType,
  RoleAssignment,
  RoleAssignmentInput,
  RoleAssignmentListResponse,
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
import {FC, ReactElement, useMemo, useState} from 'react';
import BaseRoleAssignments, {BaseRoleAssignmentsProps} from './BaseRoleAssignments';
import useManagementEndpoint, {ManagementEndpoint} from '../../../hooks/management/useManagementEndpoint';
import useResourceMutation, {ResourceMutationResult} from '../../../hooks/management/useResourceMutation';
import useResourceQuery, {ResourceQueryResult} from '../../../hooks/management/useResourceQuery';
import useTranslation from '../../../hooks/useTranslation';
import {IdentityCandidate} from '../shared/IdentityPicker';

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

export type RoleAssignmentsProps = Omit<
  BaseRoleAssignmentsProps,
  | 'assignments'
  | 'candidates'
  | 'error'
  | 'isLoading'
  | 'isMutating'
  | 'onAssign'
  | 'onTypeFilterChange'
  | 'onUnassign'
  | 'typeFilter'
> & {
  /**
   * How an assignment is removed. `flow` runs the administration flow the server configures for it, which can revoke
   * grants and end sessions first. It needs `baseUrl`.
   * @default 'native'
   */
  administrationMode?: AdministrationMode;
  /**
   * Whether assignments can be added and removed from this view.
   * @default false
   */
  editable?: boolean;
  /**
   * Whether to show the assignee type filter, which narrows the list on the server.
   * @default true
   */
  filterable?: boolean;
  /**
   * Organization unit the users, groups and agents offered for assignment are listed from.
   */
  ouId?: string;
  roleId: string;
};

/**
 * Lists who holds a role, and lets the signed-in user assign it to users, groups and agents or
 * remove it from them.
 *
 * @example
 * ```tsx
 * <RoleAssignments roleId={roleId} />
 * ```
 */
const RoleAssignments: FC<RoleAssignmentsProps> = ({
  administrationMode,
  editable = false,
  filterable = true,
  ouId,
  preferences,
  roleId,
  ...rest
}: RoleAssignmentsProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const [typeFilter, setTypeFilter] = useState<RoleAssigneeType | null>(null);
  const rolesEndpoint: ManagementEndpoint = useManagementEndpoint('roles');
  const usersEndpoint: ManagementEndpoint = useManagementEndpoint('users');
  const groupsEndpoint: ManagementEndpoint = useManagementEndpoint('groups');
  const agentsEndpoint: ManagementEndpoint = useManagementEndpoint('agents');
  const type: RoleAssigneeType | undefined = typeFilter ?? undefined;
  const filter: string | undefined = toEqualityFilter('ouId', ouId);
  const assignments: ResourceQueryResult<RoleAssignmentListResponse> = useResourceQuery(
    [RoleQueryKeys.ROLE_ASSIGNMENTS, roleId, {limit: 100, type}],
    (fetcher) => getRoleAssignments({...rolesEndpoint, fetcher, limit: 100, roleId, type}),
    {enabled: Boolean(roleId)},
  );
  const users: ResourceQueryResult<FilteredPage<ManagedUserListResponse>> = useResourceQuery(
    [UserQueryKeys.USERS, {filter, limit: 100}],
    async (fetcher) => ({filter, page: await getUsers({...usersEndpoint, fetcher, filter, limit: 100})}),
    {enabled: editable},
  );
  const groups: ResourceQueryResult<FilteredPage<GroupListResponse>> = useResourceQuery(
    [GroupQueryKeys.GROUPS, {filter, limit: 100}],
    async (fetcher) => ({filter, page: await getGroups({...groupsEndpoint, fetcher, filter, limit: 100})}),
    {enabled: editable},
  );
  const agents: ResourceQueryResult<FilteredPage<AgentListResponse>> = useResourceQuery(
    [AgentQueryKeys.AGENTS, {filter, limit: 100}],
    async (fetcher) => ({filter, page: await getAgents({...agentsEndpoint, fetcher, filter, limit: 100})}),
    {enabled: editable},
  );
  const assign: ResourceMutationResult<void, RoleAssignmentsVariables> = useResourceMutation(
    ({assignments: changes, roleId: id}: RoleAssignmentsVariables, fetcher) =>
      addRoleAssignments({...rolesEndpoint, assignments: changes, fetcher, roleId: id}),
    () => [[RoleQueryKeys.ROLE_ASSIGNMENTS]],
  );
  const unassign: ResourceMutationResult<void, RoleAssignmentsVariables> = useResourceMutation(
    ({assignments: changes, roleId: id}: RoleAssignmentsVariables, fetcher) =>
      removeRoleAssignments({...rolesEndpoint, administrationMode, assignments: changes, fetcher, roleId: id}),
    () => [[RoleQueryKeys.ROLE_ASSIGNMENTS]],
  );

  const candidates: Partial<Record<'user' | 'group' | 'agent', IdentityCandidate[]>> = useMemo(() => {
    // A page listed for an earlier ouId stays in a query until the next one succeeds, so it is not offered.
    const current = <T,>(data: FilteredPage<T> | undefined): T | undefined =>
      data && data.filter === filter ? data.page : undefined;

    return {
      agent: (current(agents.data)?.agents ?? []).map((agent: BasicAgent) => ({
        id: agent.id,
        label: getAgentName(agent),
      })),
      group: (current(groups.data)?.groups ?? []).map((group: Group) => ({id: group.id, label: group.name})),
      user: (current(users.data)?.users ?? []).map((user: ManagedUser) => ({
        id: user.id,
        label: resolveManagedIdentityName(user),
      })),
    };
  }, [agents.data, filter, groups.data, users.data]);

  return (
    <BaseRoleAssignments
      assignments={assignments.data?.assignments ?? []}
      isLoading={assignments.isLoading}
      isMutating={assign.isLoading || unassign.isLoading}
      error={
        toManagementErrorMessage(t, assignments.error, 'admin.roles.assignments.error') ??
        toManagementErrorMessage(t, assign.error ?? unassign.error, 'admin.roles.assignments.update_error')
      }
      candidates={editable ? candidates : undefined}
      onAssign={
        editable
          ? (assignment: RoleAssignmentInput): void => void assign.mutate({assignments: [assignment], roleId})
          : undefined
      }
      onUnassign={
        editable
          ? (assignment: RoleAssignment): void =>
              void unassign.mutate({assignments: [{id: assignment.id, type: assignment.type}], roleId})
          : undefined
      }
      typeFilter={typeFilter}
      onTypeFilterChange={filterable ? setTypeFilter : undefined}
      preferences={preferences}
      {...rest}
    />
  );
};

export default RoleAssignments;
