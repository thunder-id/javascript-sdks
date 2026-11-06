// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  RoleQueryKeys,
  getResourceServerPermissions,
  getResourceServers,
  getRole,
  toManagementErrorMessage,
  updateRole,
} from '@thunderid/browser';
import type {
  AdministrationMode,
  Preferences,
  ResourceServer,
  ResourceServerListResponse,
  ResourceServerPermission,
  Role,
  RoleResourcePermissions,
} from '@thunderid/browser';
import {type Component, type PropType, type Ref, type SetupContext, type VNode, defineComponent, h, ref} from 'vue';
import BaseRolePermissions, {type RolePermissionChange} from './BaseRolePermissions';
import useManagementEndpoint, {type ManagementEndpoint} from '../../../composables/management/useManagementEndpoint';
import useResourceMutation, {type ResourceMutationResult} from '../../../composables/management/useResourceMutation';
import useResourceQuery, {type ResourceQueryResult} from '../../../composables/management/useResourceQuery';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

type RolePermissionsProps = Readonly<{
  administrationMode: AdministrationMode | undefined;
  className: string;
  description: string | undefined;
  editable: boolean;
  preferences: Preferences | undefined;
  resourceServerNames: Record<string, string> | undefined;
  roleId: string;
  title: string | undefined;
}>;

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
 * Shows the permissions a role grants, grouped by resource server, and, when `editable`, lets the
 * signed-in user grant permissions from the resource servers' actions and revoke them. Every change
 * saves the role.
 *
 * @example
 * ```vue
 * <RolePermissions :role-id="roleId" editable />
 * ```
 */
const RolePermissions: Component = defineComponent({
  name: 'RolePermissions',
  props: {
    /**
     * How an update that removes a permission is made. `flow` runs the administration flow the server
     * configures for it. It needs `baseUrl`. Defaults to `native`.
     */
    administrationMode: {default: undefined, type: String as PropType<AdministrationMode>},
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** Text shown under the title. */
    description: {default: undefined, type: String},
    /** Whether permissions can be added and removed. Read-only roles never can. */
    editable: {default: false, type: Boolean},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    /** Display names of resource servers, keyed by identifier. The identifier is shown otherwise. */
    resourceServerNames: {default: undefined, type: Object as PropType<Record<string, string>>},
    /** Identifier of the role. */
    roleId: {required: true, type: String},
    /** Heading of the section. Pass an empty string to hide it. */
    title: {default: undefined, type: String},
  },
  setup(props: RolePermissionsProps, {slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const endpoint: ManagementEndpoint = useManagementEndpoint('roles');
    const resourceServersEndpoint: ManagementEndpoint = useManagementEndpoint('resourceServers');
    const selectedResourceServerId: Ref<string | null> = ref(null);
    const role: ResourceQueryResult<Role> = useResourceQuery(
      () => [RoleQueryKeys.ROLE, props.roleId],
      (fetcher) => getRole({...endpoint, fetcher, roleId: props.roleId}),
      {enabled: () => Boolean(props.roleId)},
    );
    const canEdit = (): boolean => props.editable && Boolean(role.data.value) && !role.data.value?.isReadOnly;
    const resourceServers: ResourceQueryResult<ResourceServerListResponse> = useResourceQuery(
      () => [RoleQueryKeys.ROLE_PERMISSION_CANDIDATES, 'resource-servers', {limit: 100}],
      (fetcher) => getResourceServers({...resourceServersEndpoint, fetcher, limit: 100}),
      {enabled: canEdit},
    );
    const candidates: ResourceQueryResult<{permissions: ResourceServerPermission[]; resourceServerId: string}> =
      useResourceQuery(
        () => [RoleQueryKeys.ROLE_PERMISSION_CANDIDATES, 'permissions', selectedResourceServerId.value],
        async (fetcher) => {
          const resourceServerId: string = selectedResourceServerId.value!;

          return {
            permissions: await getResourceServerPermissions({...resourceServersEndpoint, fetcher, resourceServerId}),
            resourceServerId,
          };
        },
        {enabled: () => canEdit() && Boolean(selectedResourceServerId.value)},
      );
    const update: ResourceMutationResult<Role, RoleResourcePermissions[]> = useResourceMutation(
      (permissions: RoleResourcePermissions[], fetcher) => {
        const current: Role = role.data.value!;

        return updateRole({
          ...endpoint,
          administrationMode: props.administrationMode,
          current,
          fetcher,
          payload: {description: current.description, name: current.name, ouId: current.ouId, permissions},
          roleId: props.roleId,
        });
      },
      () => [[RoleQueryKeys.ROLE, props.roleId], [RoleQueryKeys.ROLES]],
    );
    const change = (permissionChange: RolePermissionChange, add: boolean): void => {
      if (role.data.value) {
        void update.mutate(changePermissions(role.data.value.permissions ?? [], permissionChange, add));
      }
    };

    return (): VNode => {
      const editable: boolean = canEdit();
      const loaded: {permissions: ResourceServerPermission[]; resourceServerId: string} | undefined =
        candidates.data.value;

      return h(
        BaseRolePermissions,
        {
          availablePermissions:
            loaded?.resourceServerId === selectedResourceServerId.value
              ? {[loaded.resourceServerId]: loaded.permissions}
              : {},
          className: props.className,
          description: props.description,
          error:
            toManagementErrorMessage(t, role.error.value, 'admin.roles.permissions.error') ??
            toManagementErrorMessage(t, update.error.value, 'admin.roles.permissions.update_error') ??
            toManagementErrorMessage(
              t,
              resourceServers.error.value ?? candidates.error.value,
              'admin.roles.permissions.options_error',
            ),
          isLoading: role.isLoading.value,
          isMutating: update.isLoading.value,
          onAdd: editable
            ? (permissionChange: RolePermissionChange): void => change(permissionChange, true)
            : undefined,
          onRemove: editable
            ? (permissionChange: RolePermissionChange): void => change(permissionChange, false)
            : undefined,
          onResourceServerSelect: (resourceServerId: string): void => {
            selectedResourceServerId.value = resourceServerId;
          },
          permissions: role.data.value?.permissions ?? [],
          preferences: props.preferences,
          resourceServerNames: props.resourceServerNames,
          resourceServers:
            editable && resourceServers.data.value
              ? resourceServers.data.value.resourceServers.map((server: ResourceServer) => ({
                  id: server.id,
                  name: server.name,
                }))
              : undefined,
          title: props.title,
        },
        {...slots},
      );
    };
  },
});

export default RolePermissions;
