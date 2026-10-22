// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {GroupMember, GroupMemberType, Preferences} from '@thunderid/browser';
import {FC, ReactElement, ReactNode} from 'react';
import useTranslation from '../../../../hooks/useTranslation';
import Button from '../../../primitives/Button/Button';
import DataTable, {DataTableColumn} from '../../../primitives/DataTable/DataTable';
import AdminSection from '../shared/AdminSection';
import IdentityPicker, {IdentityCandidate} from '../shared/IdentityPicker';

/**
 * What {@link BaseGroupMembers} hands its `children` render function, so the members can be shown
 * with any UI, such as a third-party data grid.
 */
export interface BaseGroupMembersRenderProps {
  /**
   * The identities that can be added, keyed by member type. Undefined when adding is not allowed.
   */
  candidates?: Partial<Record<GroupMemberType, IdentityCandidate[]>>;
  /**
   * The columns the default table shows, including the remove action when removing is allowed.
   */
  columns: DataTableColumn<GroupMember>[];
  error: string | null;
  isLoading: boolean;
  isMutating: boolean;
  members: GroupMember[];
  /**
   * Adds a member. Undefined when adding is not allowed.
   */
  onAdd?: (member: Pick<GroupMember, 'id' | 'type'>) => void;
  /**
   * Removes a member. Undefined when removing is not allowed.
   */
  onRemove?: (member: GroupMember) => void;
}

export interface BaseGroupMembersProps {
  /**
   * The identities that can be added, keyed by member type. Adding is hidden when omitted.
   */
  candidates?: Partial<Record<GroupMemberType, IdentityCandidate[]>>;
  /**
   * Renders custom UI in place of the default table and picker. Receives the members, the default
   * columns, the candidates, the loading and error state, and the add and remove handlers.
   */
  children?: (props: BaseGroupMembersRenderProps) => ReactNode;
  className?: string;
  description?: string;
  error?: string | null;
  isLoading?: boolean;
  isMutating?: boolean;
  members: GroupMember[];
  onAdd?: (member: Pick<GroupMember, 'id' | 'type'>) => void;
  /**
   * Removes a member. The remove action is hidden when omitted.
   */
  onRemove?: (member: GroupMember) => void;
  preferences?: Preferences;
  title?: string;
}

/**
 * Lists the members of a group and lets the caller add and remove them. Holds no data of its own.
 */
const BaseGroupMembers: FC<BaseGroupMembersProps> = ({
  candidates,
  children,
  className,
  description,
  error = null,
  isLoading = false,
  isMutating = false,
  members,
  onAdd,
  onRemove,
  preferences,
  title,
}: BaseGroupMembersProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);

  const columns: DataTableColumn<GroupMember>[] = [
    {
      header: t('admin.groups.members.columns.member'),
      id: 'member',
      render: (member: GroupMember): ReactNode => member.display ?? member.id,
    },
    {
      header: t('admin.groups.members.columns.type'),
      id: 'type',
      render: (member: GroupMember): ReactNode => t(`admin.common.identity_types.${member.type}`),
    },
  ];

  if (onRemove) {
    columns.push({
      header: t('admin.common.columns.actions'),
      id: 'actions',
      render: (member: GroupMember): ReactNode => (
        <Button
          variant="text"
          color="error"
          size="small"
          disabled={isMutating}
          aria-label={t('admin.groups.members.remove_label', {name: member.display ?? member.id})}
          onClick={(): void => onRemove(member)}
        >
          {t('admin.common.actions.remove')}
        </Button>
      ),
    });
  }

  if (children) {
    return (
      <div className={className}>
        {children({
          candidates: onAdd ? candidates : undefined,
          columns,
          error,
          isLoading,
          isMutating,
          members,
          onAdd: candidates ? onAdd : undefined,
          onRemove,
        })}
      </div>
    );
  }

  return (
    <AdminSection
      block="group-members"
      className={className}
      title={title ?? t('admin.groups.members.title')}
      description={description}
      headingLevel={3}
      preferences={preferences}
    >
      {onAdd && candidates && (
        <IdentityPicker<GroupMemberType>
          addLabel={t('admin.groups.members.add')}
          candidates={candidates}
          excludedIds={members.map((member: GroupMember) => member.id)}
          isSubmitting={isMutating}
          onAdd={onAdd}
          types={(['user', 'agent', 'group'] as GroupMemberType[])
            .filter((type: GroupMemberType) => candidates[type] !== undefined)
            .map((type: GroupMemberType) => ({label: t(`admin.common.identity_types.${type}`), value: type}))}
        />
      )}
      <DataTable
        caption={title?.length ? title : t('admin.groups.members.title')}
        columns={columns}
        rows={members}
        getRowId={(member: GroupMember): string => `${member.type}:${member.id}`}
        isLoading={isLoading}
        error={error}
        emptyText={t('admin.groups.members.empty')}
      />
    </AdminSection>
  );
};

export default BaseGroupMembers;
