// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AdministrationMode,
  Role,
  RoleQueryKeys,
  deleteRole,
  getRole,
  toManagementErrorMessage,
} from '@thunderid/browser';
import {FC, ReactElement} from 'react';
import BaseRoleDetails, {BaseRoleDetailsProps} from './BaseRoleDetails';
import useManagementEndpoint, {ManagementEndpoint} from '../../../hooks/management/useManagementEndpoint';
import useResourceMutation, {ResourceMutationResult} from '../../../hooks/management/useResourceMutation';
import useResourceQuery, {ResourceQueryResult} from '../../../hooks/management/useResourceQuery';
import useTranslation from '../../../hooks/useTranslation';
import RoleAssignments from '../RoleAssignments/RoleAssignments';
import BaseRolePermissions from '../RolePermissions/BaseRolePermissions';
import RolePermissions from '../RolePermissions/RolePermissions';

export type RoleDetailsProps = Omit<
  BaseRoleDetailsProps,
  'assignments' | 'error' | 'isDeleting' | 'isLoading' | 'onDelete' | 'permissions' | 'role'
> & {
  /**
   * How the role is deleted and an assignment removed. `flow` runs the administration flow the server configures for
   * it, which can revoke grants and end sessions first. It needs `baseUrl`.
   * @default 'native'
   */
  administrationMode?: AdministrationMode;
  /**
   * Whether the role can be deleted from this view. Read-only roles never can.
   * @default false
   */
  deletable?: boolean;
  /**
   * Whether the role's permissions can be added and removed, and the role assigned and taken away, from
   * this view.
   * @default false
   */
  editable?: boolean;
  /**
   * Called after the role has been deleted.
   */
  onDeleted?: () => void;
  roleId: string;
};

/**
 * Shows a role with its permissions and assignments, and lets the signed-in user manage the permissions and
 * assignments and delete the role.
 *
 * @example
 * ```tsx
 * <RoleDetails roleId={roleId} editable deletable onDeleted={() => navigate('/roles')} />
 * ```
 */
const RoleDetails: FC<RoleDetailsProps> = ({
  administrationMode,
  deletable = false,
  editable = false,
  onDeleted,
  preferences,
  roleId,
  ...rest
}: RoleDetailsProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const endpoint: ManagementEndpoint = useManagementEndpoint('roles');
  const role: ResourceQueryResult<Role> = useResourceQuery(
    [RoleQueryKeys.ROLE, roleId],
    (fetcher) => getRole({...endpoint, fetcher, roleId}),
    {enabled: Boolean(roleId)},
  );
  const deletion: ResourceMutationResult<void, string> = useResourceMutation(
    (id: string, fetcher) => deleteRole({...endpoint, administrationMode, fetcher, roleId: id}),
    () => [[RoleQueryKeys.ROLES], [RoleQueryKeys.ROLE_ASSIGNMENTS]],
    {onSuccess: onDeleted},
  );

  return (
    <BaseRoleDetails
      role={role.data}
      isLoading={role.isLoading}
      error={
        toManagementErrorMessage(t, role.error, 'admin.roles.details.error') ??
        toManagementErrorMessage(t, deletion.error, 'admin.roles.details.delete.error')
      }
      isDeleting={deletion.isLoading}
      onDelete={deletable ? (): void => void deletion.mutate(roleId) : undefined}
      permissions={
        role.data &&
        (editable ? (
          // Shares the role's query, so editing the permissions refreshes this view too.
          <RolePermissions roleId={roleId} editable administrationMode={administrationMode} preferences={preferences} />
        ) : (
          // The role carries its permissions, so they are shown without fetching it again.
          <BaseRolePermissions permissions={role.data.permissions ?? []} preferences={preferences} />
        ))
      }
      assignments={
        role.data && (
          // Assigning waits for the role, so the candidates are only ever listed from its organization unit.
          <RoleAssignments
            roleId={roleId}
            ouId={role.data.ouId}
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

export default RoleDetails;
