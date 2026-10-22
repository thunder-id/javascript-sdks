// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {DataTable, Typography} from '@thunderid/react';
import type {Group} from '@thunderid/react';
import {ReactElement, ReactNode, useState} from 'react';
import {bool, str} from './helpers';
import Narrow from './Narrow';
import type {Action, Args} from './types';

/** Shown by a live details story until an identifier is set. */
export const NeedsId = ({name, from}: {from: string; name: string}): ReactElement => (
  <Typography variant="body2">
    Set <code>{name}</code> in Controls: select a row in {from} and copy its id from the Actions panel.
  </Typography>
);

/** Keeps the selected row of a Base list, so the story behaves like the connected list. */
export const SelectableList = ({
  children,
}: {
  children: (selected: string | undefined, select: (id: string) => void) => ReactNode;
}): ReactElement => {
  const [selected, setSelected] = useState<string | undefined>(undefined);

  return <>{children(selected, setSelected)}</>;
};

const TABLE_ROWS: Group[] = [
  {description: 'Everyone who can sign in to the console', id: 'grp_admins', name: 'Administrators', ouId: 'ou_9d1e07'},
  {description: 'Support desk', id: 'grp_support', name: 'Support', ouId: 'ou_9d1e07'},
  {id: 'grp_billing', name: 'Billing', ouId: 'ou_9d1e07'},
];

/** Renders DataTable with sample rows, local selection and one-row pages. */
export const DataTableStory = ({action, args}: {action: Action; args: Args}): ReactElement => {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [offset, setOffset] = useState<number>(0);
  const paginated: boolean = bool(args, 'paginated');
  const all: Group[] = bool(args, 'empty') ? [] : TABLE_ROWS;
  const rows: Group[] = paginated ? all.slice(offset, offset + 1) : all;

  return (
    <Narrow width={560}>
      <DataTable<Group>
        caption={str(args, 'caption')}
        emptyText="No groups"
        columns={[
          {header: 'Name', id: 'name', render: (row: Group) => row.name},
          {header: 'Description', id: 'description', render: (row: Group) => row.description ?? '—'},
          {header: 'ID', id: 'id', render: (row: Group) => <code>{row.id}</code>},
        ]}
        rows={rows}
        getRowId={(row: Group) => row.id}
        isLoading={bool(args, 'isLoading')}
        error={str(args, 'error') || null}
        selectedRowId={selected}
        onRowClick={
          bool(args, 'selectable')
            ? (row: Group) => {
                setSelected(row.id);
                action('onRowClick', row.id);
              }
            : undefined
        }
        pagination={
          paginated
            ? {
                limit: 1,
                offset,
                onChange: (next: number) => {
                  setOffset(next);
                  action('pagination.onChange', String(next));
                },
                total: all.length,
              }
            : undefined
        }
      />
    </Narrow>
  );
};
