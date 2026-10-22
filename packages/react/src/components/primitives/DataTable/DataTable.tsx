// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {bem, withVendorCSSClassPrefix} from '@thunderid/browser';
import {ReactElement, ReactNode} from 'react';
import useStyles from './DataTable.styles';
import useTheme from '../../../contexts/Theme/useTheme';
import useTranslation from '../../../hooks/useTranslation';
import {cx} from '../../../styles/emotion';
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
  render: (row: T) => ReactNode;
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

export interface DataTableProps<T> {
  /**
   * Accessible name of the table, already translated.
   */
  caption: string;
  className?: string;
  columns: DataTableColumn<T>[];
  /**
   * Message shown when there are no rows, already translated.
   */
  emptyText: string;
  error?: string | null;
  getRowId: (row: T) => string;
  isLoading?: boolean;
  /**
   * Makes rows selectable. The first cell becomes a button so the row can be chosen from the keyboard.
   */
  onRowClick?: (row: T) => void;
  pagination?: DataTablePagination;
  rows: T[];
  selectedRowId?: string;
}

/**
 * Lists management resources in an accessible table with optional row selection and offset based
 * pagination.
 */
const DataTable = <T,>({
  caption,
  className,
  columns,
  emptyText,
  error = null,
  getRowId,
  isLoading = false,
  onRowClick,
  pagination,
  rows,
  selectedRowId,
}: DataTableProps<T>): ReactElement => {
  const {theme, colorScheme} = useTheme();
  const {t} = useTranslation();
  const styles: Record<string, string> = useStyles(theme, colorScheme);

  const renderBody = (): ReactNode => {
    if (isLoading) {
      return (
        <tr>
          <td className={styles['empty']} colSpan={columns.length}>
            <Spinner size="small" />
            <span className={withVendorCSSClassPrefix(bem('data-table', 'loading'))}> {t('admin.common.loading')}</span>
          </td>
        </tr>
      );
    }

    if (rows.length === 0) {
      return (
        <tr>
          <td className={styles['empty']} colSpan={columns.length}>
            {emptyText}
          </td>
        </tr>
      );
    }

    return rows.map((row: T) => {
      const rowId: string = getRowId(row);

      return (
        <tr
          key={rowId}
          className={cx(withVendorCSSClassPrefix(bem('data-table', 'row')), styles['row'])}
          data-clickable={onRowClick ? 'true' : undefined}
          data-selected={selectedRowId === rowId ? 'true' : undefined}
          onClick={onRowClick ? (): void => onRowClick(row) : undefined}
        >
          {columns.map((column: DataTableColumn<T>, index: number) => (
            <td key={column.id} className={styles['cell']}>
              {index === 0 && onRowClick ? (
                <button
                  type="button"
                  className={styles['rowButton']}
                  aria-pressed={selectedRowId === undefined ? undefined : selectedRowId === rowId}
                  onClick={(event): void => {
                    event.stopPropagation();
                    onRowClick(row);
                  }}
                >
                  {column.render(row)}
                </button>
              ) : (
                column.render(row)
              )}
            </td>
          ))}
        </tr>
      );
    });
  };

  const start: number = pagination ? Math.min(pagination.offset + 1, pagination.total) : 0;
  const end: number = pagination ? Math.min(pagination.offset + rows.length, pagination.total) : 0;

  return (
    <div className={cx(withVendorCSSClassPrefix(bem('data-table')), styles['root'], className)}>
      {error && (
        <Alert variant="error" role="alert">
          {error}
        </Alert>
      )}
      <table className={styles['table']}>
        <caption className={cx(withVendorCSSClassPrefix(bem('data-table', 'caption')), styles['visuallyHidden'])}>
          {caption}
        </caption>
        <thead>
          <tr>
            {columns.map((column: DataTableColumn<T>) => (
              <th key={column.id} scope="col" className={styles['headerCell']}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody aria-busy={isLoading}>{renderBody()}</tbody>
      </table>
      {pagination && pagination.total > pagination.limit && (
        <nav className={styles['footer']} aria-label={t('admin.common.pagination.label')}>
          <span aria-live="polite">{t('admin.common.pagination.range', {end, start, total: pagination.total})}</span>
          <div className={styles['footerActions']}>
            <Button
              variant="outline"
              size="small"
              disabled={pagination.offset === 0 || isLoading}
              onClick={(): void => pagination.onChange(Math.max(0, pagination.offset - pagination.limit))}
            >
              {t('admin.common.pagination.previous')}
            </Button>
            <Button
              variant="outline"
              size="small"
              disabled={pagination.offset + pagination.limit >= pagination.total || isLoading}
              onClick={(): void => pagination.onChange(pagination.offset + pagination.limit)}
            >
              {t('admin.common.pagination.next')}
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
};

export default DataTable;
