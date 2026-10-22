// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {toManagementErrorMessage, ManagedUser, ManagedUserType, SelectOption} from '@thunderid/browser';
import {FC, ReactElement, useMemo} from 'react';
import BaseUserCreate, {BaseUserCreateProps, UserCreateSubmission} from './BaseUserCreate';
import useCreateUser from '../../../../hooks/users/useCreateUser';
import useGetUserTypes from '../../../../hooks/users/useGetUserTypes';
import useTranslation from '../../../../hooks/useTranslation';
import InviteUser, {InviteUserProps} from '../../auth/InviteUser/InviteUser';
import useDefaultOuId from '../shared/useDefaultOuId';

export type UserCreateProps = Omit<BaseUserCreateProps, 'error' | 'isSubmitting' | 'onSubmit' | 'userTypes'> & {
  /**
   * Props passed to `InviteUser` when `mode` is `invite`.
   */
  inviteProps?: InviteUserProps;
  /**
   * How the user is added.
   * - `api` creates the user directly through the management API.
   * - `invite` runs the invite user flow, which asks the person to finish setting up their account.
   *   Only available where flows run.
   * @default 'api'
   */
  mode?: 'api' | 'invite';
  /**
   * Called with the created user. Not called in `invite` mode, where the flow reports progress
   * through `inviteProps.onFlowChange`.
   */
  onCreated?: (user: ManagedUser) => void;
  /**
   * Organization unit the user is created in. Defaults to the signed-in user's organization unit.
   */
  ouId?: string;
};

/**
 * Adds a user, either directly through the management API or by inviting them through the invite
 * user flow.
 *
 * @example
 * ```tsx
 * <UserCreate onCreated={(user) => navigate(`/users/${user.id}`)} />
 * <UserCreate mode="invite" />
 * ```
 */
const UserCreate: FC<UserCreateProps> = ({
  inviteProps,
  mode = 'api',
  onCreated,
  ouId,
  preferences,
  ...rest
}: UserCreateProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const resolvedOuId: string | undefined = useDefaultOuId(ouId);
  const {data: userTypes} = useGetUserTypes({limit: 100}, {enabled: mode === 'api'});
  const {error, isLoading, mutate} = useCreateUser({onSuccess: onCreated});

  const options: SelectOption[] = useMemo(
    () =>
      (userTypes?.types ?? []).map((userType: ManagedUserType) => ({
        label: userType.displayName ?? userType.handle,
        value: userType.handle,
      })),
    [userTypes],
  );

  if (mode === 'invite') {
    return <InviteUser {...inviteProps} />;
  }

  const handleSubmit = ({attributes, type}: UserCreateSubmission): void => {
    if (!resolvedOuId) {
      return;
    }

    void mutate({attributes, ouId: resolvedOuId, type});
  };

  return (
    <BaseUserCreate
      userTypes={options}
      onSubmit={handleSubmit}
      isSubmitting={isLoading}
      error={
        resolvedOuId ? toManagementErrorMessage(t, error, 'admin.users.create.error') : t('admin.common.errors.no_ou')
      }
      preferences={preferences}
      {...rest}
    />
  );
};

export default UserCreate;
