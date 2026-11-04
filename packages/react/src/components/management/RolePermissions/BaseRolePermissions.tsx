// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Preferences, ResourceServerPermission, RoleResourcePermissions, SelectOption} from '@thunderid/browser';
import {ChangeEvent, FC, FormEvent, ReactElement, ReactNode, useState} from 'react';
import useTranslation from '../../../hooks/useTranslation';
import Alert from '../../primitives/Alert/Alert';
import Button from '../../primitives/Button/Button';
import Select from '../../primitives/Select/Select';
import Spinner from '../../primitives/Spinner/Spinner';
import {ChipList, Panel} from '../shared/AdminParts';
import AdminSection from '../shared/AdminSection';
import useAdminPartStyles from '../shared/useAdminPartStyles';

/**
 * A resource server a permission can be granted on.
 */
export interface RolePermissionResourceServer {
  id: string;
  name: string;
}

/**
 * One permission on one resource server, as added to or removed from a role.
 */
export interface RolePermissionChange {
  permission: string;
  resourceServerId: string;
}

/**
 * What {@link BaseRolePermissions} hands its `children` render function, so the permissions can be
 * shown with any UI.
 */
export interface BaseRolePermissionsRenderProps {
  /**
   * The permissions that can be granted, keyed by resource server identifier, for the resource servers
   * loaded so far. Undefined when adding is not allowed.
   */
  availablePermissions?: Record<string, ResourceServerPermission[]>;
  error: string | null;
  isLoading: boolean;
  isMutating: boolean;
  /**
   * Grants a permission. Undefined when the permissions cannot be edited.
   */
  onAdd?: (change: RolePermissionChange) => void;
  /**
   * Revokes a permission. Undefined when the permissions cannot be edited. Ask the user to confirm
   * before calling it.
   */
  onRemove?: (change: RolePermissionChange) => void;
  /**
   * Asks for the permissions of a resource server, which then appear in `availablePermissions`.
   * Undefined when adding is not allowed.
   */
  onResourceServerSelect?: (resourceServerId: string) => void;
  /**
   * The resource servers the role grants at least one permission on, with those permissions.
   */
  permissions: RoleResourcePermissions[];
  /**
   * Returns a resource server's display name, or its identifier when the name is missing.
   */
  resolveResourceServerName: (resourceServerId: string) => string;
  /**
   * The resource servers permissions can be granted on. Undefined when adding is not allowed.
   */
  resourceServers?: RolePermissionResourceServer[];
}

export interface BaseRolePermissionsProps {
  /**
   * The permissions that can be granted, keyed by resource server identifier. A resource server
   * missing here is still loading, and `onResourceServerSelect` is called to load it.
   */
  availablePermissions?: Record<string, ResourceServerPermission[]>;
  /**
   * Renders custom UI in place of the default view. Receives the granted permissions grouped by
   * resource server, the loading and error state, a resource server name resolver and, when the
   * permissions can be edited, the add and remove handlers with what can be added.
   */
  children?: (props: BaseRolePermissionsRenderProps) => ReactNode;
  className?: string;
  description?: string;
  error?: string | null;
  isLoading?: boolean;
  isMutating?: boolean;
  /**
   * Grants a permission. Adding is hidden when omitted, or when `resourceServers` is omitted.
   */
  onAdd?: (change: RolePermissionChange) => void;
  /**
   * Revokes a permission, after the user confirms. Removing is hidden when omitted.
   */
  onRemove?: (change: RolePermissionChange) => void;
  /**
   * Called when a resource server is picked to add a permission on, so its permissions can be loaded.
   */
  onResourceServerSelect?: (resourceServerId: string) => void;
  permissions: RoleResourcePermissions[];
  preferences?: Preferences;
  /**
   * Display names of resource servers, keyed by identifier. The identifier is shown when a name is missing.
   */
  resourceServerNames?: Record<string, string>;
  /**
   * The resource servers a permission can be added on.
   */
  resourceServers?: RolePermissionResourceServer[];
  title?: string;
}

/**
 * Shows the permissions a role grants, grouped by resource server, and lets the caller add and remove
 * them. Holds no data of its own.
 */
