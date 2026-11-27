// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Styles for the dialog that signs the user in again.
 *
 * BEM block: `.thunderid-reauthentication`
 */
const REAUTHENTICATION_CSS = `
.thunderid-reauthentication__overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.45);
}

.thunderid-reauthentication__dialog {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: var(--thunderid-spacing-unit);
  width: min(480px, calc(100vw - calc(var(--thunderid-spacing-unit) * 4)));
  max-height: 90vh;
  overflow-y: auto;
  padding: calc(var(--thunderid-spacing-unit) * 2);
  background: var(--thunderid-color-background-surface);
  border-radius: var(--thunderid-border-radius-large);
  box-shadow: var(--thunderid-shadow-large);
  font-family: var(--thunderid-typography-fontFamily);
  outline: none;
}

.thunderid-reauthentication__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.thunderid-reauthentication__dialog .thunderid-signin {
  min-width: 0;
}
`;

export default REAUTHENTICATION_CSS;
