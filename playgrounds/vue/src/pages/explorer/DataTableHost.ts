// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {DataTable, DataTableColumn} from '@thunderid/vue';
import {Component, defineComponent, h, PropType, Ref, ref, VNode} from 'vue';
import {bool, num, quoted, str} from './storyKit';
import type {Action, Args} from './types';

interface DataTableRow {
  id: string;
  name: string;
  role: string;
  status: string;
}

const DATA_TABLE_ROWS: DataTableRow[] = [
  {id: 'm1', name: 'Liam Chen', role: 'Administrator', status: 'Active'},
  {id: 'm2', name: 'Ava Patel', role: 'Viewer', status: 'Active'},
  {id: 'm3', name: 'Noah Kim', role: 'Viewer', status: 'Invited'},
  {id: 'm4', name: 'Mia Rossi', role: 'Support', status: 'Suspended'},
  {id: 'm5', name: 'Ethan Brooks', role: 'Viewer', status: 'Active'},
];

const DATA_TABLE_COLUMNS: DataTableColumn<DataTableRow>[] = [
  {header: 'Name', id: 'name', render: (row: DataTableRow) => row.name},
  {header: 'Role', id: 'role', render: (row: DataTableRow) => row.role},
  {header: 'Status', id: 'status', render: (row: DataTableRow) => row.status},
];

/** Holds a DataTable's selection and page so the story behaves like a real list. */
const DataTableHost: Component = defineComponent({
  name: 'DataTableHost',
  props: {
    action: {required: true, type: Function as PropType<Action>},
    args: {required: true, type: Object as PropType<Args>},
  },
  setup(props: {action: Action; args: Args}): () => VNode {
    const selected: Ref<string | undefined> = ref<string | undefined>();
    const offset: Ref<number> = ref<number>(0);

    return (): VNode => {
      const {args} = props;
      const limit: number = Math.max(1, num(args, 'limit'));
      const rows: DataTableRow[] = bool(args, 'empty') ? [] : DATA_TABLE_ROWS;
      const paginated: boolean = bool(args, 'paginated');

      return h(DataTable, {
        caption: str(args, 'caption'),
        columns: DATA_TABLE_COLUMNS,
        emptyText: str(args, 'emptyText'),
        error: str(args, 'error') || null,
        getRowId: (row: DataTableRow) => row.id,
        isLoading: bool(args, 'isLoading'),
        onRowClick: bool(args, 'selectable')
          ? (row: DataTableRow): void => {
              selected.value = row.id;
              props.action('row-click', quoted(row.name));
            }
          : undefined,
        pagination: paginated
          ? {
              limit,
              offset: offset.value,
              onChange: (next: number): void => {
                offset.value = next;
                props.action('pagination.onChange', String(next));
              },
              total: rows.length,
            }
          : undefined,
        rows: paginated ? rows.slice(offset.value, offset.value + limit) : rows,
        selectedRowId: bool(args, 'selectable') ? selected.value : undefined,
      });
    };
  },
});

export default DataTableHost;