const BaseRolePermissions: FC<BaseRolePermissionsProps> = ({
  availablePermissions,
  children,
  className,
  description,
  error = null,
  isLoading = false,
  isMutating = false,
  onAdd,
  onRemove,
  onResourceServerSelect,
  permissions,
  preferences,
  resourceServerNames,
  resourceServers,
  title,
}: BaseRolePermissionsProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const styles: Record<string, string> = useAdminPartStyles();
  const [resourceServerId, setResourceServerId] = useState<string>('');
  const [permission, setPermission] = useState<string>('');
  const [pendingRemoval, setPendingRemoval] = useState<RolePermissionChange | null>(null);
  const granted: RoleResourcePermissions[] = permissions.filter(
    (entry: RoleResourcePermissions) => entry.permissions.length > 0,
  );
  const canAdd = Boolean(onAdd && resourceServers);
  const resolveResourceServerName = (id: string): string =>
    resourceServerNames?.[id] ??
    resourceServers?.find((server: RolePermissionResourceServer) => server.id === id)?.name ??
    id;

  if (children) {
    return (
      <div className={className}>
        {children({
          availablePermissions: canAdd ? (availablePermissions ?? {}) : undefined,
          error,
          isLoading,
          isMutating,
          onAdd: canAdd ? onAdd : undefined,
          onRemove,
          onResourceServerSelect: canAdd ? onResourceServerSelect : undefined,
          permissions: granted,
          resolveResourceServerName,
          resourceServers: canAdd ? resourceServers : undefined,
        })}
      </div>
    );
  }

  const grantedOn = (id: string): string[] =>
    granted.find((entry: RoleResourcePermissions) => entry.resourceServerId === id)?.permissions ?? [];
  const candidates: ResourceServerPermission[] | undefined = resourceServerId
    ? availablePermissions?.[resourceServerId]
    : undefined;
  const permissionOptions: SelectOption[] = (candidates ?? [])
    .filter((candidate: ResourceServerPermission) => !grantedOn(resourceServerId).includes(candidate.permission))
    .map((candidate: ResourceServerPermission) => ({
      label: `${candidate.resourceName ? `${candidate.resourceName} / ` : ''}${candidate.name} (${candidate.permission})`,
      value: candidate.permission,
    }));

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (onAdd && resourceServerId && permission) {
      onAdd({permission, resourceServerId});
      setPermission('');
    }
  };

  const renderAdd = (): ReactElement | null => {
    if (!canAdd) {
      return null;
    }

    return (
      <form className={styles['row']} onSubmit={handleSubmit} style={{alignItems: 'flex-end'}}>
        <Select
          label={t('admin.roles.permissions.fields.resource_server')}
          name="resourceServer"
          value={resourceServerId}
          placeholder={t('admin.roles.permissions.fields.resource_server_placeholder')}
          options={(resourceServers ?? []).map((server: RolePermissionResourceServer) => ({
            label: server.name,
            value: server.id,
          }))}
          onChange={(event: ChangeEvent<HTMLSelectElement>): void => {
            setResourceServerId(event.target.value);
            setPermission('');
            if (event.target.value) {
              onResourceServerSelect?.(event.target.value);
            }
          }}
        />
        <Select
          label={t('admin.roles.permissions.fields.permission')}
          name="permission"
          value={permission}
          disabled={!resourceServerId}
          loading={Boolean(resourceServerId) && candidates === undefined}
          placeholder={t('admin.roles.permissions.fields.permission_placeholder')}
          emptyText={t('admin.roles.permissions.fields.permission_empty')}
          options={permissionOptions}
          onChange={(event: ChangeEvent<HTMLSelectElement>): void => setPermission(event.target.value)}
        />
        <Button type="submit" loading={isMutating} disabled={!resourceServerId || !permission || isMutating}>
          {t('admin.roles.permissions.add')}
        </Button>
      </form>
    );
  };

  const renderContent = (): ReactElement => {
    if (isLoading) {
      return <Spinner size="small" />;
    }

    return (
      <>
        {error && (
          <Alert variant="error" role="alert">
            {error}
          </Alert>
        )}
        {renderAdd()}
        {pendingRemoval && onRemove && (
          <span
            className={styles['confirm']}
            role="group"
            aria-label={t('admin.roles.permissions.remove_confirm', {permission: pendingRemoval.permission})}
          >
            <span>{t('admin.roles.permissions.remove_confirm', {permission: pendingRemoval.permission})}</span>
            <Button variant="text" size="small" disabled={isMutating} onClick={(): void => setPendingRemoval(null)}>
              {t('admin.common.actions.cancel')}
            </Button>
            <Button
              color="error"
              size="small"
              loading={isMutating}
              disabled={isMutating}
              onClick={(): void => {
                onRemove(pendingRemoval);
                setPendingRemoval(null);
              }}
            >
              {t('admin.common.actions.confirm')}
            </Button>
          </span>
        )}
        {granted.length === 0 && !error && (
          <span className={styles['muted']}>{t('admin.roles.permissions.empty')}</span>
        )}
        {granted.map((entry: RoleResourcePermissions) => {
          const name: string = resolveResourceServerName(entry.resourceServerId);

          return (
            <Panel key={entry.resourceServerId} title={name}>
              <ChipList
                label={name}
                emptyText={t('admin.roles.permissions.empty')}
                items={entry.permissions.map((grantedPermission: string) => ({
                  id: grantedPermission,
                  label: grantedPermission,
                  ...(onRemove
                    ? {
                        onRemove: (): void =>
                          setPendingRemoval({permission: grantedPermission, resourceServerId: entry.resourceServerId}),
                        removeLabel: t('admin.roles.permissions.remove_label', {
                          permission: grantedPermission,
                          resourceServer: name,
                        }),
                      }
                    : {}),
                }))}
              />
            </Panel>
          );
        })}
      </>
    );
  };

  return (
    <AdminSection
      block="role-permissions"
      className={className}
      title={title ?? t('admin.roles.permissions.title')}
      description={description}
      headingLevel={3}
      preferences={preferences}
    >
      {renderContent()}
    </AdminSection>
  );
};

export default BaseRolePermissions;
