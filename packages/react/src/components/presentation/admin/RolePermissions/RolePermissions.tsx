// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {toManagementErrorMessage} from '@thunderid/browser';
import {FC, ReactElement} from 'react';
import BaseRolePermissions, {BaseRolePermissionsProps} from './BaseRolePermissions';
import useGetRole from '../../../../hooks/roles/useGetRole';
import useTranslation from '../../../../hooks/useTranslation';

export type RolePermissionsProps = Omit<BaseRolePermissionsProps, 'error' | 'isLoading' | 'permissions'> & {
  roleId: string;
};

/**
 * Shows the permissions a role grants.
 *
 * @example
 * ```tsx
 * <RolePermissions roleId={roleId} />
 * ```
 */
const RolePermissions: FC<RolePermissionsProps> = ({
  preferences,
  roleId,
  ...rest
}: RolePermissionsProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const role = useGetRole(roleId);

  return (
    <BaseRolePermissions
      permissions={role.data?.permissions ?? []}
      isLoading={role.isLoading}
      error={toManagementErrorMessage(t, role.error, 'admin.roles.permissions.error')}
      preferences={preferences}
      {...rest}
    />
  );
};

export default RolePermissions;
