// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {str} from './helpers';
import type {Args, ComponentDef, PropControl, Snippet} from './types';

/** The `source` control of the management area stories: Base with samples, the live SDK, or MUI. */
export const AREA_SOURCE: PropControl = {
  control: ['base', 'live', 'custom'],
  description:
    'base renders the Base component with sample data; live uses the SDK context and the server; custom renders the Base component with sample data through its children render function, drawn with MUI.',
  name: 'source',
  type: "'base' | 'live' | 'custom' (playground only)",
};

export const source = (args: Args): string => str(args, 'source');

export const LIST_AREA_CONTROLS: PropControl[] = [
  AREA_SOURCE,
  {control: 'text', description: 'Heading; empty uses the translated default.', name: 'title', type: 'string'},
  {control: 'number', description: 'Rows per page.', name: 'limit', type: 'number'},
  {
    control: 'bool',
    description: 'Passes onSelect, which makes rows choosable (playground toggle).',
    name: 'selectable',
    type: '(row) => void',
  },
  {control: 'bool', description: 'Base only: shows the loading row.', name: 'isLoading', type: 'boolean'},
  {control: 'text', description: 'Base only: error shown above the table.', name: 'error', type: 'string | null'},
  {control: 'bool', description: 'Base only: renders with no rows (playground only).', name: 'empty', type: 'boolean'},
];

export const LIST_AREA_DEFAULTS: Args = {
  empty: false,
  error: '',
  isLoading: false,
  limit: 3,
  selectable: true,
  source: 'base',
  title: '',
};

export const listAreaStories = (live: string): ComponentDef['stories'] => [
  {id: 'base', name: 'Sample data'},
  {args: {isLoading: true}, id: 'loading', name: 'Loading'},
  {args: {error: 'You do not have permission to view this.'}, id: 'error', name: 'Error'},
  {args: {source: 'custom'}, id: 'custom', name: 'Custom rendering'},
  {args: {limit: 20, source: 'live'}, id: 'live', name: live},
];

export const MUI_GRID_IMPORT = "import {DataGrid} from '@mui/x-data-grid';";

/** The custom rendering snippet of a list: its render props drawn as an MUI DataGrid. */
export const muiListSnippet = (tag: string, rows: string, extra = ''): Snippet => ({
  imports: [tag],
  jsx: `<${tag}${extra} limit={10} onSelect={(row) => navigate(row.id)}>
  {({${rows}, columns, isLoading, limit, offset, totalResults, onPageChange, onSelect}) => (
    <DataGrid
      rows={${rows}}
      columns={columns.map((column) => ({field: column.id, headerName: column.header, renderCell: ({row}) => column.render(row)}))}
      loading={isLoading}
      paginationMode="server"
      rowCount={totalResults}
      paginationModel={{page: offset / limit, pageSize: limit}}
      onPaginationModelChange={(model) => onPageChange?.(model.page * model.pageSize)}
      onRowClick={({row}) => onSelect?.(row)}
    />
  )}
</${tag}>`,
  otherImports: [MUI_GRID_IMPORT],
});
