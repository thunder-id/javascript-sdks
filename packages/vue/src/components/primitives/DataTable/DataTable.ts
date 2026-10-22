// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {withVendorCSSClassPrefix} from '@thunderid/browser';
import {type Component, type PropType, type VNode, type VNodeChild, defineComponent, h} from 'vue';
import useI18n from '../../../composables/useI18n';
import Alert from '../Alert/Alert';
import Button from '../Button/Button';
import Spinner from '../Spinner/Spinner';

/**
 * A column of a {@link DataTable}.
 */
export interface DataTableColumn<T> {
  /**
   * Header text, already translated.
   */
  header: string;
  id: string;
  render(row: T): VNodeChild;
}

/**
 * Offset based pagination state of a {@link DataTable}.
 */
export interface DataTablePagination {
  limit: number;
  offset: number;
  /**
   * Called with the offset of the page to show.
   */
  onChange: (offset: number) => void;
  total: number;
}

type Translate = (key: string, params?: Record<string, string | number>) => string;

type DataTableProps = Readonly<{
  caption: string;
  className: string;
  columns: DataTableColumn<unknown>[];
  emptyText: string;
  error: string | null;
  getRowId: (row: unknown) => string;
  isLoading: boolean;
  onRowClick: ((row: unknown) => void) | undefined;
  pagination: DataTablePagination | undefined;
  rows: unknown[];
  selectedRowId: string | undefined;
  t: Translate | undefined;
}>;

/**
 * Lists management resources in an accessible table with optional row selection and offset based
 * pagination. When `onRowClick` is set, the first cell of each row becomes a button so the row can be
 * chosen from the keyboard.
 */
const DataTable: Component = defineComponent({
  name: 'DataTable',
  props: {
    /** Accessible name of the table, already translated. */
    caption: {required: true, type: String},
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** The columns to render. */
    columns: {required: true, type: Array as PropType<DataTableColumn<unknown>[]>},
    /** Message shown when there are no rows, already translated. */
    emptyText: {required: true, type: String},
    /** An error message to show above the table, already translated. */
    error: {default: null, type: String as PropType<string | null>},
    /** Returns a row's unique identifier. */
    getRowId: {required: true, type: Function as PropType<(row: unknown) => string>},
    /** Whether the rows are being fetched. */
    isLoading: {default: false, type: Boolean},
    /** Makes rows selectable. Also available as the `@row-click` listener. */
    onRowClick: {default: undefined, type: Function as PropType<(row: unknown) => void>},
    /** Offset based pagination. The pagination controls show only when there is more than one page. */
    pagination: {default: undefined, type: Object as PropType<DataTablePagination>},
    /** The rows to render. */
    rows: {required: true, type: Array as PropType<unknown[]>},
    /** Identifier of the selected row, marked with `aria-pressed` on its row button. */
    selectedRowId: {default: undefined, type: String},
    /** Translation function, injected by the container so both variants resolve the same bundle. */
    t: {default: undefined, type: Function as PropType<Translate>},
  },
  setup(props: DataTableProps): () => VNode {
    const {t: fallbackT} = useI18n();
    const translate: Translate = (key: string, params?: Record<string, string | number>): string =>
      (props.t ?? fallbackT)(key, params);
    const cls = (element?: string): string =>
      withVendorCSSClassPrefix(element ? `data-table__${element}` : 'data-table');

    const renderBody = (): VNode | VNode[] => {
      const colSpan: number = props.columns.length;

      if (props.isLoading) {
        return h('tr', {}, [
          h('td', {class: cls('empty'), colspan: colSpan}, [
            h('span', {class: cls('loading'), role: 'status'}, [
              h(Spinner, {'aria-hidden': 'true', size: 'small'}),
              translate('admin.common.loading'),
            ]),
          ]),
        ]);
      }

      if (props.rows.length === 0) {
        return h('tr', {}, [h('td', {class: cls('empty'), colspan: colSpan}, props.emptyText)]);
      }

      return props.rows.map((row: unknown) => {
        const rowId: string = props.getRowId(row);
        const onRowClick: ((row: unknown) => void) | undefined = props.onRowClick;

        return h(
          'tr',
          {
            class: cls('row'),
            'data-clickable': onRowClick ? 'true' : undefined,
            'data-selected': props.selectedRowId === rowId ? 'true' : undefined,
            key: rowId,
            onClick: onRowClick ? (): void => onRowClick(row) : undefined,
          },
          props.columns.map((column: DataTableColumn<unknown>, index: number) =>
            h(
              'td',
              {class: cls('cell'), key: column.id},
              index === 0 && onRowClick
                ? [
                    h(
                      'button',
                      {
                        'aria-pressed':
                          props.selectedRowId === undefined ? undefined : String(props.selectedRowId === rowId),
                        class: cls('row-button'),
                        onClick: (event: MouseEvent): void => {
                          event.stopPropagation();
                          onRowClick(row);
                        },
                        type: 'button',
                      },
                      [column.render(row)],
                    ),
                  ]
                : [column.render(row)],
            ),
          ),
        );
      });
    };

    return (): VNode => {
      const {pagination} = props;
      const start: number = pagination ? Math.min(pagination.offset + 1, pagination.total) : 0;
      const end: number = pagination ? Math.min(pagination.offset + props.rows.length, pagination.total) : 0;

      return h('div', {class: [cls(), props.className].filter(Boolean).join(' ')}, [
        props.error ? h(Alert, {severity: 'error'}, {default: (): string[] => [props.error!]}) : null,
        h('div', {class: cls('scroller')}, [
          h('table', {class: cls('table')}, [
            h('caption', {class: cls('caption')}, props.caption),
            h('thead', {}, [
              h(
                'tr',
                {},
                props.columns.map((column: DataTableColumn<unknown>) =>
                  h('th', {class: cls('header-cell'), key: column.id, scope: 'col'}, column.header),
                ),
              ),
            ]),
            h('tbody', {'aria-busy': props.isLoading ? 'true' : 'false'}, renderBody()),
          ]),
        ]),
        pagination && pagination.total > pagination.limit
          ? h('nav', {'aria-label': translate('admin.common.pagination.label'), class: cls('footer')}, [
              h(
                'span',
                {'aria-live': 'polite'},
                translate('admin.common.pagination.range', {end, start, total: pagination.total}),
              ),
              h('div', {class: cls('footer-actions')}, [
                h(
                  Button,
                  {
                    disabled: pagination.offset === 0 || props.isLoading,
                    onClick: (): void => pagination.onChange(Math.max(0, pagination.offset - pagination.limit)),
                    size: 'small',
                    variant: 'outline',
                  },
                  {default: (): string => translate('admin.common.pagination.previous')},
                ),
                h(
                  Button,
                  {
                    disabled: pagination.offset + pagination.limit >= pagination.total || props.isLoading,
                    onClick: (): void => pagination.onChange(pagination.offset + pagination.limit),
                    size: 'small',
                    variant: 'outline',
                  },
                  {default: (): string => translate('admin.common.pagination.next')},
                ),
              ]),
            ])
          : null,
      ]);
    };
  },
});

export default DataTable;
