// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {withVendorCSSClassPrefix} from '@thunderid/browser';

const FLOW_EXPIRED_CSS = `
.${withVendorCSSClassPrefix('flow-expired')} {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: calc(var(--thunderid-spacing-unit) * 1.5);
  padding-block: var(--thunderid-spacing-unit);
  text-align: center;
}

/* Focused only for a screen reader to read it, so it shows no ring. It is not a control. */
.${withVendorCSSClassPrefix('flow-expired')}:focus {
  outline: none;
}

.${withVendorCSSClassPrefix('flow-expired__icon')} {
  color: var(--thunderid-color-warning-main);
  display: flex;
}

.${withVendorCSSClassPrefix('flow-expired__action')} {
  margin-top: var(--thunderid-spacing-unit);
}

/* Keeps the text on one line, with its own spaces. */
.${withVendorCSSClassPrefix('flow-expired__link')} {
  color: var(--thunderid-color-primary-main);
  display: inline-flex;
  font-weight: var(--thunderid-typography-fontWeight-semibold);
  margin-top: var(--thunderid-spacing-unit);
  max-width: 100%;
  text-decoration: none;
  white-space: pre;
}

.${withVendorCSSClassPrefix('flow-expired__link')}:hover {
  text-decoration: underline;
}

.${withVendorCSSClassPrefix('flow-expired__name')} {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
`;

export default FLOW_EXPIRED_CSS;
