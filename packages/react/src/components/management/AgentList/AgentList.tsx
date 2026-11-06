// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AgentListResponse,
  AgentQueryKeys,
  SelectOption,
  getAgents,
  toEqualityFilter,
  toManagementErrorMessage,
} from '@thunderid/browser';
import {FC, ReactElement, useState} from 'react';
import BaseAgentList, {BaseAgentListProps} from './BaseAgentList';
import useThunderID from '../../../contexts/ThunderID/useThunderID';
import useManagementEndpoint, {ManagementEndpoint} from '../../../hooks/management/useManagementEndpoint';
import useResourceQuery, {ResourceQueryResult} from '../../../hooks/management/useResourceQuery';
import useTranslation from '../../../hooks/useTranslation';
import {AdminSearchValue} from '../shared/AdminSearch';

export type AgentListProps = Omit<
  BaseAgentListProps,
  'agents' | 'error' | 'isLoading' | 'offset' | 'onPageChange' | 'onSearch' | 'search' | 'totalResults'
> & {
  /**
   * Whether to show the search form. Agents are searched by a custom attribute, by default `name`, and
   * the server matches the whole value. The server can't combine a search with a project, so the form
   * is hidden while a project scopes the list.
   * @default true
   */
  searchable?: boolean;
  /**
   * Lists the agents this project's root organization unit owns, followed by the ones shared into it.
   * Defaults to the current project (see `ProjectSwitcher`) when one is chosen.
   */
  projectId?: string;
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
  projectId,
  searchable = true,
  searchAttributes,
  ...rest
}: AgentListProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const [offset, setOffset] = useState<number>(0);
  const [search, setSearch] = useState<AdminSearchValue | null>(null);
  const attributes: SelectOption[] = searchAttributes ?? [{label: t('admin.agents.list.search.name'), value: 'name'}];
  const {currentProject} = useThunderID();
  const resolvedProjectId: string | undefined = projectId ?? currentProject?.id;
  const endpoint: ManagementEndpoint = useManagementEndpoint('agents');
  // The server refuses any filter but `ouId` alongside `projectId`, so a project-scoped list is never searched.
  const filter: string | undefined =
    search && !resolvedProjectId ? toEqualityFilter(search.attribute, search.value) : undefined;
  const {data, error, isLoading}: ResourceQueryResult<AgentListResponse> = useResourceQuery(
    [AgentQueryKeys.AGENTS, {filter, limit, offset, projectId: resolvedProjectId}],
    (fetcher) => getAgents({...endpoint, fetcher, filter, limit, offset, projectId: resolvedProjectId}),
  );

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
        searchable && !resolvedProjectId
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
