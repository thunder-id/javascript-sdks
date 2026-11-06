// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {GroupQueryKeys, RoleQueryKeys, deleteGroup, getGroup, toManagementErrorMessage} from '@thunderid/browser';
import type {AdministrationMode, Group, Preferences} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';
import BaseGroupDetails from './BaseGroupDetails';
import useManagementEndpoint, {type ManagementEndpoint} from '../../../composables/management/useManagementEndpoint';
import useResourceMutation, {type ResourceMutationResult} from '../../../composables/management/useResourceMutation';
import useResourceQuery, {type ResourceQueryResult} from '../../../composables/management/useResourceQuery';
import GroupMembers from '../GroupMembers/GroupMembers';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

type GroupDetailsProps = Readonly<{
  administrationMode: AdministrationMode | undefined;
  className: string;
  deletable: boolean;
  editable: boolean;
  groupId: string;
  preferences: Preferences | undefined;
}>;

/**
 * Shows a group with its members, and lets the signed-in user manage the members and delete the group. Emits
 * `deleted` after the group has been deleted.
 *
 * Slots: `actions`, rendered next to the group's name; `default`, a scoped slot that replaces the view with custom
 * UI.
 *
 * @example
 * ```vue
 * <GroupDetails :group-id="groupId" editable deletable @deleted="router.push('/groups')" />
 * ```
 */
const GroupDetails: Component = defineComponent({
  name: 'GroupDetails',
  props: {
    /**
     * How the group is deleted and a member removed. `flow` runs the administration flow the server configures for
     * it, which can revoke grants and end sessions first. It needs `baseUrl`. Defaults to `native`.
     */
    administrationMode: {default: undefined, type: String as PropType<AdministrationMode>},
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** Whether the group can be deleted from this view. */
    deletable: {default: false, type: Boolean},
    /** Whether members can be added and removed from this view. */
    editable: {default: false, type: Boolean},
    /** Identifier of the group to show. */
    groupId: {required: true, type: String},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
  },
  emits: ['deleted'],
  setup(props: GroupDetailsProps, {emit, slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const endpoint: ManagementEndpoint = useManagementEndpoint('groups');
    const group: ResourceQueryResult<Group> = useResourceQuery(
      () => [GroupQueryKeys.GROUP, props.groupId],
      (fetcher) => getGroup({...endpoint, fetcher, groupId: props.groupId}),
      {enabled: (): boolean => Boolean(props.groupId)},
    );
    const deletion: ResourceMutationResult<void, string> = useResourceMutation(
      (groupId: string, fetcher) =>
        deleteGroup({...endpoint, administrationMode: props.administrationMode, fetcher, groupId}),
      () => [[GroupQueryKeys.GROUPS], [GroupQueryKeys.MEMBERSHIPS], [RoleQueryKeys.ROLE_ASSIGNMENTS]],
      {onSuccess: (): void => emit('deleted')},
    );

    return (): VNode =>
      h(
        BaseGroupDetails,
        {
          className: props.className,
          error:
            toManagementErrorMessage(t, group.error.value, 'admin.groups.details.error') ??
            toManagementErrorMessage(t, deletion.error.value, 'admin.groups.details.delete.error'),
          group: group.data.value,
          isDeleting: deletion.isLoading.value,
          isLoading: group.isLoading.value,
          onDelete: props.deletable ? (): void => void deletion.mutate(props.groupId) : undefined,
          preferences: props.preferences,
        },
        {
          ...slots,
          // Adding waits for the group, so the candidates are only ever listed from its organization unit.
          members: (): VNode | null =>
            group.data.value
              ? h(GroupMembers, {
                  administrationMode: props.administrationMode,
                  editable: props.editable,
                  groupId: props.groupId,
                  ouId: group.data.value.ouId,
                  preferences: props.preferences,
                })
              : null,
        },
      );
  },
});

export default GroupDetails;
