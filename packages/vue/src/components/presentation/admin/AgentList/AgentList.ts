// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {AgentListResponse, BasicAgent} from '@thunderid/browser';
import type {Component} from 'vue';
import BaseAgentList from './BaseAgentList';
import useGetAgents from '../../../../composables/agents/useGetAgents';
import createConnectedAdminList from '../shared/createConnectedAdminList';
import type {AdminTranslate} from '../shared/useAdminTranslation';

/**
 * Lists the agents the signed-in user is allowed to see, a page at a time.
 *
 * Props: `searchable` (default `true`; shows a search form the server matches exactly), `searchAttributes`, `limit`, `selectedAgentId`, `onSelect` (`@select`), `title`, `description`, `className`,
 * `preferences`. Slots: `actions`; `default`, a scoped slot that replaces the table with custom UI and
 * receives `AdminListRenderProps` (rows, default columns, loading and error state, pagination and selection).
 *
 * @example
 * ```vue
 * <AgentList @select="(agent) => (selectedAgentId = agent.id)" />
 * ```
 */
const AgentList: Component = createConnectedAdminList<AgentListResponse, BasicAgent>({
  base: BaseAgentList,
  errorKey: 'admin.agents.list.error',
  name: 'AgentList',
  query: (params: () => Record<string, unknown>) =>
    useGetAgents(() => params() as {filter?: string; limit?: number; offset?: number}),
  rows: (data: AgentListResponse | undefined) => data?.agents ?? [],
  rowsProp: 'agents',
  searchAttributes: (t: AdminTranslate) => [{label: t('admin.agents.list.search.name'), value: 'name'}],
  selectedProp: 'selectedAgentId',
  total: (data: AgentListResponse | undefined) => data?.totalResults,
});

export default AgentList;
