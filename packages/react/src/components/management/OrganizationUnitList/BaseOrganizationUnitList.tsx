// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {OrganizationUnitBasic, Preferences} from '@thunderid/browser';
import {FC, ReactElement, ReactNode} from 'react';
import useTranslation from '../../../hooks/useTranslation';
import DataTable, {DataTableColumn} from '../../primitives/DataTable/DataTable';
import {AdminListRenderProps} from '../shared/AdminListRenderProps';
import AdminSection from '../shared/AdminSection';

/**
 * What {@link BaseOrganizationUnitList} hands its `children` render function. `organizationUnits` and `rows` are the
 * same array.
 */
export type BaseOrganizationUnitListRenderProps = AdminListRenderProps<OrganizationUnitBasic> & {
  organizationUnits: OrganizationUnitBasic[];
};

export interface BaseOrganizationUnitListProps {
  /**
   * Controls rendered next to the title, such as a button that opens `OrganizationUnitCreate`.
   */
  actions?: ReactNode;
  /**
   * Renders custom UI in place of the default table. Receives the units, the default columns, the
   * loading and error state, and the pagination and selection handlers.
   */
  children?: (props: BaseOrganizationUnitListRenderProps) => ReactNode;
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
   * Called when a unit is chosen. Rows are selectable only when set.
   */
  onSelect?: (organizationUnit: OrganizationUnitBasic) => void;
  organizationUnits: OrganizationUnitBasic[];
  preferences?: Preferences;
  selectedOrganizationUnitId?: string;
  /**
   * Heading of the list. Pass an empty string to hide it.
   */
  title?: string;
  totalResults?: number;
}

/**
 * Lists organization units with their handle and description. Holds no data of its own: pass the
 * page of units and handle selection and pagination.
 */
const BaseOrganizationUnitList: FC<BaseOrganizationUnitListProps> = ({
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
  organizationUnits,
  preferences,
  selectedOrganizationUnitId,
  title,
  totalResults,
}: BaseOrganizationUnitListProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);

  const columns: DataTableColumn<OrganizationUnitBasic>[] = [
    {
      header: t('admin.organization_units.fields.name'),
      id: 'name',
      render: (unit: OrganizationUnitBasic): ReactNode => unit.name,
    },
    {
      header: t('admin.organization_units.fields.handle'),
      id: 'handle',
      render: (unit: OrganizationUnitBasic): ReactNode => unit.handle,
    },
    {
      header: t('admin.organization_units.fields.description'),
      id: 'description',
      render: (unit: OrganizationUnitBasic): ReactNode => unit.description ?? '',
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
          organizationUnits,
          rows: organizationUnits,
          selectedRowId: selectedOrganizationUnitId,
          totalResults: totalResults ?? organizationUnits.length,
        })}
      </div>
    );
  }

  return (
    <AdminSection
      block="organization-unit-list"
      className={className}
      title={title ?? t('admin.organization_units.list.title')}
      description={description}
      actions={actions}
      preferences={preferences}
    >
      <DataTable
        caption={title?.length ? title : t('admin.organization_units.list.title')}
        columns={columns}
        rows={organizationUnits}
        getRowId={(unit: OrganizationUnitBasic): string => unit.id}
        isLoading={isLoading}
        error={error}
        emptyText={t('admin.organization_units.list.empty')}
        onRowClick={onSelect}
        selectedRowId={selectedOrganizationUnitId}
        pagination={
          onPageChange
            ? {limit, offset, onChange: onPageChange, total: totalResults ?? organizationUnits.length}
            : undefined
        }
      />
    </AdminSection>
  );
};

export default BaseOrganizationUnitList;
