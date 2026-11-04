// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {RoleListResponse, RoleQueryKeys, getRoles, toManagementErrorMessage} from '@thunderid/browser';
import {FC, ReactElement, useState} from 'react';
import BaseRoleList, {BaseRoleListProps} from './BaseRoleList';
import useManagementEndpoint, {ManagementEndpoint} from '../../../hooks/management/useManagementEndpoint';
import useResourceQuery, {ResourceQueryResult} from '../../../hooks/management/useResourceQuery';
import useTranslation from '../../../hooks/useTranslation';

export type RoleListProps = Omit<
  BaseRoleListProps,
  'error' | 'isLoading' | 'offset' | 'onPageChange' | 'roles' | 'totalResults'
>;

/**
 * Lists the roles the signed-in user is allowed to see, a page at a time.
 *
 * @example
 * ```tsx
 * <RoleList onSelect={(role) => setSelectedRoleId(role.id)} />
 * ```
 */
const RoleList: FC<RoleListProps> = ({limit = 20, preferences, ...rest}: RoleListProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const [offset, setOffset] = useState<number>(0);
  const endpoint: ManagementEndpoint = useManagementEndpoint('roles');
  const {data, error, isLoading}: ResourceQueryResult<RoleListResponse> = useResourceQuery(
    [RoleQueryKeys.ROLES, {limit, offset}],
    (fetcher) => getRoles({...endpoint, fetcher, limit, offset}),
  );

  return (
    <BaseRoleList
      roles={data?.roles ?? []}
      totalResults={data?.totalResults}
      isLoading={isLoading}
      error={toManagementErrorMessage(t, error, 'admin.roles.list.error')}
      limit={limit}
      offset={offset}
      onPageChange={setOffset}
      preferences={preferences}
      {...rest}
    />
  );
};

export default RoleList;
