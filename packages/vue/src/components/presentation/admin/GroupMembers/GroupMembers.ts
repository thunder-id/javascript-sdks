// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {resolveManagedIdentityName, toManagementErrorMessage} from '@thunderid/browser';
import type {
  AgentListResponse,
  BasicAgent,
  Group,
  GroupMember,
  GroupMemberListResponse,
  ManagedUser,
  ManagedUserListResponse,
  Preferences,
} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';
import BaseGroupMembers from './BaseGroupMembers';
import useGetAgents from '../../../../composables/agents/useGetAgents';
import useAddGroupMembers, {type GroupMembersVariables} from '../../../../composables/groups/useAddGroupMembers';
import useGetGroupMembers from '../../../../composables/groups/useGetGroupMembers';
import useRemoveGroupMembers from '../../../../composables/groups/useRemoveGroupMembers';
import type {ResourceMutationResult} from '../../../../composables/useResourceMutation';
import type {ResourceQueryResult} from '../../../../composables/useResourceQuery';
import useGetUsers from '../../../../composables/users/useGetUsers';
import type {IdentityCandidate} from '../shared/IdentityPicker';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

type GroupMembersProps = Readonly<{
  className: string;
  description: string | undefined;
  editable: boolean;
  groupId: string;
  preferences: Preferences | undefined;
  title: string | undefined;
}>;

/**
 * Lists a group's members and, unless `editable` is `false`, lets the signed-in user add users and
 * agents to it or remove members.
 *
 * @example
 * ```vue
 * <GroupMembers :group-id="groupId" />
 * ```
 */
const GroupMembers: Component = defineComponent({
  name: 'GroupMembers',
  props: {
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** Text shown under the title. */
    description: {default: undefined, type: String},
    /** Whether members can be added and removed. */
    editable: {default: false, type: Boolean},
    /** Identifier of the group. */
    groupId: {required: true, type: String},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    /** Heading of the section. Pass an empty string to hide it. */
    title: {default: undefined, type: String},
  },
  setup(props: GroupMembersProps, {slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const members: ResourceQueryResult<GroupMemberListResponse> = useGetGroupMembers(() => props.groupId, {
      limit: 100,
    });
    const users: ResourceQueryResult<ManagedUserListResponse> = useGetUsers(
      {limit: 100},
      {enabled: () => props.editable},
    );
    const agents: ResourceQueryResult<AgentListResponse> = useGetAgents({limit: 100}, {enabled: () => props.editable});
    const add: ResourceMutationResult<Group, GroupMembersVariables> = useAddGroupMembers();
    const remove: ResourceMutationResult<Group, GroupMembersVariables> = useRemoveGroupMembers();

    return (): VNode => {
      const candidates: Partial<Record<'user' | 'agent', IdentityCandidate[]>> = {
        agent: (agents.data.value?.agents ?? []).map((agent: BasicAgent) => ({id: agent.id, label: agent.name})),
        user: (users.data.value?.users ?? []).map((user: ManagedUser) => ({
          id: user.id,
          label: resolveManagedIdentityName(user),
        })),
      };

      return h(
        BaseGroupMembers,
        {
          candidates: props.editable ? candidates : undefined,
          className: props.className,
          description: props.description,
          error:
            toManagementErrorMessage(t, members.error.value, 'admin.groups.members.error') ??
            toManagementErrorMessage(t, add.error.value ?? remove.error.value, 'admin.groups.members.update_error'),
          isLoading: members.isLoading.value,
          isMutating: add.isLoading.value || remove.isLoading.value,
          members: members.data.value?.members ?? [],
          onAdd: props.editable
            ? (member: Pick<GroupMember, 'id' | 'type'>): void =>
                void add.mutate({groupId: props.groupId, members: [member]})
            : undefined,
          onRemove: props.editable
            ? (member: GroupMember): void =>
                void remove.mutate({groupId: props.groupId, members: [{id: member.id, type: member.type}]})
            : undefined,
          preferences: props.preferences,
          title: props.title,
        },
        {...slots},
      );
    };
  },
});

export default GroupMembers;
