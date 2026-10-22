// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  resolveManagedIdentityName,
  toManagementErrorMessage,
  BasicAgent,
  Group,
  ManagedUser,
  RoleAssigneeType,
  RoleAssignment,
  RoleAssignmentInput,
} from '@thunderid/browser';
import {FC, ReactElement, useMemo, useState} from 'react';
import BaseRoleAssignments, {BaseRoleAssignmentsProps} from './BaseRoleAssignments';
import useGetAgents from '../../../../hooks/agents/useGetAgents';
import useGetGroups from '../../../../hooks/groups/useGetGroups';
import useAddRoleAssignments from '../../../../hooks/roles/useAddRoleAssignments';
import useGetRoleAssignments from '../../../../hooks/roles/useGetRoleAssignments';
import useRemoveRoleAssignments from '../../../../hooks/roles/useRemoveRoleAssignments';
import useGetUsers from '../../../../hooks/users/useGetUsers';
import useTranslation from '../../../../hooks/useTranslation';
import {IdentityCandidate} from '../shared/IdentityPicker';

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
   * Whether assignments can be added and removed from this view.
   * @default false
   */
  editable?: boolean;
  /**
   * Whether to show the assignee type filter, which narrows the list on the server.
   * @default true
   */
  filterable?: boolean;
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
  editable = false,
  filterable = true,
  preferences,
  roleId,
  ...rest
}: RoleAssignmentsProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const [typeFilter, setTypeFilter] = useState<RoleAssigneeType | null>(null);
  const assignments = useGetRoleAssignments(roleId, {limit: 100, type: typeFilter ?? undefined});
  const users = useGetUsers({limit: 100}, {enabled: editable});
  const groups = useGetGroups({limit: 100}, {enabled: editable});
  const agents = useGetAgents({limit: 100}, {enabled: editable});
  const assign = useAddRoleAssignments();
  const unassign = useRemoveRoleAssignments();

  const candidates: Partial<Record<'user' | 'group' | 'agent', IdentityCandidate[]>> = useMemo(
    () => ({
      agent: (agents.data?.agents ?? []).map((agent: BasicAgent) => ({id: agent.id, label: agent.name})),
      group: (groups.data?.groups ?? []).map((group: Group) => ({id: group.id, label: group.name})),
      user: (users.data?.users ?? []).map((user: ManagedUser) => ({
        id: user.id,
        label: resolveManagedIdentityName(user),
      })),
    }),
    [agents.data, groups.data, users.data],
  );

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
