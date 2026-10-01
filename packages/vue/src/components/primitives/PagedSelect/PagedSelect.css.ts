// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Styles for the PagedSelect primitive component.
 *
 * BEM block: `.thunderid-paged-select`
 *
 * Elements:
 *   __label | __required | __trigger | __trigger-label | __chevron | __panel | __option
 *   __option-label | __status-row | __retry | __load-more | __error | __helper | __visually-hidden
 */
const PAGED_SELECT_CSS = `
/* ============================================================
   PagedSelect
   ============================================================ */

.thunderid-paged-select {
  display: flex;
  flex-direction: column;
  gap: calc(var(--thunderid-spacing-unit) * 0.5);
  font-family: var(--thunderid-typography-fontFamily);
  width: 100%;
  box-sizing: border-box;
  position: relative;
}

.thunderid-paged-select__label {
  font-size: var(--thunderid-typography-fontSize-sm);
  font-weight: var(--thunderid-typography-fontWeight-medium);
  color: var(--thunderid-color-text-primary);
  display: block;
  line-height: var(--thunderid-typography-lineHeight-normal);
}

.thunderid-paged-select__required {
  color: var(--thunderid-color-error-main);
  margin-left: 2px;
}

.thunderid-paged-select__trigger {
  width: 100%;
  height: var(--thunderid-input-height);
  padding: 0 var(--thunderid-input-paddingX);
  border: 1px solid var(--thunderid-input-borderColor);
  border-radius: var(--thunderid-input-borderRadius);
  font-family: var(--thunderid-typography-fontFamily);
  font-size: var(--thunderid-input-fontSize);
  color: var(--thunderid-color-text-primary);
  background-color: var(--thunderid-color-background-surface);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--thunderid-spacing-unit) * 1);
  cursor: pointer;
  box-sizing: border-box;
  transition:
    border-color var(--thunderid-transition-fast),
    box-shadow var(--thunderid-transition-fast);
  outline: none;
}
.thunderid-paged-select__trigger:focus {
  border-color: var(--thunderid-input-focusBorderColor);
  box-shadow: var(--thunderid-input-focusRing);
}
.thunderid-paged-select__trigger:disabled {
  background-color: var(--thunderid-color-background-disabled);
  color: var(--thunderid-color-action-disabled);
  cursor: not-allowed;
}

.thunderid-paged-select--error .thunderid-paged-select__trigger {
  border-color: var(--thunderid-color-error-main);
}
.thunderid-paged-select--error .thunderid-paged-select__trigger:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
}

.thunderid-paged-select__trigger-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  flex: 1;
}

.thunderid-paged-select__chevron {
  display: inline-flex;
  flex-shrink: 0;
  color: var(--thunderid-color-text-secondary);
}

.thunderid-paged-select__panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 1000;
  max-height: 280px;
  overflow-y: auto;
  background-color: var(--thunderid-color-background-surface);
  border: 1px solid var(--thunderid-input-borderColor);
  border-radius: var(--thunderid-input-borderRadius);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: calc(var(--thunderid-spacing-unit) * 1) 0;
}

.thunderid-paged-select__option {
  width: 100%;
  display: flex;
  align-items: center;
  gap: calc(var(--thunderid-spacing-unit) * 1);
  padding: calc(var(--thunderid-spacing-unit) * 1.5) calc(var(--thunderid-spacing-unit) * 2);
  border: none;
  background: none;
  color: var(--thunderid-color-text-primary);
  font-family: var(--thunderid-typography-fontFamily);
  font-size: var(--thunderid-input-fontSize);
  text-align: left;
  cursor: pointer;
}
.thunderid-paged-select__option:hover:not(:disabled),
.thunderid-paged-select__option--active:not(:disabled) {
  background-color: var(--thunderid-color-background-hover, rgba(0, 0, 0, 0.04));
}
.thunderid-paged-select__option:disabled {
  color: var(--thunderid-color-action-disabled);
  cursor: not-allowed;
}
.thunderid-paged-select__option--selected {
  font-weight: var(--thunderid-typography-fontWeight-medium);
}

.thunderid-paged-select__option-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.thunderid-paged-select__status-row {
  display: flex;
  align-items: center;
  gap: calc(var(--thunderid-spacing-unit) * 1);
  padding: calc(var(--thunderid-spacing-unit) * 1.5) calc(var(--thunderid-spacing-unit) * 2);
  color: var(--thunderid-color-text-secondary);
  font-size: var(--thunderid-typography-fontSize-sm);
}

.thunderid-paged-select__retry,
.thunderid-paged-select__load-more {
  border: none;
  background: none;
  color: var(--thunderid-color-primary-main, #4b6ef5);
  font-family: var(--thunderid-typography-fontFamily);
  font-size: var(--thunderid-typography-fontSize-sm);
  cursor: pointer;
  padding: 0;
}

.thunderid-paged-select__load-more {
  width: 100%;
  padding: calc(var(--thunderid-spacing-unit) * 1.5) calc(var(--thunderid-spacing-unit) * 2);
  text-align: left;
}

.thunderid-paged-select__error {
  font-size: var(--thunderid-typography-fontSize-xs);
  color: var(--thunderid-color-error-contrastText);
  line-height: var(--thunderid-typography-lineHeight-normal);
}

.thunderid-paged-select__helper {
  font-size: var(--thunderid-typography-fontSize-xs);
  color: var(--thunderid-color-text-secondary);
  line-height: var(--thunderid-typography-lineHeight-normal);
}

.thunderid-paged-select__visually-hidden {
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
`;

export default PAGED_SELECT_CSS;
