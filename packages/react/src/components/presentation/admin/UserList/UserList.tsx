// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {toEqualityFilter, toManagementErrorMessage, SelectOption} from '@thunderid/browser';
import {FC, ReactElement, useState} from 'react';
import BaseUserList, {BaseUserListProps} from './BaseUserList';
import {AdminSearchValue} from '../shared/AdminSearch';
import useGetUsers from '../../../../hooks/users/useGetUsers';
import useTranslation from '../../../../hooks/useTranslation';

export type UserListProps = Omit<
  BaseUserListProps,
  'error' | 'isLoading' | 'offset' | 'onPageChange' | 'onSearch' | 'search' | 'totalResults' | 'users'
> & {
  /**
   * Server-side filter expression, for example `username eq "ada"`. Hides the search form, since the
   * server takes one expression.
   */
  filter?: string;
  /**
   * Whether to show the search form. The server matches the whole value of the chosen attribute.
   * @default true
   */
  searchable?: boolean;
};

/**
 * Lists the users the signed-in user is allowed to see, a page at a time.
 *
 * @example
 * ```tsx
 * <UserList onSelect={(user) => setSelectedUserId(user.id)} />
 * ```
 */
const UserList: FC<UserListProps> = ({
  filter,
  limit = 20,
  preferences,
  searchable = true,
  searchAttributes,
  ...rest
}: UserListProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const [offset, setOffset] = useState<number>(0);
  const [search, setSearch] = useState<AdminSearchValue | null>(null);
  const attributes: SelectOption[] = searchAttributes ?? [
    {label: t('admin.users.list.search.username'), value: 'username'},
    {label: t('admin.users.list.search.email'), value: 'email'},
  ];
  const {data, error, isLoading} = useGetUsers({
    filter: filter ?? (search ? toEqualityFilter(search.attribute, search.value) : undefined),
    limit,
    offset,
  });

  return (
    <BaseUserList
      users={data?.users ?? []}
      totalResults={data?.totalResults}
      isLoading={isLoading}
      error={toManagementErrorMessage(t, error, 'admin.users.list.error')}
      limit={limit}
      offset={offset}
      onPageChange={setOffset}
      search={search}
      searchAttributes={attributes}
      onSearch={
        searchable && !filter
          ? (next: AdminSearchValue | null): void => {
              setSearch(next);
              setOffset(0);
            }
          : undefined
      }
      preferences={preferences}
      {...rest}
    />
  );
};

export default UserList;
