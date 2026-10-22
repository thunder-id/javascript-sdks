// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {toManagementErrorMessage} from '@thunderid/browser';
import type {Role, CreateRoleRequest} from '@thunderid/browser';
import {type Component, type ComputedRef, type SetupContext, type VNode, defineComponent, h} from 'vue';
import BaseRoleCreate, {type RoleCreateSubmission} from './BaseRoleCreate';
import useCreateRole from '../../../../composables/roles/useCreateRole';
import type {ResourceMutationResult} from '../../../../composables/useResourceMutation';
import {type AdminFormProps, adminFormProps} from '../shared/adminFormProps';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';
import useDefaultOuId from '../shared/useDefaultOuId';

type RoleCreateProps = Omit<AdminFormProps, 'error' | 'isSubmitting'> &
  Readonly<{
    ouId: string | undefined;
  }>;

/**
 * Creates a role through the management API in the given organization unit, or the signed-in user's
 * own. Emits `created` with the created role.
 *
 * @example
 * ```vue
 * <RoleCreate @created="(role) => (selectedRoleId = role.id)" />
 * ```
 */
const RoleCreate: Component = defineComponent({
  name: 'RoleCreate',
  props: {
    className: adminFormProps.className,
    description: adminFormProps.description,
    onCancel: adminFormProps.onCancel,
    /** Organization unit the role is created in. Defaults to the signed-in user's organization unit. */
    ouId: {default: undefined, type: String},
    preferences: adminFormProps.preferences,
    title: adminFormProps.title,
  },
  emits: ['created'],
  setup(props: RoleCreateProps, {emit, slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const resolvedOuId: ComputedRef<string | undefined> = useDefaultOuId(() => props.ouId);
    const creation: ResourceMutationResult<Role, CreateRoleRequest> = useCreateRole({
      onSuccess: (created: Role): void => emit('created', created),
    });

    const handleSubmit = ({description, name}: RoleCreateSubmission): void => {
      if (resolvedOuId.value) {
        void creation.mutate({description, name, ouId: resolvedOuId.value});
      }
    };

    return (): VNode =>
      h(
        BaseRoleCreate,
        {
          className: props.className,
          description: props.description,
          error: resolvedOuId.value
            ? toManagementErrorMessage(t, creation.error.value, 'admin.roles.create.error')
            : t('admin.common.errors.no_ou'),
          isSubmitting: creation.isLoading.value,
          onCancel: props.onCancel,
          onSubmit: handleSubmit,
          preferences: props.preferences,
          title: props.title,
        },
        {...slots},
      );
  },
});

export default RoleCreate;
