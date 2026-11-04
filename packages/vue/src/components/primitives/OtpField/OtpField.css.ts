// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Styles for the OtpField primitive component.
 *
 * BEM block: `.thunderid-otp-field`
 *
 * Elements:
 *   __label | __required | __inputs | __digit | __error
 */
const OTP_FIELD_CSS = `
/* ============================================================
   OtpField
   ============================================================ */

.thunderid-otp-field {
  display: flex;
  flex-direction: column;
  gap: calc(var(--thunderid-spacing-unit) * 0.75);
  font-family: var(--thunderid-typography-fontFamily);
}

.thunderid-otp-field__label {
  font-size: var(--thunderid-typography-fontSize-sm);
  font-weight: var(--thunderid-typography-fontWeight-medium);
  color: var(--thunderid-color-text-primary);
  display: block;
  line-height: var(--thunderid-typography-lineHeight-normal);
}

.thunderid-otp-field__required {
  color: var(--thunderid-color-error-main);
  margin-left: 2px;
}

.thunderid-otp-field__inputs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--thunderid-spacing-unit);
}

.thunderid-otp-field__digit {
  flex: none;
  width: calc(var(--thunderid-spacing-unit) * 6);
  height: calc(var(--thunderid-spacing-unit) * 6);
  text-align: center;
  border: 2px solid var(--thunderid-input-borderColor);
  /* Keeps the digit box's corners between a subtle minimum and 25% of its own
     size, so a brand radius token of 0 (sharp cards/buttons) doesn't render
     as a harsh square here, and an oversized token can't turn it into a
     near-circle. */
  border-radius: clamp(4px, var(--thunderid-border-radius-medium), 25%);
  font-family: var(--thunderid-typography-fontFamily);
  font-size: var(--thunderid-typography-fontSize-xl);
  font-weight: var(--thunderid-typography-fontWeight-medium);
  color: var(--thunderid-color-text-primary);
  background-color: var(--thunderid-color-background-surface);
  box-sizing: border-box;
  outline: none;
  transition:
    border-color var(--thunderid-transition-fast),
    box-shadow var(--thunderid-transition-fast);
}
.thunderid-otp-field__digit:focus {
  border-color: var(--thunderid-input-focusBorderColor);
  box-shadow: var(--thunderid-input-focusRing);
}
.thunderid-otp-field__digit:disabled {
  background-color: var(--thunderid-color-background-disabled);
  color: var(--thunderid-color-action-disabled);
  cursor: not-allowed;
}

.thunderid-otp-field__separator {
  flex: none;
  color: var(--thunderid-color-text-secondary);
  font-size: var(--thunderid-typography-fontSize-xl);
  font-weight: var(--thunderid-typography-fontWeight-medium);
}

.thunderid-otp-field__error {
  font-size: var(--thunderid-typography-fontSize-xs);
  color: var(--thunderid-color-error-contrastText);
  line-height: var(--thunderid-typography-lineHeight-normal);
}
`;

export default OTP_FIELD_CSS;
