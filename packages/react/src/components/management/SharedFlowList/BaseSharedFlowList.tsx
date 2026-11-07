// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ManagedFlow, Preferences} from '@thunderid/browser';
import {FC, ReactElement, ReactNode} from 'react';
import useTranslation from '../../../hooks/useTranslation';
import DataTable, {DataTableColumn} from '../../primitives/DataTable/DataTable';
import {AdminListRenderProps} from '../shared/AdminListRenderProps';
import AdminSection from '../shared/AdminSection';

/**
 * What {@link BaseSharedFlowList} hands its `children` render function. `flows` and `rows` are the same array.
 */
export type BaseSharedFlowListRenderProps = AdminListRenderProps<ManagedFlow> & {
  flows: ManagedFlow[];
};

export interface BaseSharedFlowListProps {
  /**
   * Controls rendered next to the title.
   */
  actions?: ReactNode;
  /**
   * Renders custom UI in place of the default table. Receives the flows, the default columns, the loading and
   * error state, and the pagination and selection handlers.
   */
  children?: (props: BaseSharedFlowListRenderProps) => ReactNode;
  className?: string;
  description?: string;
  error?: string | null;
  flows: ManagedFlow[];
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
   * Called when a flow is chosen. Rows are selectable only when set.
   */
  onSelect?: (flow: ManagedFlow) => void;
  preferences?: Preferences;
  selectedFlowId?: string;
  /**
   * Heading of the list. Pass an empty string to hide it.
   */
  title?: string;
  totalResults?: number;
}

/**
 * Lists flows with their handle and type. Holds no data of its own: pass the page of flows and handle selection
 * and pagination.
 */
const BaseSharedFlowList: FC<BaseSharedFlowListProps> = ({
  actions,
  children,
  className,
  description,
  error = null,
  flows,
  isLoading = false,
  limit = 20,
  offset = 0,
  onPageChange,
  onSelect,
  preferences,
  selectedFlowId,
  title,
  totalResults,
}: BaseSharedFlowListProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);

  const columns: DataTableColumn<ManagedFlow>[] = [
    {
      header: t('admin.flows.list.columns.name'),
      id: 'name',
      render: (flow: ManagedFlow): ReactNode => flow.name,
    },
    {
      header: t('admin.flows.list.columns.handle'),
      id: 'handle',
      render: (flow: ManagedFlow): ReactNode => (flow.handle ? <code>{flow.handle}</code> : null),
    },
    {
      header: t('admin.flows.list.columns.type'),
      id: 'type',
      render: (flow: ManagedFlow): ReactNode => flow.flowType,
    },
  ];

  if (children) {
    return (
      <div className={className}>
        {children({
          columns,
          error,
          flows,
          isLoading,
          limit,
          offset,
          onPageChange,
          onSelect,
          rows: flows,
          selectedRowId: selectedFlowId,
          totalResults: totalResults ?? flows.length,
        })}
      </div>
    );
  }

  return (
    <AdminSection
      block="shared-flow-list"
      className={className}
      title={title ?? t('admin.flows.list.title')}
      description={description}
      actions={actions}
      preferences={preferences}
    >
      <DataTable
        caption={title?.length ? title : t('admin.flows.list.title')}
        columns={columns}
        rows={flows}
        getRowId={(flow: ManagedFlow): string => flow.id}
        isLoading={isLoading}
        error={error}
        emptyText={t('admin.flows.list.empty')}
        onRowClick={onSelect}
        selectedRowId={selectedFlowId}
        pagination={
          onPageChange ? {limit, offset, onChange: onPageChange, total: totalResults ?? flows.length} : undefined
        }
      />
    </AdminSection>
  );
};

export default BaseSharedFlowList;
