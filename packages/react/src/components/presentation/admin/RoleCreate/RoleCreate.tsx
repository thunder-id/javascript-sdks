// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {toManagementErrorMessage, Role} from '@thunderid/browser';
import {FC, ReactElement} from 'react';
import BaseRoleCreate, {BaseRoleCreateProps, RoleCreateSubmission} from './BaseRoleCreate';
import useCreateRole from '../../../../hooks/roles/useCreateRole';
import useTranslation from '../../../../hooks/useTranslation';
import useDefaultOuId from '../shared/useDefaultOuId';

export type RoleCreateProps = Omit<BaseRoleCreateProps, 'error' | 'isSubmitting' | 'onSubmit'> & {
  /**
   * Called with the created role.
   */
  onCreated?: (role: Role) => void;
  /**
   * Organization unit the role is created in. Defaults to the signed-in user's organization unit.
   */
  ouId?: string;
};

/**
 * Creates a role through the management API.
 *
 * @example
 * ```tsx
 * <RoleCreate onCreated={(role) => navigate(`/roles/${role.id}`)} />
 * ```
 */
const RoleCreate: FC<RoleCreateProps> = ({onCreated, ouId, preferences, ...rest}: RoleCreateProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const resolvedOuId: string | undefined = useDefaultOuId(ouId);
  const {error, isLoading, mutate} = useCreateRole({onSuccess: onCreated});

  const handleSubmit = ({description, name}: RoleCreateSubmission): void => {
    if (resolvedOuId) {
      void mutate({description, name, ouId: resolvedOuId});
    }
  };

  return (
    <BaseRoleCreate
      onSubmit={handleSubmit}
      isSubmitting={isLoading}
      error={
        resolvedOuId ? toManagementErrorMessage(t, error, 'admin.roles.create.error') : t('admin.common.errors.no_ou')
      }
      preferences={preferences}
      {...rest}
    />
  );
};

export default RoleCreate;
