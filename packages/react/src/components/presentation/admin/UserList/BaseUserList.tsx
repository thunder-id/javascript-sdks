// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {resolveManagedIdentityName, ManagedUser, Preferences, SelectOption} from '@thunderid/browser';
import {FC, ReactElement, ReactNode} from 'react';
import useTranslation from '../../../../hooks/useTranslation';
import {Avatar} from '../../../primitives/Avatar/Avatar';
import DataTable, {DataTableColumn} from '../../../primitives/DataTable/DataTable';
import {AdminListRenderProps} from '../shared/AdminListRenderProps';
import AdminSearch, {AdminSearchValue} from '../shared/AdminSearch';
import AdminSection from '../shared/AdminSection';

/**
 * What {@link BaseUserList} hands its `children` render function. `users` and `rows` are the same array.
 */
export type BaseUserListRenderProps = AdminListRenderProps<ManagedUser> & {users: ManagedUser[]};

export interface BaseUserListProps {
  /**
   * Controls rendered next to the title, such as a button that opens `UserCreate`.
   */
  actions?: ReactNode;
  /**
   * Renders custom UI in place of the default table, for example a third-party data grid. Receives
   * the users, the default columns, the loading and error state, and the pagination and selection
   * handlers.
   */
  children?: (props: BaseUserListRenderProps) => ReactNode;
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
   * Applies a search on the server, or clears it with `null`. The search form shows only when this and
   * `searchAttributes` are set.
   */
  onSearch?: (search: AdminSearchValue | null) => void;
  /**
   * Called when a user is chosen. Rows are selectable only when set.
   */
  onSelect?: (user: ManagedUser) => void;
  preferences?: Preferences;
  /**
   * The search currently applied, if any. While set, an empty page says nothing matched.
   */
  search?: AdminSearchValue | null;
  /**
   * The user attributes that can be searched, with translated labels.
   */
  searchAttributes?: SelectOption[];
  selectedUserId?: string;
  /**
   * Heading of the list. Pass an empty string to hide it.
   */
  title?: string;
  totalResults?: number;
  users: ManagedUser[];
}

/**
 * Lists users with their type and organization unit. Holds no data of its own: pass the page of
 * users and handle selection and pagination.
 */
const BaseUserList: FC<BaseUserListProps> = ({
  actions,
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
  selectedUserId,
  title,
  totalResults,
  users,
}: BaseUserListProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);

  const columns: DataTableColumn<ManagedUser>[] = [
    {
      header: t('admin.users.list.columns.name'),
      id: 'name',
      render: (user: ManagedUser): ReactNode => {
        const name: string = resolveManagedIdentityName(user);
        const email: unknown = user.attributes?.['email'];

        return (
          <span style={{alignItems: 'center', display: 'inline-flex', gap: '0.75em'}}>
            <Avatar name={name} size={32} />
            <span style={{display: 'inline-flex', flexDirection: 'column', gap: '0.15em', textAlign: 'start'}}>
              <span style={{fontWeight: 500}}>{name}</span>
              {typeof email === 'string' && email.length > 0 && email !== name && (
                <span style={{fontSize: '0.85em', opacity: 0.65}}>{email}</span>
              )}
            </span>
          </span>
        );
      },
    },
    {header: t('admin.users.list.columns.type'), id: 'type', render: (user: ManagedUser): ReactNode => user.type},
    {
      header: t('admin.common.columns.organization_unit'),
      id: 'ou',
      render: (user: ManagedUser): ReactNode => user.ouHandle ?? user.ouId,
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
          rows: users,
          search,
          searchAttributes,
          selectedRowId: selectedUserId,
          totalResults: totalResults ?? users.length,
          users,
        })}
      </div>
    );
  }

  return (
    <AdminSection
      block="user-list"
      className={className}
      title={title ?? t('admin.users.list.title')}
      description={description}
      actions={actions}
      preferences={preferences}
    >
      {onSearch && searchAttributes?.length ? (
        <AdminSearch attributes={searchAttributes} search={search} onSearch={onSearch} />
      ) : null}
      <DataTable
        caption={title?.length ? title : t('admin.users.list.title')}
        columns={columns}
        rows={users}
        getRowId={(user: ManagedUser): string => user.id}
        isLoading={isLoading}
        error={error}
        emptyText={search ? t('admin.common.search.no_results', {value: search.value}) : t('admin.users.list.empty')}
        onRowClick={onSelect}
        selectedRowId={selectedUserId}
        pagination={
          onPageChange ? {limit, offset, onChange: onPageChange, total: totalResults ?? users.length} : undefined
        }
      />
    </AdminSection>
  );
};

export default BaseUserList;
