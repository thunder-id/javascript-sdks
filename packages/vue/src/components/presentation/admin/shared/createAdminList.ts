// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {Preferences, SelectOption} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';
import AdminSearch, {type AdminSearchValue} from './AdminSearch';
import AdminSection from './AdminSection';
import useAdminTranslation, {type AdminTranslate} from './useAdminTranslation';
import DataTable, {type DataTableColumn} from '../../../primitives/DataTable/DataTable';

/**
 * Describes one of the admin list components (`BaseUserList`, `BaseGroupList`, ...).
 */
export interface AdminListDefinition<T> {
  /** BEM block of the component. */
  block: string;
  /** Builds the columns with the active translation function. */
  columns: (t: AdminTranslate) => DataTableColumn<T>[];
  /** Translation key of the message shown when there are no rows. */
  emptyKey: string;
  /** Returns a row's identifier. */
  getRowId: (row: T) => string;
  /** Component name. */
  name: string;
  /** Name of the prop that carries the rows, for example `users`. */
  rowsProp: string;
  /** Name of the prop that carries the selected row's identifier, for example `selectedUserId`. */
  selectedProp: string;
  /** Translation key of the default title. */
  titleKey: string;
}

/**
 * What an admin list hands its default scoped slot, so the rows can be shown with any UI, such as a
 * third-party data grid. The rows are also passed under the list's own name, for example `users`.
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
  /** Shows the page that starts at `offset`. Undefined when the list is not paginated. */
  onPageChange?: (offset: number) => void;
  /** Applies a search, or clears it with `null`. Undefined when the list cannot be searched. */
  onSearch?: (search: AdminSearchValue | null) => void;
  /** Chooses a row. Undefined when rows are not selectable. */
  onSelect?: (row: T) => void;
  rows: T[];
  /** The search currently applied, if any. */
  search?: AdminSearchValue | null;
  /** The attributes that can be searched, with translated labels. */
  searchAttributes?: SelectOption[];
  selectedRowId?: string;
  /** Total number of rows on the server, or the number of rows given when unknown. */
  totalResults: number;
}

/**
 * Props shared by every admin list. The rows and selected row props are added per list.
 */
export const adminListProps = {
  /** Extra CSS class added to the root element. */
  className: {default: '', type: String},
  /** Text shown under the title. */
  description: {default: undefined, type: String},
  /** An error message, already translated. */
  error: {default: null, type: String as PropType<string | null>},
  /** Whether the rows are being fetched. */
  isLoading: {default: false, type: Boolean},
  /** Page size. */
  limit: {default: 20, type: Number},
  /** Offset of the page being shown. */
  offset: {default: 0, type: Number},
  /** Called with the offset of the page to show. Pagination is hidden when omitted. Also available as `@page-change`. */
  onPageChange: {default: undefined, type: Function as PropType<(offset: number) => void>},
  /**
   * Applies a search on the server, or clears it with `null`. The search form shows only when this and
   * `searchAttributes` are set. Also available as `@search`.
   */
  onSearch: {default: undefined, type: Function as PropType<(search: AdminSearchValue | null) => void>},
  /** Called when a row is chosen. Rows are selectable only when set. Also available as `@select`. */
  onSelect: {default: undefined, type: Function as PropType<(row: never) => void>},
  /** Component-level preferences, for example `i18n.bundles` overrides. */
  preferences: {default: undefined, type: Object as PropType<Preferences>},
  /** The search currently applied. While set, an empty page says nothing matched. */
  search: {default: null, type: Object as PropType<AdminSearchValue | null>},
  /** The attributes that can be searched, with translated labels. */
  searchAttributes: {default: undefined, type: Array as PropType<SelectOption[]>},
  /** Heading of the list. Pass an empty string to hide it. */
  title: {default: undefined, type: String},
  /** Total number of rows on the server, used for pagination. */
  totalResults: {default: undefined, type: Number},
} as const;

/**
 * Creates a presentational admin list: a titled section with an accessible, paginated table. Holds no
 * data of its own. Slots: `actions`, rendered next to the title, and `default`, a scoped slot that
 * replaces the table with custom UI and receives {@link AdminListRenderProps}.
 *
 * @param definition - What the list shows.
 * @returns The component.
 */
const createAdminList = <T>(definition: AdminListDefinition<T>): Component =>
  defineComponent({
    name: definition.name,
    props: {
      ...adminListProps,
      [definition.rowsProp]: {required: true, type: Array as PropType<T[]>},
      [definition.selectedProp]: {default: undefined, type: String},
    },
    setup(props: Record<string, unknown>, {slots}: SetupContext): () => VNode {
      const t: AdminTranslate = useAdminTranslation(() => props['preferences'] as Preferences | undefined);

      return (): VNode => {
        const rows: T[] = props[definition.rowsProp] as T[];
        const title: string | undefined = props['title'] as string | undefined;
        const onPageChange: ((offset: number) => void) | undefined = props['onPageChange'] as
          | ((offset: number) => void)
          | undefined;
        const columns: DataTableColumn<T>[] = definition.columns(t);
        const search: AdminSearchValue | null = props['search'] as AdminSearchValue | null;
        const searchAttributes: SelectOption[] | undefined = props['searchAttributes'] as SelectOption[] | undefined;
        const onSearch: ((next: AdminSearchValue | null) => void) | undefined = props['onSearch'] as
          | ((next: AdminSearchValue | null) => void)
          | undefined;

        if (slots['default']) {
          const slotProps: AdminListRenderProps<T> & Record<string, unknown> = {
            columns,
            error: props['error'] as string | null,
            isLoading: props['isLoading'] as boolean,
            limit: props['limit'] as number,
            offset: props['offset'] as number,
            onPageChange,
            onSearch,
            onSelect: props['onSelect'] as ((row: T) => void) | undefined,
            rows,
            search,
            searchAttributes,
            selectedRowId: props[definition.selectedProp] as string | undefined,
            totalResults: (props['totalResults'] as number | undefined) ?? rows.length,
            [definition.rowsProp]: rows,
          };

          return h('div', {class: props['className'] as string}, slots['default'](slotProps));
        }

        return h(
          AdminSection,
          {
            block: definition.block,
            className: props['className'] as string,
            description: props['description'] as string | undefined,
            title: title ?? t(definition.titleKey),
          },
          {
            actions: slots['actions'],
            default: (): (VNode | null)[] => [
              onSearch && searchAttributes?.length
                ? h(AdminSearch, {attributes: searchAttributes, onSearch, search, t})
                : null,
              h(DataTable, {
                caption: title?.length ? title : t(definition.titleKey),
                columns,
                emptyText: search ? t('admin.common.search.no_results', {value: search.value}) : t(definition.emptyKey),
                error: props['error'] as string | null,
                getRowId: definition.getRowId,
                isLoading: props['isLoading'] as boolean,
                onRowClick: props['onSelect'] as ((row: T) => void) | undefined,
                pagination: onPageChange
                  ? {
                      limit: props['limit'] as number,
                      offset: props['offset'] as number,
                      onChange: onPageChange,
                      total: (props['totalResults'] as number | undefined) ?? rows.length,
                    }
                  : undefined,
                rows,
                selectedRowId: props[definition.selectedProp] as string | undefined,
                t,
              }),
            ],
          },
        );
      };
    },
  });

export default createAdminList;
