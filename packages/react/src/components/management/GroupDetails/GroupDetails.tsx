// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AdministrationMode,
  Group,
  GroupQueryKeys,
  RoleQueryKeys,
  deleteGroup,
  getGroup,
  toManagementErrorMessage,
} from '@thunderid/browser';
import {FC, ReactElement} from 'react';
import BaseGroupDetails, {BaseGroupDetailsProps} from './BaseGroupDetails';
import useManagementEndpoint, {ManagementEndpoint} from '../../../hooks/management/useManagementEndpoint';
import useResourceMutation, {ResourceMutationResult} from '../../../hooks/management/useResourceMutation';
import useResourceQuery, {ResourceQueryResult} from '../../../hooks/management/useResourceQuery';
import useTranslation from '../../../hooks/useTranslation';
import GroupMembers from '../GroupMembers/GroupMembers';

export type GroupDetailsProps = Omit<
  BaseGroupDetailsProps,
  'error' | 'group' | 'isDeleting' | 'isLoading' | 'members' | 'onDelete'
> & {
  /**
   * How the group is deleted and a member removed. `flow` runs the administration flow the server configures for it,
   * which can revoke grants and end sessions first. It needs `baseUrl`.
   * @default 'native'
   */
  administrationMode?: AdministrationMode;
  /**
   * Whether the group can be deleted from this view.
   * @default false
   */
  deletable?: boolean;
  /**
   * Whether members can be added and removed from this view.
   * @default false
   */
  editable?: boolean;
  groupId: string;
  /**
   * Called after the group has been deleted.
   */
  onDeleted?: () => void;
};

/**
 * Shows a group with its members, and lets the signed-in user manage the members and delete the group.
 *
 * @example
 * ```tsx
 * <GroupDetails groupId={groupId} editable deletable onDeleted={() => navigate('/groups')} />
 * ```
 */
const GroupDetails: FC<GroupDetailsProps> = ({
  administrationMode,
  deletable = false,
  editable = false,
  groupId,
  onDeleted,
  preferences,
  ...rest
}: GroupDetailsProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const endpoint: ManagementEndpoint = useManagementEndpoint('groups');
  const group: ResourceQueryResult<Group> = useResourceQuery(
    [GroupQueryKeys.GROUP, groupId],
    (fetcher) => getGroup({...endpoint, fetcher, groupId}),
    {enabled: Boolean(groupId)},
  );
  const deletion: ResourceMutationResult<void, string> = useResourceMutation(
    (id: string, fetcher) => deleteGroup({...endpoint, administrationMode, fetcher, groupId: id}),
    () => [[GroupQueryKeys.GROUPS], [GroupQueryKeys.MEMBERSHIPS], [RoleQueryKeys.ROLE_ASSIGNMENTS]],
    {onSuccess: onDeleted},
  );

  return (
    <BaseGroupDetails
      group={group.data}
      isLoading={group.isLoading}
      error={
        toManagementErrorMessage(t, group.error, 'admin.groups.details.error') ??
        toManagementErrorMessage(t, deletion.error, 'admin.groups.details.delete.error')
      }
      isDeleting={deletion.isLoading}
      onDelete={deletable ? (): void => void deletion.mutate(groupId) : undefined}
      members={
        group.data && (
          // Adding waits for the group, so the candidates are only ever listed from its organization unit.
          <GroupMembers
            groupId={groupId}
            ouId={group.data.ouId}
            editable={editable}
            administrationMode={administrationMode}
          />
        )
      }
      preferences={preferences}
      {...rest}
    />
  );
};

export default GroupDetails;
