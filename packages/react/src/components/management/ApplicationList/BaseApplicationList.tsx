// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {BasicApplication, Preferences} from '@thunderid/browser';
import {FC, ReactElement, ReactNode} from 'react';
import useTranslation from '../../../hooks/useTranslation';
import DataTable, {DataTableColumn} from '../../primitives/DataTable/DataTable';
import {AdminListRenderProps} from '../shared/AdminListRenderProps';
import AdminSection from '../shared/AdminSection';

/**
 * What {@link BaseApplicationList} hands its `children` render function. `applications` and `rows` are
 * the same array.
 */
export type BaseApplicationListRenderProps = AdminListRenderProps<BasicApplication> & {
  applications: BasicApplication[];
};

export interface BaseApplicationListProps {
  /**
   * Controls rendered next to the title, such as a button that opens `ApplicationCreate`.
   */
  actions?: ReactNode;
  applications: BasicApplication[];
  /**
   * Renders custom UI in place of the default table, for example a third-party data grid. Receives
   * the applications, the default columns, the loading and error state, and the pagination and
   * selection handlers.
   */
  children?: (props: BaseApplicationListRenderProps) => ReactNode;
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
   * Called when an application is chosen. Rows are selectable only when set.
   */
  onSelect?: (application: BasicApplication) => void;
  preferences?: Preferences;
  selectedApplicationId?: string;
  /**
   * Heading of the list. Pass an empty string to hide it.
   */
  title?: string;
  totalResults?: number;
}

/**
 * The translated access status of an application, or its raw value when the status is one this SDK
 * does not know.
 */
const getStatusLabel = (application: BasicApplication, t: (key: string) => string): string => {
  const value: string | undefined = application.status?.value;

  switch (value?.toUpperCase()) {
    case 'ACTIVE':
      return t('admin.applications.status.active');
    case 'SUSPENDED':
      return t('admin.applications.status.suspended');
    default:
      return value ?? '';
  }
};

/**
 * Lists applications with their client identifier, type and, when the server reports it, access status. Holds no data of its own: pass the page
 * of applications and handle selection and pagination.
 */
const BaseApplicationList: FC<BaseApplicationListProps> = ({
  actions,
  applications,
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
  selectedApplicationId,
  title,
  totalResults,
}: BaseApplicationListProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);

  const columns: DataTableColumn<BasicApplication>[] = [
    {
      header: t('admin.applications.list.columns.name'),
      id: 'name',
      render: (application: BasicApplication): ReactNode => application.name,
    },
    {
      header: t('admin.applications.list.columns.client_id'),
      id: 'clientId',
      render: (application: BasicApplication): ReactNode =>
        application.clientId ? <code>{application.clientId}</code> : null,
    },
    {
      header: t('admin.applications.list.columns.type'),
      id: 'type',
      render: (application: BasicApplication): ReactNode => application.type ?? application.template ?? '',
    },
    // A server that does not report the access status gets no empty status column.
    ...(applications.some((application: BasicApplication) => application.status?.value)
      ? [
          {
            header: t('admin.applications.list.columns.status'),
            id: 'status',
            render: (application: BasicApplication): ReactNode => getStatusLabel(application, t),
          },
        ]
      : []),
  ];

  if (children) {
    return (
      <div className={className}>
        {children({
          applications,
          columns,
          error,
          isLoading,
          limit,
          offset,
          onPageChange,
          onSelect,
          rows: applications,
          selectedRowId: selectedApplicationId,
          totalResults: totalResults ?? applications.length,
        })}
      </div>
    );
  }

  return (
    <AdminSection
      block="application-list"
      className={className}
      title={title ?? t('admin.applications.list.title')}
      description={description}
      actions={actions}
      preferences={preferences}
    >
      <DataTable
        caption={title?.length ? title : t('admin.applications.list.title')}
        columns={columns}
        rows={applications}
        getRowId={(application: BasicApplication): string => application.id}
        isLoading={isLoading}
        error={error}
        emptyText={t('admin.applications.list.empty')}
        onRowClick={onSelect}
        selectedRowId={selectedApplicationId}
        pagination={
          onPageChange ? {limit, offset, onChange: onPageChange, total: totalResults ?? applications.length} : undefined
        }
      />
    </AdminSection>
  );
};

export default BaseApplicationList;
