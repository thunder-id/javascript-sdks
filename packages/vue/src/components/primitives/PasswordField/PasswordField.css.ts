// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Styles for the PasswordField primitive component.
 *
 * BEM block: `.thunderid-password-field`
 *
 * Modifiers:
 *   --error  – shows validation error state
 *
 * Elements:
 *   __label | __required | __wrapper | __input | __toggle | __error
 */
const PASSWORD_FIELD_CSS = `
/* ============================================================
   PasswordField
   ============================================================ */

.thunderid-password-field {
  display: flex;
  flex-direction: column;
  gap: calc(var(--thunderid-spacing-unit) * 0.5);
  font-family: var(--thunderid-typography-fontFamily);
  width: 100%;
  box-sizing: border-box;
}

.thunderid-password-field__label {
  font-size: var(--thunderid-typography-fontSize-sm);
  font-weight: var(--thunderid-typography-fontWeight-medium);
  color: var(--thunderid-color-text-primary);
  display: block;
  line-height: var(--thunderid-typography-lineHeight-normal);
}

.thunderid-password-field__required {
  color: var(--thunderid-color-error-main);
  margin-left: 2px;
}

.thunderid-password-field__wrapper {
  display: flex;
  align-items: center;
  height: var(--thunderid-input-height);
  border: 1px solid var(--thunderid-input-borderColor);
  border-radius: var(--thunderid-input-borderRadius);
  background-color: var(--thunderid-color-background-surface);
  transition:
    border-color var(--thunderid-transition-fast),
    box-shadow var(--thunderid-transition-fast);
  overflow: hidden;
  box-sizing: border-box;
}
.thunderid-password-field__wrapper:focus-within {
  border-color: var(--thunderid-input-focusBorderColor);
  box-shadow: var(--thunderid-input-focusRing);
}
.thunderid-password-field--error .thunderid-password-field__wrapper {
  border-color: var(--thunderid-color-error-main);
}
.thunderid-password-field--error .thunderid-password-field__wrapper:focus-within {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
}

.thunderid-password-field__input {
  flex: 1;
  padding: 0 var(--thunderid-input-paddingX);
  border: none;
  outline: none;
  font-family: var(--thunderid-typography-fontFamily);
  font-size: var(--thunderid-input-fontSize);
  color: var(--thunderid-color-text-primary);
  background: transparent;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  min-width: 0;
}
.thunderid-password-field__input::placeholder {
  color: var(--thunderid-color-text-secondary);
}
.thunderid-password-field__input:disabled {
  cursor: not-allowed;
}

.thunderid-password-field__toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 var(--thunderid-input-paddingX);
  color: var(--thunderid-color-text-secondary);
  font-size: var(--thunderid-typography-fontSize-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  height: 100%;
  transition: color var(--thunderid-transition-fast);
}
.thunderid-password-field__toggle:hover {
  color: var(--thunderid-color-text-primary);
}

.thunderid-password-field__error {
  font-size: var(--thunderid-typography-fontSize-xs);
  color: var(--thunderid-color-error-contrastText);
  line-height: var(--thunderid-typography-lineHeight-normal);
}

.thunderid-password-field__helper {
  font-size: var(--thunderid-typography-fontSize-xs);
  color: var(--thunderid-color-text-secondary);
  line-height: var(--thunderid-typography-lineHeight-normal);
}
`;

export default PASSWORD_FIELD_CSS;
