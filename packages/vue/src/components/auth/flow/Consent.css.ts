// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {withVendorCSSClassPrefix} from '@thunderid/browser';

const CONSENT_CSS = `
.${withVendorCSSClassPrefix('consent')} {
  display: flex;
  flex-direction: column;
  gap: calc(var(--thunderid-spacing-unit) * 2);
  margin-top: calc(var(--thunderid-spacing-unit) * 0.5);
}

.${withVendorCSSClassPrefix('consent__purpose')} {
  padding-bottom: calc(var(--thunderid-spacing-unit) * 2);
}

.${withVendorCSSClassPrefix('consent__section')} {
  margin-top: var(--thunderid-spacing-unit);
}

.${withVendorCSSClassPrefix('consent__header')} {
  display: flex;
  align-items: center;
  gap: calc(var(--thunderid-spacing-unit) * 0.5);
  margin-bottom: calc(var(--thunderid-spacing-unit) * 1.25);
}

.${withVendorCSSClassPrefix('consent__optional-header')} {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--thunderid-spacing-unit);
  padding-right: calc(var(--thunderid-spacing-unit) * 0.5);
}

.${withVendorCSSClassPrefix('consent__title')} {
  color: var(--thunderid-color-text-primary);
  font-weight: var(--thunderid-typography-fontWeight-bold);
}

.${withVendorCSSClassPrefix('consent__info')} {
  display: inline-flex;
  color: var(--thunderid-color-text-secondary);
  cursor: help;
}

.${withVendorCSSClassPrefix('consent__optional-header')} > .${withVendorCSSClassPrefix('consent__header')} {
  margin-bottom: calc(var(--thunderid-spacing-unit) * 1.25);
}

.${withVendorCSSClassPrefix('consent__items')} {
  display: flex;
  flex-direction: column;
  gap: calc(var(--thunderid-spacing-unit) * 1.25);
}

.${withVendorCSSClassPrefix('consent__item')} {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--thunderid-spacing-unit);
  min-height: 20px;
}

.${withVendorCSSClassPrefix('consent__item-label')} {
  display: flex;
  align-items: center;
  gap: calc(var(--thunderid-spacing-unit) * 0.75);
}

.${withVendorCSSClassPrefix('consent__branch')} {
  display: flex;
  flex-direction: column;
  gap: calc(var(--thunderid-spacing-unit) * 0.5);
}

.${withVendorCSSClassPrefix('consent__branch-descendant')},
.${withVendorCSSClassPrefix('consent__branch-notice')} {
  color: var(--thunderid-color-text-secondary);
}

.${withVendorCSSClassPrefix('consent__bullet')} {
  width: 4px;
  height: 4px;
  flex: 0 0 4px;
  border-radius: 50%;
  background: var(--thunderid-color-text-secondary);
}

.${withVendorCSSClassPrefix('consent__toggle-container')} {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.${withVendorCSSClassPrefix('consent__toggle-input')} {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.${withVendorCSSClassPrefix('consent__toggle-track')} {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 36px;
  height: 20px;
  border-radius: 9999px;
  background: var(--thunderid-color-text-secondary);
  opacity: 0.25;
  transition: background-color 0.2s ease, opacity 0.2s ease;
}

.${withVendorCSSClassPrefix('consent__toggle-input')}:checked + .${withVendorCSSClassPrefix('consent__toggle-track')} {
  background: var(--thunderid-color-primary-main);
  opacity: 1;
}

.${withVendorCSSClassPrefix('consent__toggle-input')}:focus-visible + .${withVendorCSSClassPrefix('consent__toggle-track')} {
  outline: 2px solid var(--thunderid-color-border-focus);
  outline-offset: 2px;
}

.${withVendorCSSClassPrefix('consent__toggle-thumb')} {
  position: absolute;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--thunderid-color-background-surface);
  transition: transform 0.2s ease;
}

.${withVendorCSSClassPrefix('consent__toggle-input')}:checked + .${withVendorCSSClassPrefix('consent__toggle-track')} .${withVendorCSSClassPrefix('consent__toggle-thumb')} {
  transform: translateX(16px);
}

.${withVendorCSSClassPrefix('consent__toggle-input')}:disabled + .${withVendorCSSClassPrefix('consent__toggle-track')} {
  cursor: not-allowed;
  opacity: 0.4;
}
`;

export default CONSENT_CSS;
