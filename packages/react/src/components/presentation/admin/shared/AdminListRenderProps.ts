// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {SelectOption} from '@thunderid/browser';
import {AdminSearchValue} from './AdminSearch';
import {DataTableColumn} from '../../../primitives/DataTable/DataTable';

/**
 * What an admin list hands its `children` render function, so the rows can be shown with any UI,
 * such as a third-party data grid.
 */
export interface AdminListRenderProps<T> {
  /**
   * The columns the default table shows, with translated headers and cell renderers, to reuse in a
   * custom table.
   */
  columns: DataTableColumn<T>[];
  error: string | null;
  isLoading: boolean;
  limit: number;
  offset: number;
  /**
   * Shows the page that starts at `offset`. Undefined when the list is not paginated.
   */
  onPageChange?: (offset: number) => void;
  /**
   * Applies a search, or clears it with `null`. Undefined when the list cannot be searched.
   */
  onSearch?: (search: AdminSearchValue | null) => void;
  /**
   * Chooses a row. Undefined when rows are not selectable.
   */
  onSelect?: (row: T) => void;
  rows: T[];
  /**
   * The search currently applied, if any.
   */
  search?: AdminSearchValue | null;
  /**
   * The attributes that can be searched, with translated labels.
   */
  searchAttributes?: SelectOption[];
  selectedRowId?: string;
  /**
   * Total number of rows on the server, or the number of rows given when unknown.
   */
  totalResults: number;
}
