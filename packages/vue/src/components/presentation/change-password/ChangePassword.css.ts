// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Styles for the ChangePassword presentation component.
 * Parity target: `@thunderid/react` BaseChangePassword.styles.ts
 */
const CHANGE_PASSWORD_CSS = `
/* ============================================================
   ChangePassword (React Parity)
   ============================================================ */

.thunderid-change-password {
  display: flex;
  flex-direction: column;
  gap: calc(var(--thunderid-spacing-unit) * 2);
  width: 100%;
  box-sizing: border-box;
  font-family: var(--thunderid-typography-fontFamily);
}

.thunderid-change-password--card {
  padding: calc(var(--thunderid-spacing-unit) * 3);
  border: 1px solid var(--thunderid-color-border);
  border-radius: var(--thunderid-border-radius-large, 8px);
  background: var(--thunderid-color-background-surface);
}

.thunderid-change-password__heading {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.thunderid-change-password__fields {
  display: flex;
  flex-direction: column;
  gap: calc(var(--thunderid-spacing-unit) * 2);
}

.thunderid-change-password__requirements-heading {
  margin: 0 0 calc(var(--thunderid-spacing-unit) / 2) 0;
  font-size: 0.8125rem;
  opacity: 0.8;
}

.thunderid-change-password__requirements {
  display: flex;
  flex-direction: column;
  gap: calc(var(--thunderid-spacing-unit) / 2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.thunderid-change-password__requirement {
  display: flex;
  align-items: center;
  gap: var(--thunderid-spacing-unit);
  font-size: 0.8125rem;
  opacity: 0.7;
}

.thunderid-change-password__requirement--passed {
  color: var(--thunderid-color-success-main);
  opacity: 1;
}

.thunderid-change-password__requirement-icon {
  display: inline-flex;
  flex-shrink: 0;
  width: 14px;
  height: 14px;
}

.thunderid-change-password__actions {
  display: flex;
  align-items: center;
  gap: var(--thunderid-spacing-unit);
}

.thunderid-change-password__unavailable {
  position: relative;
  display: flex;
  width: 100%;
}

.thunderid-change-password__unavailable-content {
  width: 100%;
  filter: blur(3px);
  opacity: 0.55;
  pointer-events: none;
  user-select: none;
}

.thunderid-change-password__unavailable-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(var(--thunderid-spacing-unit) * 2);
}
`;

export default CHANGE_PASSWORD_CSS;
