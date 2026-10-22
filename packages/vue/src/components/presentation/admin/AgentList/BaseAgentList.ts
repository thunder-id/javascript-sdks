// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type BasicAgent} from '@thunderid/browser';
import {type Component, type VNodeChild, h} from 'vue';
import createAdminList from '../shared/createAdminList';
import type {AdminTranslate} from '../shared/useAdminTranslation';

/**
 * Lists agents with their type, client identifier and organization unit. Holds no data of its own:
 * pass the page of agents and handle selection and pagination.
 *
 * Props: `agents` (required), `selectedAgentId`, `isLoading`, `error`, `limit`, `offset`, `totalResults`,
 * `onPageChange`, `onSelect` (`@select`), `title`, `description`, `className`, `preferences`.
 * Slots: `actions`, rendered next to the title; `default`, a scoped slot that replaces the table with custom UI and
 * receives `AdminListRenderProps` (rows, default columns, loading and error state, pagination and selection).
 */
const BaseAgentList: Component = createAdminList<BasicAgent>({
  block: 'agent-list',
  columns: (t: AdminTranslate) => [
    {header: t('admin.agents.list.columns.name'), id: 'name', render: (agent: BasicAgent): VNodeChild => agent.name},
    {header: t('admin.agents.list.columns.type'), id: 'type', render: (agent: BasicAgent): VNodeChild => agent.type},
    {
      header: t('admin.agents.list.columns.client_id'),
      id: 'clientId',
      render: (agent: BasicAgent): VNodeChild => h('code', {}, agent.clientId ?? ''),
    },
    {
      header: t('admin.common.columns.organization_unit'),
      id: 'ou',
      render: (agent: BasicAgent): VNodeChild => agent.ouHandle ?? agent.ouId,
    },
  ],
  emptyKey: 'admin.agents.list.empty',
  getRowId: (row: BasicAgent): string => row.id,
  name: 'BaseAgentList',
  rowsProp: 'agents',
  selectedProp: 'selectedAgentId',
  titleKey: 'admin.agents.list.title',
});

export default BaseAgentList;
