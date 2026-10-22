// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {toManagementErrorMessage} from '@thunderid/browser';
import type {Preferences, Role} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';
import BaseRolePermissions from './BaseRolePermissions';
import useGetRole from '../../../../composables/roles/useGetRole';
import type {ResourceQueryResult} from '../../../../composables/useResourceQuery';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

type RolePermissionsProps = Readonly<{
  className: string;
  description: string | undefined;
  preferences: Preferences | undefined;
  resourceServerNames: Record<string, string> | undefined;
  roleId: string;
  title: string | undefined;
}>;

/**
 * Shows the permissions a role grants, grouped by resource server.
 *
 * @example
 * ```vue
 * <RolePermissions :role-id="roleId" />
 * ```
 */
const RolePermissions: Component = defineComponent({
  name: 'RolePermissions',
  props: {
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** Text shown under the title. */
    description: {default: undefined, type: String},
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
    const role: ResourceQueryResult<Role> = useGetRole(() => props.roleId);

    return (): VNode =>
      h(
        BaseRolePermissions,
        {
          className: props.className,
          description: props.description,
          error: toManagementErrorMessage(t, role.error.value, 'admin.roles.permissions.error'),
          isLoading: role.isLoading.value,
          permissions: role.data.value?.permissions ?? [],
          preferences: props.preferences,
          resourceServerNames: props.resourceServerNames,
          title: props.title,
        },
        {...slots},
      );
  },
});

export default RolePermissions;
