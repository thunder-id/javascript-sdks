// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {RoleQueryKeys, deleteRole, getRole, toManagementErrorMessage} from '@thunderid/browser';
import type {AdministrationMode, Preferences, Role} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';
import BaseRoleDetails from './BaseRoleDetails';
import useManagementEndpoint, {type ManagementEndpoint} from '../../../composables/management/useManagementEndpoint';
import useResourceMutation, {type ResourceMutationResult} from '../../../composables/management/useResourceMutation';
import useResourceQuery, {type ResourceQueryResult} from '../../../composables/management/useResourceQuery';
import RoleAssignments from '../RoleAssignments/RoleAssignments';
import BaseRolePermissions from '../RolePermissions/BaseRolePermissions';
import RolePermissions from '../RolePermissions/RolePermissions';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

type RoleDetailsProps = Readonly<{
  administrationMode: AdministrationMode | undefined;
  className: string;
  deletable: boolean;
  editable: boolean;
  preferences: Preferences | undefined;
  roleId: string;
}>;

/**
 * Shows a role with its permissions and assignments, and lets the signed-in user manage the permissions and
 * assignments and delete the role. Emits `deleted` after the role has been deleted.
 *
 * Slots: `actions`, rendered next to the role's name; `default`, a scoped slot that replaces the view with custom UI.
 *
 * @example
 * ```vue
 * <RoleDetails :role-id="roleId" editable deletable @deleted="router.push('/roles')" />
 * ```
 */
const RoleDetails: Component = defineComponent({
  name: 'RoleDetails',
  props: {
    /**
     * How the role is deleted and an assignment removed. `flow` runs the administration flow the server configures
     * for it, which can revoke grants and end sessions first. It needs `baseUrl`. Defaults to `native`.
     */
    administrationMode: {default: undefined, type: String as PropType<AdministrationMode>},
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** Whether the role can be deleted from this view. Read-only roles never can. */
    deletable: {default: false, type: Boolean},
    /** Whether the role's permissions can be edited, and the role assigned and taken away, from this view. */
    editable: {default: false, type: Boolean},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    /** Identifier of the role to show. */
    roleId: {required: true, type: String},
  },
  emits: ['deleted'],
  setup(props: RoleDetailsProps, {emit, slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const endpoint: ManagementEndpoint = useManagementEndpoint('roles');
    const role: ResourceQueryResult<Role> = useResourceQuery(
      () => [RoleQueryKeys.ROLE, props.roleId],
      (fetcher) => getRole({...endpoint, fetcher, roleId: props.roleId}),
      {enabled: (): boolean => Boolean(props.roleId)},
    );
    const deletion: ResourceMutationResult<void, string> = useResourceMutation(
      (roleId: string, fetcher) =>
        deleteRole({...endpoint, administrationMode: props.administrationMode, fetcher, roleId}),
      () => [[RoleQueryKeys.ROLES], [RoleQueryKeys.ROLE_ASSIGNMENTS]],
      {onSuccess: (): void => emit('deleted')},
    );

    return (): VNode =>
      h(
        BaseRoleDetails,
        {
          className: props.className,
          error:
            toManagementErrorMessage(t, role.error.value, 'admin.roles.details.error') ??
            toManagementErrorMessage(t, deletion.error.value, 'admin.roles.details.delete.error'),
          isDeleting: deletion.isLoading.value,
          isLoading: role.isLoading.value,
          onDelete: props.deletable ? (): void => void deletion.mutate(props.roleId) : undefined,
          preferences: props.preferences,
          role: role.data.value,
        },
        {
          ...slots,
          // Assigning waits for the role, so the candidates are only ever listed from its organization unit.
          assignments: (): VNode | null =>
            role.data.value
              ? h(RoleAssignments, {
                  administrationMode: props.administrationMode,
                  editable: props.editable,
                  ouId: role.data.value.ouId,
                  preferences: props.preferences,
                  roleId: props.roleId,
                })
              : null,
          permissions: (): VNode | null => {
            if (!role.data.value) {
              return null;
            }

            // Editing shares the role's query, so a change refreshes this view too. Read-only, the role
            // carries its permissions, so they are shown without fetching it again.
            return props.editable
              ? h(RolePermissions, {
                  administrationMode: props.administrationMode,
                  editable: true,
                  preferences: props.preferences,
                  roleId: props.roleId,
                })
              : h(BaseRolePermissions, {
                  permissions: role.data.value.permissions ?? [],
                  preferences: props.preferences,
                });
          },
        },
      );
  },
});

export default RoleDetails;
