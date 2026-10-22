// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {toManagementErrorMessage} from '@thunderid/browser';
import type {Group, CreateGroupRequest} from '@thunderid/browser';
import {type Component, type ComputedRef, type SetupContext, type VNode, defineComponent, h} from 'vue';
import BaseGroupCreate, {type GroupCreateSubmission} from './BaseGroupCreate';
import useCreateGroup from '../../../../composables/groups/useCreateGroup';
import type {ResourceMutationResult} from '../../../../composables/useResourceMutation';
import {type AdminFormProps, adminFormProps} from '../shared/adminFormProps';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';
import useDefaultOuId from '../shared/useDefaultOuId';

type GroupCreateProps = Omit<AdminFormProps, 'error' | 'isSubmitting'> &
  Readonly<{
    ouId: string | undefined;
  }>;

/**
 * Creates a group through the management API in the given organization unit, or the signed-in user's
 * own. Emits `created` with the created group.
 *
 * @example
 * ```vue
 * <GroupCreate @created="(group) => (selectedGroupId = group.id)" />
 * ```
 */
const GroupCreate: Component = defineComponent({
  name: 'GroupCreate',
  props: {
    className: adminFormProps.className,
    description: adminFormProps.description,
    onCancel: adminFormProps.onCancel,
    /** Organization unit the group is created in. Defaults to the signed-in user's organization unit. */
    ouId: {default: undefined, type: String},
    preferences: adminFormProps.preferences,
    title: adminFormProps.title,
  },
  emits: ['created'],
  setup(props: GroupCreateProps, {emit, slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const resolvedOuId: ComputedRef<string | undefined> = useDefaultOuId(() => props.ouId);
    const creation: ResourceMutationResult<Group, CreateGroupRequest> = useCreateGroup({
      onSuccess: (created: Group): void => emit('created', created),
    });

    const handleSubmit = ({description, name}: GroupCreateSubmission): void => {
      if (resolvedOuId.value) {
        void creation.mutate({description, name, ouId: resolvedOuId.value});
      }
    };

    return (): VNode =>
      h(
        BaseGroupCreate,
        {
          className: props.className,
          description: props.description,
          error: resolvedOuId.value
            ? toManagementErrorMessage(t, creation.error.value, 'admin.groups.create.error')
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

export default GroupCreate;
