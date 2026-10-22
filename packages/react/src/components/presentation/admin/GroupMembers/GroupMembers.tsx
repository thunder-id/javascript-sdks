// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  resolveManagedIdentityName,
  toManagementErrorMessage,
  BasicAgent,
  GroupMember,
  ManagedUser,
} from '@thunderid/browser';
import {FC, ReactElement, useMemo} from 'react';
import BaseGroupMembers, {BaseGroupMembersProps} from './BaseGroupMembers';
import useGetAgents from '../../../../hooks/agents/useGetAgents';
import useAddGroupMembers from '../../../../hooks/groups/useAddGroupMembers';
import useGetGroupMembers from '../../../../hooks/groups/useGetGroupMembers';
import useRemoveGroupMembers from '../../../../hooks/groups/useRemoveGroupMembers';
import useGetUsers from '../../../../hooks/users/useGetUsers';
import useTranslation from '../../../../hooks/useTranslation';
import {IdentityCandidate} from '../shared/IdentityPicker';

export type GroupMembersProps = Omit<
  BaseGroupMembersProps,
  'candidates' | 'error' | 'isLoading' | 'isMutating' | 'members' | 'onAdd' | 'onRemove'
> & {
  /**
   * Whether members can be added and removed from this view.
   * @default false
   */
  editable?: boolean;
  groupId: string;
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
  editable = false,
  groupId,
  preferences,
  ...rest
}: GroupMembersProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const members = useGetGroupMembers(groupId, {limit: 100});
  const users = useGetUsers({limit: 100}, {enabled: editable});
  const agents = useGetAgents({limit: 100}, {enabled: editable});
  const add = useAddGroupMembers();
  const remove = useRemoveGroupMembers();

  const candidates: Partial<Record<'user' | 'agent', IdentityCandidate[]>> = useMemo(
    () => ({
      agent: (agents.data?.agents ?? []).map((agent: BasicAgent) => ({id: agent.id, label: agent.name})),
      user: (users.data?.users ?? []).map((user: ManagedUser) => ({
        id: user.id,
        label: resolveManagedIdentityName(user),
      })),
    }),
    [agents.data, users.data],
  );

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
