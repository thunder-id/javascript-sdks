// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {GroupListResponse, GroupQueryKeys, getGroups, toManagementErrorMessage} from '@thunderid/browser';
import {FC, ReactElement, useState} from 'react';
import BaseGroupList, {BaseGroupListProps} from './BaseGroupList';
import useManagementEndpoint, {ManagementEndpoint} from '../../../hooks/management/useManagementEndpoint';
import useResourceQuery, {ResourceQueryResult} from '../../../hooks/management/useResourceQuery';
import useTranslation from '../../../hooks/useTranslation';

export type GroupListProps = Omit<
  BaseGroupListProps,
  'error' | 'groups' | 'isLoading' | 'offset' | 'onPageChange' | 'totalResults'
>;

/**
 * Lists the groups the signed-in user is allowed to see, a page at a time.
 *
 * @example
 * ```tsx
 * <GroupList onSelect={(group) => setSelectedGroupId(group.id)} />
 * ```
 */
const GroupList: FC<GroupListProps> = ({limit = 20, preferences, ...rest}: GroupListProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const [offset, setOffset] = useState<number>(0);
  const endpoint: ManagementEndpoint = useManagementEndpoint('groups');
  const {data, error, isLoading}: ResourceQueryResult<GroupListResponse> = useResourceQuery(
    [GroupQueryKeys.GROUPS, {limit, offset}],
    (fetcher) => getGroups({...endpoint, fetcher, limit, offset}),
  );

  return (
    <BaseGroupList
      groups={data?.groups ?? []}
      totalResults={data?.totalResults}
      isLoading={isLoading}
      error={toManagementErrorMessage(t, error, 'admin.groups.list.error')}
      limit={limit}
      offset={offset}
      onPageChange={setOffset}
      preferences={preferences}
      {...rest}
    />
  );
};

export default GroupList;
