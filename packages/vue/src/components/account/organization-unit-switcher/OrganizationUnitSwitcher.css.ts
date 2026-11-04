// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Styles for the OrganizationUnitSwitcher presentation component.
 */
const ORGANIZATION_UNIT_SWITCHER_CSS = `
.thunderid-organization-unit-switcher {
  display: flex;
  flex-direction: column;
  gap: calc(var(--thunderid-spacing-unit) * 1.5);
  width: 100%;
  box-sizing: border-box;
  font-family: var(--thunderid-typography-fontFamily);
}

.thunderid-organization-unit-switcher__heading {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.thunderid-organization-unit-switcher__status,
.thunderid-organization-unit-switcher__empty {
  display: inline-flex;
  align-items: center;
  gap: var(--thunderid-spacing-unit);
  margin: 0;
  color: var(--thunderid-color-text-secondary);
}

.thunderid-organization-unit-switcher__list {
  display: flex;
  flex-direction: column;
  gap: var(--thunderid-spacing-unit);
  margin: 0;
  padding: 0;
  list-style: none;
}

.thunderid-organization-unit-switcher__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--thunderid-spacing-unit) * 2);
  padding: var(--thunderid-spacing-unit) calc(var(--thunderid-spacing-unit) * 1.5);
  border: 1px solid var(--thunderid-color-border);
  border-radius: var(--thunderid-border-radius-medium, 6px);
}

.thunderid-organization-unit-switcher__item--current {
  border-color: var(--thunderid-color-primary-main);
}

.thunderid-organization-unit-switcher__names {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.thunderid-organization-unit-switcher__name {
  font-weight: 500;
}

.thunderid-organization-unit-switcher__handle {
  font-size: 0.875rem;
  color: var(--thunderid-color-text-secondary);
}

.thunderid-organization-unit-switcher__current {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--thunderid-color-primary-main);
}

.thunderid-organization-unit-switcher__pagination {
  display: flex;
  justify-content: flex-end;
  gap: var(--thunderid-spacing-unit);
}
`;

export default ORGANIZATION_UNIT_SWITCHER_CSS;
