// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {GroupMember, GroupMemberType, Preferences} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, type VNodeChild, defineComponent, h} from 'vue';
import Button from '../../../primitives/Button/Button';
import DataTable, {type DataTableColumn} from '../../../primitives/DataTable/DataTable';
import AdminSection from '../shared/AdminSection';
import IdentityPicker, {type IdentityCandidate} from '../shared/IdentityPicker';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

type BaseGroupMembersProps = Readonly<{
  candidates: Partial<Record<GroupMemberType, IdentityCandidate[]>> | undefined;
  className: string;
  description: string | undefined;
  error: string | null;
  isLoading: boolean;
  isMutating: boolean;
  members: GroupMember[];
  onAdd: ((member: Pick<GroupMember, 'id' | 'type'>) => void) | undefined;
  onRemove: ((member: GroupMember) => void) | undefined;
  preferences: Preferences | undefined;
  title: string | undefined;
}>;

const MEMBER_TYPES: GroupMemberType[] = ['user', 'agent', 'group'];

/**
 * What `BaseGroupMembers` hands its default scoped slot, so the members can be shown with any UI, such
 * as a third-party data grid.
 */
export interface BaseGroupMembersRenderProps {
  /** The identities that can be added, keyed by member type. Undefined when adding is not allowed. */
  candidates?: Partial<Record<GroupMemberType, IdentityCandidate[]>>;
  /** The columns the default table shows, including the remove action when removing is allowed. */
  columns: DataTableColumn<GroupMember>[];
  error: string | null;
  isLoading: boolean;
  isMutating: boolean;
  members: GroupMember[];
  /** Adds a member. Undefined when adding is not allowed. */
  onAdd?: (member: Pick<GroupMember, 'id' | 'type'>) => void;
  /** Removes a member. Undefined when removing is not allowed. */
  onRemove?: (member: GroupMember) => void;
}

/**
 * Lists a group's members and optionally adds and removes them. Holds no data of its own: pass the
 * members, the identities that can be added, and handle the changes.
 *
 * Slots: `default`, a scoped slot that replaces the table and picker with custom UI and receives
 * {@link BaseGroupMembersRenderProps}.
 */
const BaseGroupMembers: Component = defineComponent({
  name: 'BaseGroupMembers',
  props: {
    /**
     * Identities that can be added, keyed by member type. Only the types present are offered. The add
     * form is shown only when this and `onAdd` are set.
     */
    candidates: {default: undefined, type: Object as PropType<Partial<Record<GroupMemberType, IdentityCandidate[]>>>},
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** Text shown under the title. */
    description: {default: undefined, type: String},
    /** An error message, already translated. */
    error: {default: null, type: String as PropType<string | null>},
    isLoading: {default: false, type: Boolean},
    /** Whether an add or remove is in flight. */
    isMutating: {default: false, type: Boolean},
    /** The group's members. */
    members: {required: true, type: Array as PropType<GroupMember[]>},
    /** Adds a member. Also available as `@add`. */
    onAdd: {default: undefined, type: Function as PropType<(member: Pick<GroupMember, 'id' | 'type'>) => void>},
    /** Removes a member. The remove buttons are shown only when set. Also available as `@remove`. */
    onRemove: {default: undefined, type: Function as PropType<(member: GroupMember) => void>},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    /** Heading of the section. Pass an empty string to hide it. */
    title: {default: undefined, type: String},
  },
  setup(props: BaseGroupMembersProps, {slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);

    return (): VNode => {
      const {candidates, onAdd, onRemove} = props;
      const columns: DataTableColumn<GroupMember>[] = [
        {
          header: t('admin.groups.members.columns.member'),
          id: 'member',
          render: (member: GroupMember): VNodeChild => member.display ?? member.id,
        },
        {
          header: t('admin.groups.members.columns.type'),
          id: 'type',
          render: (member: GroupMember): VNodeChild => t(`admin.common.identity_types.${member.type}`),
        },
      ];

      if (onRemove) {
        columns.push({
          header: t('admin.common.columns.actions'),
          id: 'actions',
          render: (member: GroupMember): VNodeChild =>
            h(
              Button,
              {
                'aria-label': t('admin.groups.members.remove_label', {name: member.display ?? member.id}),
                color: 'danger',
                disabled: props.isMutating,
                onClick: (): void => onRemove(member),
                size: 'small',
                variant: 'text',
              },
              {default: (): string => t('admin.common.actions.remove')},
            ),
        });
      }

      if (slots['default']) {
        const renderProps: BaseGroupMembersRenderProps = {
          candidates: onAdd ? candidates : undefined,
          columns,
          error: props.error,
          isLoading: props.isLoading,
          isMutating: props.isMutating,
          members: props.members,
          onAdd: candidates ? onAdd : undefined,
          onRemove,
        };

        return h('div', {class: props.className}, slots['default'](renderProps));
      }

      return h(
        AdminSection,
        {
          block: 'group-members',
          className: props.className,
          description: props.description,
          headingLevel: 3,
          title: props.title ?? t('admin.groups.members.title'),
        },
        {
          default: (): (VNode | null)[] => [
            onAdd && candidates
              ? h(IdentityPicker, {
                  addLabel: t('admin.groups.members.add'),
                  candidates,
                  excludedIds: props.members.map((member: GroupMember) => member.id),
                  isSubmitting: props.isMutating,
                  onAdd,
                  t,
                  types: MEMBER_TYPES.filter((type: GroupMemberType) => candidates[type] !== undefined).map(
                    (type: GroupMemberType) => ({label: t(`admin.common.identity_types.${type}`), value: type}),
                  ),
                })
              : null,
            h(DataTable, {
              caption: props.title?.length ? props.title : t('admin.groups.members.title'),
              columns,
              emptyText: t('admin.groups.members.empty'),
              error: props.error,
              getRowId: (member: GroupMember): string => `${member.type}:${member.id}`,
              isLoading: props.isLoading,
              rows: props.members,
              t,
            }),
          ],
        },
      );
    };
  },
});

export default BaseGroupMembers;
