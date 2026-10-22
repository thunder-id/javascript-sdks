// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Styles for the DataTable primitive.
 *
 * BEM block: `.thunderid-data-table`
 *
 * Elements:
 *   __table | __caption | __header-cell | __row | __cell | __row-button | __empty | __loading
 *   __footer | __footer-actions
 */
const DATA_TABLE_CSS = `
/* ============================================================
   DataTable
   ============================================================ */

.thunderid-data-table {
  display: flex;
  flex-direction: column;
  gap: var(--thunderid-spacing-unit);
  width: 100%;
  font-family: var(--thunderid-typography-fontFamily);
  font-size: var(--thunderid-typography-fontSize-sm);
}

.thunderid-data-table__scroller {
  width: 100%;
  overflow-x: auto;
  background: var(--thunderid-color-background-surface);
  border: 1px solid var(--thunderid-color-border);
  border-radius: var(--thunderid-border-radius-large);
}

.thunderid-data-table__table {
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
}

.thunderid-data-table__caption {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.thunderid-data-table__header-cell {
  padding: calc(var(--thunderid-spacing-unit) * 1.5) calc(var(--thunderid-spacing-unit) * 2);
  text-align: start;
  font-size: var(--thunderid-typography-fontSize-sm);
  font-weight: var(--thunderid-typography-fontWeight-medium);
  color: var(--thunderid-color-text-secondary);
  white-space: nowrap;
}

.thunderid-data-table__cell {
  padding: calc(var(--thunderid-spacing-unit) * 1.5) calc(var(--thunderid-spacing-unit) * 2);
  text-align: start;
  vertical-align: middle;
  color: var(--thunderid-color-text-primary);
  border-top: 1px solid var(--thunderid-color-border);
}

.thunderid-data-table__row[data-clickable='true'] {
  cursor: pointer;
}

.thunderid-data-table__row[data-clickable='true']:hover,
.thunderid-data-table__row[data-selected='true'] {
  background: var(--thunderid-color-action-hover);
}

.thunderid-data-table__row-button {
  all: unset;
  cursor: pointer;
  font-weight: var(--thunderid-typography-fontWeight-medium);
  color: var(--thunderid-color-text-primary);
}

.thunderid-data-table__row-button:focus-visible {
  outline: 2px solid var(--thunderid-color-primary-main);
  outline-offset: 2px;
  border-radius: var(--thunderid-border-radius-small);
}

.thunderid-data-table__empty {
  padding: calc(var(--thunderid-spacing-unit) * 4) calc(var(--thunderid-spacing-unit) * 2);
  text-align: center;
  color: var(--thunderid-color-text-secondary);
}

.thunderid-data-table__loading {
  display: inline-flex;
  align-items: center;
  gap: var(--thunderid-spacing-unit);
}

.thunderid-data-table__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--thunderid-spacing-unit);
  padding: calc(var(--thunderid-spacing-unit) * 1.5) calc(var(--thunderid-spacing-unit) * 2);
  color: var(--thunderid-color-text-secondary);
  font-size: var(--thunderid-typography-fontSize-sm);
}

.thunderid-data-table__footer-actions {
  display: flex;
  gap: var(--thunderid-spacing-unit);
}
`;

export default DATA_TABLE_CSS;
