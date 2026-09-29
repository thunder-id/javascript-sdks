// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Styles for the KeyValueList primitive component.
 *
 * BEM block: `.thunderid-key-value-list`
 *
 * Elements:
 *   __label | __list | __key | __value
 */
const KEY_VALUE_LIST_CSS = `
/* ============================================================
   KeyValueList
   ============================================================ */

.thunderid-key-value-list {
  display: flex;
  flex-direction: column;
  gap: calc(var(--thunderid-spacing-unit) * 0.5);
  width: 100%;
}

.thunderid-key-value-list__label {
  color: var(--thunderid-color-text-secondary);
  font-size: 0.875rem;
  font-weight: var(--thunderid-typography-fontWeight-medium);
}

/* Two columns rather than a row each, so every value starts at the same edge however long the
   labels beside them are. */
.thunderid-key-value-list__list {
  background-color: var(--thunderid-color-background-surface);
  border: 1px solid var(--thunderid-color-border);
  border-radius: var(--thunderid-border-radius-small);
  column-gap: calc(var(--thunderid-spacing-unit) * 3);
  display: grid;
  grid-template-columns: minmax(0, max-content) minmax(0, 1fr);
  margin: 0;
  padding: calc(var(--thunderid-spacing-unit) * 2);
  row-gap: calc(var(--thunderid-spacing-unit) * 1.5);
}

.thunderid-key-value-list__key {
  color: var(--thunderid-color-text-secondary);
  font-size: 0.875rem;
}

.thunderid-key-value-list__value {
  color: var(--thunderid-color-text-primary);
  font-size: 0.875rem;
  font-weight: var(--thunderid-typography-fontWeight-medium);
  margin: 0;
  overflow-wrap: anywhere;
}
`;

export default KEY_VALUE_LIST_CSS;
