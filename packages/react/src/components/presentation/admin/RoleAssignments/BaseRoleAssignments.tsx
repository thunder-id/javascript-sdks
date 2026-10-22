// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Preferences, RoleAssigneeType, RoleAssignment, RoleAssignmentInput} from '@thunderid/browser';
import {ChangeEvent, FC, ReactElement, ReactNode} from 'react';
import useTranslation from '../../../../hooks/useTranslation';
import Button from '../../../primitives/Button/Button';
import DataTable, {DataTableColumn} from '../../../primitives/DataTable/DataTable';
import Select from '../../../primitives/Select/Select';
import AdminSection from '../shared/AdminSection';
import IdentityPicker, {IdentityCandidate} from '../shared/IdentityPicker';

/**
 * What {@link BaseRoleAssignments} hands its `children` render function, so the assignments can be
 * shown with any UI, such as a third-party data grid.
 */
export interface BaseRoleAssignmentsRenderProps {
  assignments: RoleAssignment[];
  /**
   * The identities the role can be assigned to, keyed by assignee type. Undefined when assigning is
   * not allowed.
   */
  candidates?: Partial<Record<RoleAssigneeType, IdentityCandidate[]>>;
  /**
   * The columns the default table shows, including the remove action when unassigning is allowed.
   */
  columns: DataTableColumn<RoleAssignment>[];
  error: string | null;
  isLoading: boolean;
  isMutating: boolean;
  /**
   * Assigns the role. Undefined when assigning is not allowed.
   */
  onAssign?: (assignment: RoleAssignmentInput) => void;
  /**
   * Shows only one assignee type, or every type with `null`. Undefined when the list cannot be filtered.
   */
  onTypeFilterChange?: (type: RoleAssigneeType | null) => void;
  /**
   * Removes an assignment. Undefined when unassigning is not allowed.
   */
  onUnassign?: (assignment: RoleAssignment) => void;
  /**
   * The assignee type the list is narrowed to, or `null` for every type.
   */
  typeFilter: RoleAssigneeType | null;
}

export interface BaseRoleAssignmentsProps {
  assignments: RoleAssignment[];
  /**
   * The identities the role can be assigned to, keyed by assignee type. Assigning is hidden when omitted.
   */
  candidates?: Partial<Record<RoleAssigneeType, IdentityCandidate[]>>;
  /**
   * Renders custom UI in place of the default table and picker. Receives the assignments, the
   * default columns, the candidates, the loading and error state, and the assign and unassign
   * handlers.
   */
  children?: (props: BaseRoleAssignmentsRenderProps) => ReactNode;
  className?: string;
  description?: string;
  error?: string | null;
  isLoading?: boolean;
  isMutating?: boolean;
  onAssign?: (assignment: RoleAssignmentInput) => void;
  /**
   * Narrows the list to one assignee type, on the server, or back to every type with `null`. The type
   * filter shows only when set.
   */
  onTypeFilterChange?: (type: RoleAssigneeType | null) => void;
  /**
   * Removes an assignment. The remove action is hidden when omitted.
   */
  onUnassign?: (assignment: RoleAssignment) => void;
  preferences?: Preferences;
  title?: string;
  /**
   * The assignee type the list is narrowed to, or `null` for every type.
   */
  typeFilter?: RoleAssigneeType | null;
}

/**
 * Lists the users, groups and agents a role is assigned to, and lets the caller assign and unassign
 * it. Holds no data of its own.
 */
const BaseRoleAssignments: FC<BaseRoleAssignmentsProps> = ({
  assignments,
  candidates,
  children,
  className,
  description,
  error = null,
  isLoading = false,
  isMutating = false,
  onAssign,
  onTypeFilterChange,
  onUnassign,
  preferences,
  title,
  typeFilter = null,
}: BaseRoleAssignmentsProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);

  const columns: DataTableColumn<RoleAssignment>[] = [
    {
      header: t('admin.roles.assignments.columns.assignee'),
      id: 'assignee',
      render: (assignment: RoleAssignment): ReactNode => assignment.display ?? assignment.id,
    },
    {
      header: t('admin.roles.assignments.columns.type'),
      id: 'type',
      render: (assignment: RoleAssignment): ReactNode => t(`admin.common.identity_types.${assignment.type}`),
    },
  ];

  if (onUnassign) {
    columns.push({
      header: t('admin.common.columns.actions'),
      id: 'actions',
      render: (assignment: RoleAssignment): ReactNode => (
        <Button
          variant="text"
          color="error"
          size="small"
          disabled={isMutating}
          aria-label={t('admin.roles.assignments.remove_label', {name: assignment.display ?? assignment.id})}
          onClick={(): void => onUnassign(assignment)}
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
          assignments,
          candidates: onAssign ? candidates : undefined,
          columns,
          error,
          isLoading,
          isMutating,
          onAssign: candidates ? onAssign : undefined,
          onTypeFilterChange,
          onUnassign,
          typeFilter,
        })}
      </div>
    );
  }

  return (
    <AdminSection
      block="role-assignments"
      className={className}
      title={title ?? t('admin.roles.assignments.title')}
      description={description}
      headingLevel={3}
      preferences={preferences}
    >
      {onAssign && candidates && (
        <IdentityPicker<RoleAssigneeType>
          addLabel={t('admin.roles.assignments.add')}
          candidates={candidates}
          excludedIds={assignments.map((assignment: RoleAssignment) => assignment.id)}
          isSubmitting={isMutating}
          onAdd={onAssign}
          types={(['user', 'group', 'agent', 'app'] as RoleAssigneeType[])
            .filter((type: RoleAssigneeType) => candidates[type] !== undefined)
            .map((type: RoleAssigneeType) => ({label: t(`admin.common.identity_types.${type}`), value: type}))}
        />
      )}
      {onTypeFilterChange && (
        <div style={{maxWidth: '16rem'}}>
          <Select
            label={t('admin.common.filters.type')}
            name="assigneeType"
            value={typeFilter ?? ''}
            options={[
              {label: t('admin.common.filters.all_types'), value: ''},
              ...(['user', 'group', 'agent', 'app'] as RoleAssigneeType[]).map((type: RoleAssigneeType) => ({
                label: t(`admin.common.identity_types.${type}`),
                value: type,
              })),
            ]}
            onChange={(event: ChangeEvent<HTMLSelectElement>): void =>
              onTypeFilterChange((event.target.value || null) as RoleAssigneeType | null)
            }
          />
        </div>
      )}
      <DataTable
        caption={title?.length ? title : t('admin.roles.assignments.title')}
        columns={columns}
        rows={assignments}
        getRowId={(assignment: RoleAssignment): string => `${assignment.type}:${assignment.id}`}
        isLoading={isLoading}
        error={error}
        emptyText={t('admin.roles.assignments.empty')}
      />
    </AdminSection>
  );
};

export default BaseRoleAssignments;
