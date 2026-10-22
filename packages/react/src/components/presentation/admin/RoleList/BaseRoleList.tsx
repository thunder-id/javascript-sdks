// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Preferences, RoleSummary} from '@thunderid/browser';
import {FC, ReactElement, ReactNode} from 'react';
import useTranslation from '../../../../hooks/useTranslation';
import DataTable, {DataTableColumn} from '../../../primitives/DataTable/DataTable';
import {AdminListRenderProps} from '../shared/AdminListRenderProps';
import AdminSection from '../shared/AdminSection';

/**
 * What {@link BaseRoleList} hands its `children` render function. `roles` and `rows` are the same array.
 */
export type BaseRoleListRenderProps = AdminListRenderProps<RoleSummary> & {roles: RoleSummary[]};

export interface BaseRoleListProps {
  /**
   * Controls rendered next to the title, such as a button that opens `RoleCreate`.
   */
  actions?: ReactNode;
  /**
   * Renders custom UI in place of the default table, for example a third-party data grid. Receives
   * the roles, the default columns, the loading and error state, and the pagination and selection
   * handlers.
   */
  children?: (props: BaseRoleListRenderProps) => ReactNode;
  className?: string;
  description?: string;
  error?: string | null;
  isLoading?: boolean;
  /**
   * Page size.
   * @default 20
   */
  limit?: number;
  offset?: number;
  /**
   * Called with the offset of the page to show. Pagination is hidden when omitted.
   */
  onPageChange?: (offset: number) => void;
  /**
   * Called when a role is chosen. Rows are selectable only when set.
   */
  onSelect?: (role: RoleSummary) => void;
  preferences?: Preferences;
  roles: RoleSummary[];
  selectedRoleId?: string;
  /**
   * Heading of the list. Pass an empty string to hide it.
   */
  title?: string;
  totalResults?: number;
}

/**
 * Lists roles with their description and organization unit. Holds no data of its own: pass the
 * page of roles and handle selection and pagination.
 */
const BaseRoleList: FC<BaseRoleListProps> = ({
  actions,
  children,
  className,
  description,
  error = null,
  isLoading = false,
  limit = 20,
  offset = 0,
  onPageChange,
  onSelect,
  preferences,
  roles,
  selectedRoleId,
  title,
  totalResults,
}: BaseRoleListProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);

  const columns: DataTableColumn<RoleSummary>[] = [
    {header: t('admin.roles.list.columns.name'), id: 'name', render: (role: RoleSummary): ReactNode => role.name},
    {
      header: t('admin.roles.list.columns.description'),
      id: 'description',
      render: (role: RoleSummary): ReactNode => role.description ?? '',
    },
    {
      header: t('admin.common.columns.organization_unit'),
      id: 'ou',
      render: (role: RoleSummary): ReactNode => role.ouHandle ?? role.ouId,
    },
  ];

  if (children) {
    return (
      <div className={className}>
        {children({
          columns,
          error,
          isLoading,
          limit,
          offset,
          onPageChange,
          onSelect,
          rows: roles,
          selectedRowId: selectedRoleId,
          totalResults: totalResults ?? roles.length,
          roles,
        })}
      </div>
    );
  }

  return (
    <AdminSection
      block="role-list"
      className={className}
      title={title ?? t('admin.roles.list.title')}
      description={description}
      actions={actions}
      preferences={preferences}
    >
      <DataTable
        caption={title?.length ? title : t('admin.roles.list.title')}
        columns={columns}
        rows={roles}
        getRowId={(role: RoleSummary): string => role.id}
        isLoading={isLoading}
        error={error}
        emptyText={t('admin.roles.list.empty')}
        onRowClick={onSelect}
        selectedRowId={selectedRoleId}
        pagination={
          onPageChange ? {limit, offset, onChange: onPageChange, total: totalResults ?? roles.length} : undefined
        }
      />
    </AdminSection>
  );
};

export default BaseRoleList;
