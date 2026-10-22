// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {toEqualityFilter, toManagementErrorMessage, SelectOption} from '@thunderid/browser';
import {FC, ReactElement, useState} from 'react';
import BaseAgentList, {BaseAgentListProps} from './BaseAgentList';
import {AdminSearchValue} from '../shared/AdminSearch';
import useGetAgents from '../../../../hooks/agents/useGetAgents';
import useTranslation from '../../../../hooks/useTranslation';

export type AgentListProps = Omit<
  BaseAgentListProps,
  'agents' | 'error' | 'isLoading' | 'offset' | 'onPageChange' | 'onSearch' | 'search' | 'totalResults'
> & {
  /**
   * Whether to show the search form. Agents are searched by a custom attribute, by default `name`, and
   * the server matches the whole value.
   * @default true
   */
  searchable?: boolean;
};

/**
 * Lists the agents the signed-in user is allowed to see, a page at a time.
 *
 * @example
 * ```tsx
 * <AgentList onSelect={(agent) => setSelectedAgentId(agent.id)} />
 * ```
 */
const AgentList: FC<AgentListProps> = ({
  limit = 20,
  preferences,
  searchable = true,
  searchAttributes,
  ...rest
}: AgentListProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const [offset, setOffset] = useState<number>(0);
  const [search, setSearch] = useState<AdminSearchValue | null>(null);
  const attributes: SelectOption[] = searchAttributes ?? [{label: t('admin.agents.list.search.name'), value: 'name'}];
  const {data, error, isLoading} = useGetAgents({
    filter: search ? toEqualityFilter(search.attribute, search.value) : undefined,
    limit,
    offset,
  });

  return (
    <BaseAgentList
      agents={data?.agents ?? []}
      totalResults={data?.totalResults}
      isLoading={isLoading}
      error={toManagementErrorMessage(t, error, 'admin.agents.list.error')}
      limit={limit}
      offset={offset}
      onPageChange={setOffset}
      search={search}
      searchAttributes={attributes}
      onSearch={
        searchable
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

export default AgentList;
