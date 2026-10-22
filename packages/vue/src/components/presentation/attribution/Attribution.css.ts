// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Styles for the Attribution presentation component.
 * Parity target: `@thunderid/react` Attribution.styles.ts
 */
const ATTRIBUTION_CSS = `
.thunderid-attribution {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--thunderid-spacing-unit) * 0.75);
  font-family: var(--thunderid-typography-fontFamily);
  font-size: var(--thunderid-typography-fontSize-xs, 0.75rem);
  color: var(--thunderid-color-text-secondary);
  text-decoration: none;
  line-height: 1;
}

a.thunderid-attribution:hover,
a.thunderid-attribution:focus-visible {
  color: var(--thunderid-color-text-primary);
}

.thunderid-attribution__label {
  white-space: nowrap;
}

.thunderid-attribution__wordmark {
  height: 1.15em;
  width: auto;
  display: block;
  color: var(--thunderid-color-text-primary);
}

.thunderid-attribution--ribbon {
  position: absolute;
  top: 36px;
  right: -1px;
  transform: translateX(100%);
  width: 34px;
  height: 128px;
  overflow: hidden;
  background: #12172a;
  border: 1px solid var(--thunderid-color-border);
  border-left: none;
  border-radius: 0 10px 10px 0;
  box-shadow: var(--thunderid-shadow-medium);
}

.thunderid-attribution__ribbon-content {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 112px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
  transform: translate(-50%, -50%) rotate(90deg);
}

.thunderid-attribution__ribbon-label {
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: #8bf9fa;
  opacity: 0.65;
}

.thunderid-attribution__ribbon-wordmark {
  height: 11px;
  width: auto;
  display: block;
  color: #ffffff;
  opacity: 0.95;
}
`;

export default ATTRIBUTION_CSS;
