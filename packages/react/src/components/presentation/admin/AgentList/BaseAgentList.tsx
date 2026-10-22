// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {BasicAgent, Preferences, SelectOption} from '@thunderid/browser';
import {FC, ReactElement, ReactNode} from 'react';
import useTranslation from '../../../../hooks/useTranslation';
import DataTable, {DataTableColumn} from '../../../primitives/DataTable/DataTable';
import {AdminListRenderProps} from '../shared/AdminListRenderProps';
import AdminSearch, {AdminSearchValue} from '../shared/AdminSearch';
import AdminSection from '../shared/AdminSection';

/**
 * What {@link BaseAgentList} hands its `children` render function. `agents` and `rows` are the same array.
 */
export type BaseAgentListRenderProps = AdminListRenderProps<BasicAgent> & {agents: BasicAgent[]};

export interface BaseAgentListProps {
  /**
   * Controls rendered next to the title, such as a button that opens `AgentCreate`.
   */
  actions?: ReactNode;
  className?: string;
  description?: string;
  agents: BasicAgent[];
  /**
   * Renders custom UI in place of the default table, for example a third-party data grid. Receives
   * the agents, the default columns, the loading and error state, and the pagination and selection
   * handlers.
   */
  children?: (props: BaseAgentListRenderProps) => ReactNode;
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
   * Applies a search on the server, or clears it with `null`. The search form shows only when this and
   * `searchAttributes` are set.
   */
  onSearch?: (search: AdminSearchValue | null) => void;
  /**
   * Called when an agent is chosen. Rows are selectable only when set.
   */
  onSelect?: (agent: BasicAgent) => void;
  preferences?: Preferences;
  /**
   * The search currently applied, if any. While set, an empty page says nothing matched.
   */
  search?: AdminSearchValue | null;
  /**
   * The agent attributes that can be searched, with translated labels.
   */
  searchAttributes?: SelectOption[];
  selectedAgentId?: string;
  /**
   * Heading of the list. Pass an empty string to hide it.
   */
  title?: string;
  totalResults?: number;
}

/**
 * Lists agents with their type, client and organization unit. Holds no data of its own: pass the
 * page of agents and handle selection and pagination.
 */
const BaseAgentList: FC<BaseAgentListProps> = ({
  actions,
  agents,
  children,
  className,
  description,
  error = null,
  isLoading = false,
  limit = 20,
  offset = 0,
  onPageChange,
  onSearch,
  onSelect,
  preferences,
  search = null,
  searchAttributes,
  selectedAgentId,
  title,
  totalResults,
}: BaseAgentListProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);

  const columns: DataTableColumn<BasicAgent>[] = [
    {header: t('admin.agents.list.columns.name'), id: 'name', render: (agent: BasicAgent): ReactNode => agent.name},
    {header: t('admin.agents.list.columns.type'), id: 'type', render: (agent: BasicAgent): ReactNode => agent.type},
    {
      header: t('admin.agents.list.columns.client_id'),
      id: 'clientId',
      render: (agent: BasicAgent): ReactNode => <code>{agent.clientId ?? ''}</code>,
    },
    {
      header: t('admin.common.columns.organization_unit'),
      id: 'ou',
      render: (agent: BasicAgent): ReactNode => agent.ouHandle ?? agent.ouId,
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
          onSearch,
          rows: agents,
          search,
          searchAttributes,
          selectedRowId: selectedAgentId,
          totalResults: totalResults ?? agents.length,
          agents,
        })}
      </div>
    );
  }

  return (
    <AdminSection
      block="agent-list"
      className={className}
      title={title ?? t('admin.agents.list.title')}
      description={description}
      actions={actions}
      preferences={preferences}
    >
      {onSearch && searchAttributes?.length ? (
        <AdminSearch attributes={searchAttributes} search={search} onSearch={onSearch} />
      ) : null}
      <DataTable
        caption={title?.length ? title : t('admin.agents.list.title')}
        columns={columns}
        rows={agents}
        getRowId={(agent: BasicAgent): string => agent.id}
        isLoading={isLoading}
        error={error}
        emptyText={search ? t('admin.common.search.no_results', {value: search.value}) : t('admin.agents.list.empty')}
        onRowClick={onSelect}
        selectedRowId={selectedAgentId}
        pagination={
          onPageChange ? {limit, offset, onChange: onPageChange, total: totalResults ?? agents.length} : undefined
        }
      />
    </AdminSection>
  );
};

export default BaseAgentList;
