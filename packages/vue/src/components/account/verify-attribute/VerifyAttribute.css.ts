// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Styles for the VerifyAttribute presentation component.
 * Parity target: `@thunderid/react` BaseVerifyAttribute.styles.ts
 */
const VERIFY_ATTRIBUTE_CSS = `
/* ============================================================
   VerifyAttribute (React Parity)
   ============================================================ */

.thunderid-verify-attribute {
  display: flex;
  flex-direction: column;
  gap: calc(var(--thunderid-spacing-unit) * 2);
  width: 100%;
  box-sizing: border-box;
  font-family: var(--thunderid-typography-fontFamily);
}

.thunderid-verify-attribute--outlined {
  padding: calc(var(--thunderid-spacing-unit) * 2);
  border: 1px solid var(--thunderid-color-border);
  border-radius: var(--thunderid-border-radius-medium, 6px);
}

.thunderid-verify-attribute__header {
  display: flex;
  flex-direction: column;
  gap: calc(var(--thunderid-spacing-unit) / 2);
}

.thunderid-verify-attribute__heading {
  margin: 0;
}

.thunderid-verify-attribute__subheading,
.thunderid-verify-attribute__destination {
  margin: 0;
  color: var(--thunderid-color-text-secondary);
}

.thunderid-verify-attribute__content {
  display: flex;
  flex-direction: column;
  gap: calc(var(--thunderid-spacing-unit) * 1.5);
}

.thunderid-verify-attribute__alert {
  width: 100%;
}

.thunderid-verify-attribute__loading {
  display: flex;
  justify-content: center;
  padding: calc(var(--thunderid-spacing-unit) * 2);
}

.thunderid-verify-attribute__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--thunderid-spacing-unit);
}
`;

export default VERIFY_ATTRIBUTE_CSS;
