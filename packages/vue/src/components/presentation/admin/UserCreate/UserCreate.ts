// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {toManagementErrorMessage} from '@thunderid/browser';
import type {
  CreateManagedUserRequest,
  ManagedUser,
  ManagedUserType,
  ManagedUserTypeListResponse,
  SelectOption,
} from '@thunderid/browser';
import {
  type Component,
  type ComputedRef,
  type PropType,
  type SetupContext,
  type VNode,
  computed,
  defineComponent,
  h,
} from 'vue';
import BaseUserCreate, {type UserCreateSubmission} from './BaseUserCreate';
import {DEFAULT_USER_CREATE_FIELDS, type UserCreateField} from './userCreateFields';
import type {ResourceMutationResult} from '../../../../composables/useResourceMutation';
import type {ResourceQueryResult} from '../../../../composables/useResourceQuery';
import useCreateUser from '../../../../composables/users/useCreateUser';
import useGetUserTypes from '../../../../composables/users/useGetUserTypes';
import InviteUser from '../../invite-user/InviteUser';
import {type AdminFormProps, adminFormProps} from '../shared/adminFormProps';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';
import useDefaultOuId from '../shared/useDefaultOuId';

type UserCreateProps = Omit<AdminFormProps, 'error' | 'isSubmitting'> &
  Readonly<{
    fields: UserCreateField[];
    inviteProps: Record<string, unknown> | undefined;
    mode: 'api' | 'invite';
    ouId: string | undefined;
  }>;

/**
 * Adds a user, either directly through the management API or by inviting them through the invite
 * user flow. Emits `created` with the created user in `api` mode.
 *
 * @example
 * ```vue
 * <UserCreate @created="(user) => router.push(`/users/${user.id}`)" />
 * <UserCreate mode="invite" />
 * ```
 */
const UserCreate: Component = defineComponent({
  name: 'UserCreate',
  props: {
    className: adminFormProps.className,
    description: adminFormProps.description,
    /** Attributes to collect in `api` mode. */
    fields: {default: () => DEFAULT_USER_CREATE_FIELDS, type: Array as PropType<UserCreateField[]>},
    /** Props passed to `InviteUser` when `mode` is `invite`. */
    inviteProps: {default: undefined, type: Object as PropType<Record<string, unknown>>},
    /**
     * How the user is added.
     * - `api` creates the user directly through the management API.
     * - `invite` runs the invite user flow, which asks the person to finish setting up their account.
     *   Only available where flows run. `created` is not emitted; the flow reports progress through
     *   `inviteProps.onFlowChange`.
     */
    mode: {default: 'api', type: String as PropType<'api' | 'invite'>},
    onCancel: adminFormProps.onCancel,
    /** Organization unit the user is created in. Defaults to the signed-in user's organization unit. */
    ouId: {default: undefined, type: String},
    preferences: adminFormProps.preferences,
    title: adminFormProps.title,
  },
  emits: ['created'],
  setup(props: UserCreateProps, {emit, slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const resolvedOuId: ComputedRef<string | undefined> = useDefaultOuId(() => props.ouId);
    const userTypes: ResourceQueryResult<ManagedUserTypeListResponse> = useGetUserTypes(
      {limit: 100},
      {enabled: () => props.mode === 'api'},
    );
    const creation: ResourceMutationResult<ManagedUser, CreateManagedUserRequest> = useCreateUser({
      onSuccess: (user: ManagedUser): void => emit('created', user),
    });

    const options: ComputedRef<SelectOption[]> = computed(() =>
      (userTypes.data.value?.types ?? []).map((userType: ManagedUserType) => ({
        label: userType.displayName ?? userType.handle,
        value: userType.handle,
      })),
    );

    const handleSubmit = ({attributes, type}: UserCreateSubmission): void => {
      if (resolvedOuId.value) {
        void creation.mutate({attributes, ouId: resolvedOuId.value, type});
      }
    };

    return (): VNode => {
      if (props.mode === 'invite') {
        return h(InviteUser, {...props.inviteProps});
      }

      return h(
        BaseUserCreate,
        {
          className: props.className,
          description: props.description,
          error: resolvedOuId.value
            ? toManagementErrorMessage(t, creation.error.value, 'admin.users.create.error')
            : t('admin.common.errors.no_ou'),
          fields: props.fields,
          isSubmitting: creation.isLoading.value,
          onCancel: props.onCancel,
          onSubmit: handleSubmit,
          preferences: props.preferences,
          title: props.title,
          userTypes: options.value,
        },
        {...slots},
      );
    };
  },
});

export default UserCreate;
