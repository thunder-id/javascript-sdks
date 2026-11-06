// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Styles for the OrganizationUnitSwitcher presentation component.
 */
const ORGANIZATION_UNIT_SWITCHER_CSS = `
.thunderid-organization-unit-switcher {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  gap: calc(var(--thunderid-spacing-unit) * 0.5);
  min-width: 240px;
  max-width: 100%;
  font-family: var(--thunderid-typography-fontFamily);
}

.thunderid-organization-unit-switcher__field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--thunderid-spacing-unit) * 1.5);
  width: 100%;
  box-sizing: border-box;
  padding: calc(var(--thunderid-spacing-unit) * 0.75) calc(var(--thunderid-spacing-unit) * 1.5);
  border: 1px solid var(--thunderid-color-border);
  border-radius: var(--thunderid-border-radius-medium, 8px);
  background: var(--thunderid-color-background-surface);
  color: var(--thunderid-color-text-primary);
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.thunderid-organization-unit-switcher__field:hover:not(:disabled) {
  background-color: var(--thunderid-color-action-hover, rgba(0, 0, 0, 0.04));
}

.thunderid-organization-unit-switcher__field:focus-visible {
  outline: 2px solid var(--thunderid-color-primary-main);
  outline-offset: 1px;
}

.thunderid-organization-unit-switcher__field:disabled {
  cursor: default;
  opacity: 0.7;
}

.thunderid-organization-unit-switcher__field-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.thunderid-organization-unit-switcher__label {
  display: block;
  font-size: 0.75rem;
  line-height: 1rem;
  color: var(--thunderid-color-text-secondary);
}

.thunderid-organization-unit-switcher__value {
  display: block;
  overflow: hidden;
  font-size: 1rem;
  line-height: 1.375rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.thunderid-organization-unit-switcher__chevron {
  display: flex;
  flex-shrink: 0;
  color: var(--thunderid-color-text-secondary);
  transition: transform 0.12s ease-in-out;
}

.thunderid-organization-unit-switcher__chevron--open {
  transform: rotate(180deg);
}

.thunderid-organization-unit-switcher__error {
  font-size: 0.75rem;
  color: var(--thunderid-color-error-main);
}

.thunderid-organization-unit-switcher__menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 1000;
  box-sizing: border-box;
  min-width: 100%;
  max-height: 320px;
  overflow-y: auto;
  padding: calc(var(--thunderid-spacing-unit) * 0.5);
  border: 1px solid var(--thunderid-color-border);
  border-radius: var(--thunderid-border-radius-medium, 8px);
  background-color: var(--thunderid-color-background-surface);
  box-shadow: var(--thunderid-shadow-medium);
}

.thunderid-organization-unit-switcher__list {
  display: flex;
  flex-direction: column;
}

.thunderid-organization-unit-switcher__option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--thunderid-spacing-unit);
  width: 100%;
  padding: var(--thunderid-spacing-unit) calc(var(--thunderid-spacing-unit) * 1.25);
  border: none;
  border-radius: var(--thunderid-border-radius-small, 4px);
  background-color: transparent;
  color: var(--thunderid-color-text-primary);
  font: inherit;
  text-align: start;
  cursor: pointer;
  outline: none;
}

.thunderid-organization-unit-switcher__option:hover,
.thunderid-organization-unit-switcher__option:focus-visible {
  background-color: var(--thunderid-color-action-hover, rgba(0, 0, 0, 0.04));
}

.thunderid-organization-unit-switcher__option--current {
  font-weight: 600;
}

.thunderid-organization-unit-switcher__option-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.thunderid-organization-unit-switcher__option-name {
  font-size: 0.875rem;
}

.thunderid-organization-unit-switcher__option-handle {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--thunderid-color-text-secondary);
}

.thunderid-organization-unit-switcher__check {
  display: flex;
  flex-shrink: 0;
  color: var(--thunderid-color-primary-main);
}

.thunderid-organization-unit-switcher__status {
  display: flex;
  align-items: center;
  gap: var(--thunderid-spacing-unit);
  margin: 0;
  padding: var(--thunderid-spacing-unit) calc(var(--thunderid-spacing-unit) * 1.25);
  font-size: 0.875rem;
  color: var(--thunderid-color-text-secondary);
}

.thunderid-organization-unit-switcher__pagination {
  display: flex;
  justify-content: flex-end;
  gap: var(--thunderid-spacing-unit);
  margin-top: calc(var(--thunderid-spacing-unit) * 0.5);
  padding-top: calc(var(--thunderid-spacing-unit) * 0.5);
  border-top: 1px solid var(--thunderid-color-border);
}
`;

export default ORGANIZATION_UNIT_SWITCHER_CSS;
