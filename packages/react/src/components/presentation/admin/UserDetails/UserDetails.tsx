// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {toManagementErrorMessage} from '@thunderid/browser';
import {FC, ReactElement} from 'react';
import BaseUserDetails, {BaseUserDetailsProps} from './BaseUserDetails';
import useDeleteUser from '../../../../hooks/users/useDeleteUser';
import useGetUser from '../../../../hooks/users/useGetUser';
import useGetUserGroups from '../../../../hooks/users/useGetUserGroups';
import useUpdateUser from '../../../../hooks/users/useUpdateUser';
import useTranslation from '../../../../hooks/useTranslation';

export type UserDetailsProps = Omit<
  BaseUserDetailsProps,
  'error' | 'groups' | 'isDeleting' | 'isLoading' | 'isUpdating' | 'onDelete' | 'onUpdate' | 'user'
> & {
  /**
   * Whether the user can be deleted from this view.
   * @default false
   */
  deletable?: boolean;
  /**
   * Whether the user's text attributes can be edited from this view.
   * @default false
   */
  editable?: boolean;
  /**
   * Called after the user has been deleted.
   */
  onDeleted?: () => void;
  userId: string;
};

/**
 * Shows a user and the groups they belong to, and optionally lets the signed-in user delete them.
 *
 * @example
 * ```tsx
 * <UserDetails userId={userId} deletable onDeleted={() => navigate('/users')} />
 * ```
 */
const UserDetails: FC<UserDetailsProps> = ({
  deletable = false,
  editable = false,
  onDeleted,
  preferences,
  userId,
  ...rest
}: UserDetailsProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const user = useGetUser(userId);
  const groups = useGetUserGroups(userId, {limit: 100});
  const deletion = useDeleteUser({onSuccess: onDeleted});
  const update = useUpdateUser();

  return (
    <BaseUserDetails
      user={user.data}
      groups={groups.data?.groups}
      isLoading={user.isLoading}
      error={
        toManagementErrorMessage(t, user.error, 'admin.users.details.error') ??
        toManagementErrorMessage(t, deletion.error, 'admin.users.details.delete.error') ??
        toManagementErrorMessage(t, update.error, 'admin.users.details.edit.error')
      }
      isDeleting={deletion.isLoading}
      onDelete={deletable ? (): void => void deletion.mutate(userId) : undefined}
      isUpdating={update.isLoading}
      onUpdate={
        editable && user.data
          ? (attributes: Record<string, unknown>): void =>
              void update.mutate({data: {attributes, ouId: user.data!.ouId, type: user.data!.type}, userId})
          : undefined
      }
      preferences={preferences}
      {...rest}
    />
  );
};

export default UserDetails;
