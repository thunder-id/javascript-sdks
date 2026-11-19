// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Styles for the role picker a flow step draws for a ROLE_SELECT input.
 *
 * BEM block: `.thunderid-role-select`
 *
 * Elements:
 *   __legend | __required | __options | __empty | __error
 */
const ROLE_SELECT_CSS = `
.thunderid-role-select {
  border: none;
  margin: 0;
  min-width: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: calc(var(--thunderid-spacing-unit) * 0.5);
  font-family: var(--thunderid-typography-fontFamily);
}

.thunderid-role-select__legend {
  padding: 0;
  font-size: var(--thunderid-typography-fontSize-sm);
  font-weight: var(--thunderid-typography-fontWeight-medium);
  color: var(--thunderid-color-text-primary);
  line-height: var(--thunderid-typography-lineHeight-normal);
}

.thunderid-role-select__required {
  color: var(--thunderid-color-error-main);
  margin-left: 2px;
}

.thunderid-role-select__options {
  display: flex;
  flex-direction: column;
  gap: calc(var(--thunderid-spacing-unit) * 0.5);
}

.thunderid-role-select__empty {
  font-size: var(--thunderid-typography-fontSize-sm);
  color: var(--thunderid-color-text-secondary);
}

.thunderid-role-select__error {
  font-size: var(--thunderid-typography-fontSize-xs);
  color: var(--thunderid-color-error-contrastText);
  line-height: var(--thunderid-typography-lineHeight-normal);
}
`;

export default ROLE_SELECT_CSS;
