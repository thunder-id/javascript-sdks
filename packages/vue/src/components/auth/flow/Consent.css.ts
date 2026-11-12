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

.${withVendorCSSClassPrefix('consent__validity')} {
  display: flex;
  flex-direction: column;
  gap: calc(var(--thunderid-spacing-unit) * 2);
  margin-top: var(--thunderid-spacing-unit);
}

.${withVendorCSSClassPrefix('consent__validity-group')} {
  display: flex;
  flex-direction: column;
  gap: calc(var(--thunderid-spacing-unit) * 0.5);
}

.${withVendorCSSClassPrefix('consent__validity-remember')} {
  display: flex;
  align-items: center;
  gap: var(--thunderid-spacing-unit);
  color: var(--thunderid-color-text-primary);
  font-size: var(--thunderid-typography-fontSize-sm);
  font-weight: var(--thunderid-typography-fontWeight-medium);
  cursor: pointer;
}

.${withVendorCSSClassPrefix('consent__validity-checkbox')} {
  cursor: pointer;
}

.${withVendorCSSClassPrefix('consent__validity-input')} {
  box-sizing: border-box;
  width: 100%;
  height: var(--thunderid-input-height);
  padding: 0 var(--thunderid-input-paddingX);
  border: 1px solid var(--thunderid-input-borderColor);
  border-radius: var(--thunderid-input-borderRadius);
  background-color: var(--thunderid-color-background-surface);
  color: var(--thunderid-color-text-primary);
  font-family: var(--thunderid-typography-fontFamily);
  font-size: var(--thunderid-input-fontSize);
  cursor: pointer;
}

.${withVendorCSSClassPrefix('consent__validity-custom')} {
  display: flex;
  align-items: flex-start;
  gap: calc(var(--thunderid-spacing-unit) * 1.5);
}

.${withVendorCSSClassPrefix('consent__validity-custom')} .${withVendorCSSClassPrefix('consent__validity-input')} {
  cursor: text;
}

.${withVendorCSSClassPrefix('consent__validity-custom')} input.${withVendorCSSClassPrefix('consent__validity-input')} {
  flex: 1;
  min-width: 0;
}

.${withVendorCSSClassPrefix('consent__validity-custom')} select.${withVendorCSSClassPrefix('consent__validity-input')} {
  width: auto;
  flex: 0 0 auto;
  cursor: pointer;
}

.${withVendorCSSClassPrefix('consent__validity-input')}:focus {
  border-color: var(--thunderid-input-focusBorderColor);
  box-shadow: var(--thunderid-input-focusRing);
  outline: none;
}

.${withVendorCSSClassPrefix('consent__validity-hint')} {
  color: var(--thunderid-color-text-secondary);
  font-size: var(--thunderid-typography-fontSize-xs);
}
`;

export default CONSENT_CSS;
