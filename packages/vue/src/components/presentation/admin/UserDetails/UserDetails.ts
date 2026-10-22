// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {toManagementErrorMessage} from '@thunderid/browser';
import type {ManagedUser, MembershipGroupListResponse, Preferences} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';
import BaseUserDetails from './BaseUserDetails';
import type {ResourceMutationResult} from '../../../../composables/useResourceMutation';
import type {ResourceQueryResult} from '../../../../composables/useResourceQuery';
import useDeleteUser from '../../../../composables/users/useDeleteUser';
import useGetUser from '../../../../composables/users/useGetUser';
import useGetUserGroups from '../../../../composables/users/useGetUserGroups';
import useUpdateUser, {type UpdateUserVariables} from '../../../../composables/users/useUpdateUser';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

type UserDetailsProps = Readonly<{
  className: string;
  deletable: boolean;
  editable: boolean;
  hiddenAttributes: string[];
  preferences: Preferences | undefined;
  userId: string;
}>;

/**
 * Shows a user and the groups they belong to, and optionally lets the signed-in user edit or delete
 * them. Emits `deleted` after the user has been deleted.
 *
 * Slots: `actions`, rendered next to the user's name.
 *
 * @example
 * ```vue
 * <UserDetails :user-id="userId" deletable @deleted="router.push('/users')" />
 * ```
 */
const UserDetails: Component = defineComponent({
  name: 'UserDetails',
  props: {
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** Whether the user can be deleted from this view. */
    deletable: {default: false, type: Boolean},
    /** Whether the user's text attributes can be edited from this view. */
    editable: {default: false, type: Boolean},
    /** Attribute names that are never shown, such as credentials. */
    hiddenAttributes: {default: () => ['password'], type: Array as PropType<string[]>},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    /** Identifier of the user to show. */
    userId: {required: true, type: String},
  },
  emits: ['deleted'],
  setup(props: UserDetailsProps, {emit, slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const user: ResourceQueryResult<ManagedUser> = useGetUser(() => props.userId);
    const groups: ResourceQueryResult<MembershipGroupListResponse> = useGetUserGroups(() => props.userId, {
      limit: 100,
    });
    const deletion: ResourceMutationResult<void, string> = useDeleteUser({onSuccess: (): void => emit('deleted')});
    const update: ResourceMutationResult<ManagedUser, UpdateUserVariables> = useUpdateUser();

    return (): VNode => {
      const current: ManagedUser | undefined = user.data.value;

      return h(
        BaseUserDetails,
        {
          className: props.className,
          error:
            toManagementErrorMessage(t, user.error.value, 'admin.users.details.error') ??
            toManagementErrorMessage(t, deletion.error.value, 'admin.users.details.delete.error') ??
            toManagementErrorMessage(t, update.error.value, 'admin.users.details.edit.error'),
          groups: groups.data.value?.groups ?? [],
          hiddenAttributes: props.hiddenAttributes,
          isDeleting: deletion.isLoading.value,
          isLoading: user.isLoading.value,
          isUpdating: update.isLoading.value,
          onDelete: props.deletable ? (): void => void deletion.mutate(props.userId) : undefined,
          onUpdate:
            props.editable && current
              ? (attributes: Record<string, unknown>): void =>
                  void update.mutate({
                    data: {attributes, ouId: current.ouId, type: current.type},
                    userId: props.userId,
                  })
              : undefined,
          preferences: props.preferences,
          user: current,
        },
        {...slots},
      );
    };
  },
});

export default UserDetails;
