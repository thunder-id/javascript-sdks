// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {BasicAgent, Preferences, getAgentName} from '@thunderid/browser';
import {FC, ReactElement, ReactNode} from 'react';
import useTranslation from '../../../hooks/useTranslation';
import {AccessStatusBadge} from '../../management/shared/AccountLifecycleParts';
import {AdminListRenderProps} from '../../management/shared/AdminListRenderProps';
import {ConfirmButton} from '../../management/shared/AdminParts';
import AdminSection from '../../management/shared/AdminSection';
import Alert from '../../primitives/Alert/Alert';
import DataTable, {DataTableColumn} from '../../primitives/DataTable/DataTable';

/**
 * What {@link BasePersonalAgentList} hands its `children` render function. `agents` and `rows` are the same array.
 */
export type BasePersonalAgentListRenderProps = AdminListRenderProps<BasicAgent> & {
  /**
   * Why the last suspend-all request failed, already translated.
   */
  actionError: string | null;
  agents: BasicAgent[];
  isSuspendingAll: boolean;
  /**
   * Suspends every personal agent of the signed-in user. Undefined when not allowed, or when there are none.
   * The built-in UI asks for confirmation first, and a custom render must too.
   */
  onSuspendAll?: () => void;
  /**
   * How many agents the last suspend-all request suspended, until the list is shown again.
   */
  suspendedCount: number | null;
};

export interface BasePersonalAgentListProps {
  /**
   * Why the last suspend-all request failed, already translated.
   */
  actionError?: string | null;
  /**
   * Controls rendered next to the title.
   */
  actions?: ReactNode;
  agents: BasicAgent[];
  /**
   * Renders custom UI in place of the default table. Receives the agents, the default columns, the loading
   * and error state, the pagination and selection handlers, and the suspend-all action when it is allowed.
   */
  children?: (props: BasePersonalAgentListRenderProps) => ReactNode;
  className?: string;
  description?: string;
  error?: string | null;
  isLoading?: boolean;
  isSuspendingAll?: boolean;
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
   * Called when an agent is chosen. Rows are selectable only when set.
   */
  onSelect?: (agent: BasicAgent) => void;
  /**
   * Suspends every personal agent of the signed-in user. The action is hidden when omitted.
   */
  onSuspendAll?: () => void;
  preferences?: Preferences;
  selectedAgentId?: string;
  suspendedCount?: number | null;
  /**
   * Heading of the list. Pass an empty string to hide it.
   */
  title?: string;
  totalResults?: number;
}

/**
 * Lists the signed-in user's personal agents with their client and status. Holds no data of its own: pass the page of
 * agents and handle selection, pagination and suspending them all.
 */
const BasePersonalAgentList: FC<BasePersonalAgentListProps> = ({
  actionError = null,
  actions,
  agents,
  children,
  className,
  description,
  error = null,
  isLoading = false,
  isSuspendingAll = false,
  limit = 20,
  offset = 0,
  onPageChange,
  onSelect,
  onSuspendAll,
  preferences,
  selectedAgentId,
  suspendedCount = null,
  title,
  totalResults,
}: BasePersonalAgentListProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const canSuspendAll: boolean = Boolean(onSuspendAll) && agents.length > 0;

  const columns: DataTableColumn<BasicAgent>[] = [
    {
      header: t('user.agents.list.columns.name'),
      id: 'name',
      render: (agent: BasicAgent): ReactNode => getAgentName(agent),
    },
    {
      header: t('user.agents.details.client_id'),
      id: 'clientId',
      render: (agent: BasicAgent): ReactNode => <code>{agent.clientId ?? ''}</code>,
    },
    {
      header: t('user.agents.list.columns.status'),
      id: 'status',
      render: (agent: BasicAgent): ReactNode => <AccessStatusBadge status={agent.status?.value} />,
    },
  ];

  if (children) {
    return (
      <div className={className}>
        {children({
          actionError,
          agents,
          columns,
          error,
          isLoading,
          isSuspendingAll,
          limit,
          offset,
          onPageChange,
          onSelect,
          onSuspendAll: canSuspendAll ? onSuspendAll : undefined,
          rows: agents,
          selectedRowId: selectedAgentId,
          suspendedCount,
          totalResults: totalResults ?? agents.length,
        })}
      </div>
    );
  }

  return (
    <AdminSection
      block="personal-agent-list"
      className={className}
      title={title ?? t('user.agents.title')}
      description={description ?? t('user.agents.description')}
      preferences={preferences}
      actions={
        <>
          {actions}
          {onSuspendAll && canSuspendAll && (
            <ConfirmButton
              confirmText={t('user.agents.suspend_all.confirm')}
              isLoading={isSuspendingAll}
              onConfirm={onSuspendAll}
            >
              {t('user.agents.suspend_all.action')}
            </ConfirmButton>
          )}
        </>
      }
    >
      {actionError && (
        <Alert variant="error" role="alert">
          {actionError}
        </Alert>
      )}
      {suspendedCount !== null && (
        <Alert variant="success" role="status">
          {t('user.agents.suspend_all.done', {count: suspendedCount})}
        </Alert>
      )}
      <DataTable
        caption={title?.length ? title : t('user.agents.title')}
        columns={columns}
        rows={agents}
        getRowId={(agent: BasicAgent): string => agent.id}
        isLoading={isLoading}
        error={error}
        emptyText={t('user.agents.list.empty')}
        onRowClick={onSelect}
        selectedRowId={selectedAgentId}
        pagination={
          onPageChange ? {limit, offset, onChange: onPageChange, total: totalResults ?? agents.length} : undefined
        }
      />
    </AdminSection>
  );
};

export default BasePersonalAgentList;
