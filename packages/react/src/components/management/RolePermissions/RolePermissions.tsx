// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AdministrationMode,
  ResourceServer,
  ResourceServerListResponse,
  ResourceServerPermission,
  Role,
  RoleQueryKeys,
  RoleResourcePermissions,
  getResourceServerPermissions,
  getResourceServers,
  getRole,
  toManagementErrorMessage,
  updateRole,
} from '@thunderid/browser';
import {FC, ReactElement, useMemo, useState} from 'react';
import BaseRolePermissions, {
  BaseRolePermissionsProps,
  RolePermissionChange,
  RolePermissionResourceServer,
} from './BaseRolePermissions';
import useManagementEndpoint, {ManagementEndpoint} from '../../../hooks/management/useManagementEndpoint';
import useResourceMutation, {ResourceMutationResult} from '../../../hooks/management/useResourceMutation';
import useResourceQuery, {ResourceQueryResult} from '../../../hooks/management/useResourceQuery';
import useTranslation from '../../../hooks/useTranslation';

export type RolePermissionsProps = Omit<
  BaseRolePermissionsProps,
  | 'availablePermissions'
  | 'error'
  | 'isLoading'
  | 'isMutating'
  | 'onAdd'
  | 'onRemove'
  | 'onResourceServerSelect'
  | 'permissions'
  | 'resourceServers'
> & {
  /**
   * How an update that removes a permission is made. `flow` runs the administration flow the server
   * configures for it. It needs `baseUrl`.
   * @default 'native'
   */
  administrationMode?: AdministrationMode;
  /**
   * Whether permissions can be added and removed from this view. Read-only roles never can.
   * @default false
   */
  editable?: boolean;
  roleId: string;
};

/**
 * Returns the role's permissions with one permission added or taken away, dropping a resource server
 * left with none.
 */
const changePermissions = (
  current: RoleResourcePermissions[],
  {permission, resourceServerId}: RolePermissionChange,
  add: boolean,
): RoleResourcePermissions[] => {
  const next: RoleResourcePermissions[] = current.map((entry: RoleResourcePermissions) => {
    if (entry.resourceServerId !== resourceServerId) {
      return entry;
    }

    return {
      ...entry,
      permissions: add
        ? Array.from(new Set([...entry.permissions, permission]))
        : entry.permissions.filter((granted: string) => granted !== permission),
    };
  });

  if (add && !next.some((entry: RoleResourcePermissions) => entry.resourceServerId === resourceServerId)) {
    next.push({permissions: [permission], resourceServerId});
  }

  return next.filter((entry: RoleResourcePermissions) => entry.permissions.length > 0);
};

/**
 * Shows the permissions a role grants and, when `editable`, lets the signed-in user grant permissions
 * from the resource servers' actions and revoke them. Every change saves the role.
 *
 * @example
 * ```tsx
 * <RolePermissions roleId={roleId} editable />
 * ```
 */
const RolePermissions: FC<RolePermissionsProps> = ({
  administrationMode,
  editable = false,
  preferences,
  roleId,
  ...rest
}: RolePermissionsProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const endpoint: ManagementEndpoint = useManagementEndpoint('roles');
  const resourceServersEndpoint: ManagementEndpoint = useManagementEndpoint('resourceServers');
  const [selectedResourceServerId, setSelectedResourceServerId] = useState<string | null>(null);
  const role: ResourceQueryResult<Role> = useResourceQuery(
    [RoleQueryKeys.ROLE, roleId],
    (fetcher) => getRole({...endpoint, fetcher, roleId}),
    {enabled: Boolean(roleId)},
  );
  const canEdit: boolean = editable && Boolean(role.data) && !role.data?.isReadOnly;
  const resourceServers: ResourceQueryResult<ResourceServerListResponse> = useResourceQuery(
    [RoleQueryKeys.ROLE_PERMISSION_CANDIDATES, 'resource-servers', {limit: 100}],
    (fetcher) => getResourceServers({...resourceServersEndpoint, fetcher, limit: 100}),
    {enabled: canEdit},
  );
  const candidates: ResourceQueryResult<{permissions: ResourceServerPermission[]; resourceServerId: string}> =
    useResourceQuery(
      [RoleQueryKeys.ROLE_PERMISSION_CANDIDATES, 'permissions', selectedResourceServerId],
      async (fetcher) => ({
        permissions: await getResourceServerPermissions({
          ...resourceServersEndpoint,
          fetcher,
          resourceServerId: selectedResourceServerId!,
        }),
        resourceServerId: selectedResourceServerId!,
      }),
      {enabled: canEdit && Boolean(selectedResourceServerId)},
    );
  const update: ResourceMutationResult<Role, RoleResourcePermissions[]> = useResourceMutation(
    (permissions: RoleResourcePermissions[], fetcher) =>
      updateRole({
        ...endpoint,
        administrationMode,
        current: role.data,
        fetcher,
        payload: {
          description: role.data!.description,
          name: role.data!.name,
          ouId: role.data!.ouId,
          permissions,
        },
        roleId,
      }),
    () => [[RoleQueryKeys.ROLE, roleId], [RoleQueryKeys.ROLES]],
  );

  const servers: RolePermissionResourceServer[] = useMemo(
    () =>
      (resourceServers.data?.resourceServers ?? []).map((server: ResourceServer) => ({
        id: server.id,
        name: server.name,
      })),
    [resourceServers.data],
  );
  const change = (permissionChange: RolePermissionChange, add: boolean): void => {
    if (role.data) {
      void update.mutate(changePermissions(role.data.permissions ?? [], permissionChange, add));
    }
  };

  return (
    <BaseRolePermissions
      permissions={role.data?.permissions ?? []}
      isLoading={role.isLoading}
      isMutating={update.isLoading}
      error={
        toManagementErrorMessage(t, role.error, 'admin.roles.permissions.error') ??
        toManagementErrorMessage(t, update.error, 'admin.roles.permissions.update_error') ??
        toManagementErrorMessage(t, resourceServers.error ?? candidates.error, 'admin.roles.permissions.options_error')
      }
      resourceServers={canEdit && resourceServers.data ? servers : undefined}
      availablePermissions={
        candidates.data?.resourceServerId === selectedResourceServerId
          ? {[candidates.data.resourceServerId]: candidates.data.permissions}
          : {}
      }
      onResourceServerSelect={setSelectedResourceServerId}
      onAdd={canEdit ? (permissionChange: RolePermissionChange): void => change(permissionChange, true) : undefined}
      onRemove={canEdit ? (permissionChange: RolePermissionChange): void => change(permissionChange, false) : undefined}
      preferences={preferences}
      {...rest}
    />
  );
};

export default RolePermissions;
