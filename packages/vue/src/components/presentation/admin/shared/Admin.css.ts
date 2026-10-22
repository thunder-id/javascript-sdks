// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Styles shared by the admin components (`UserList`, `GroupMembers`, `RoleCreate`, ...).
 *
 * BEM block: `.thunderid-admin`
 *
 * Elements:
 *   Section:  __header | __heading | __title | __description | __actions
 *   Forms:    __form | __form-actions
 *   Parts:    __panel | __panel-header | __panel-title | __detail | __detail-label | __detail-value
 *             __chip-list | __chip | __confirm | __muted | __row | __avatar | __picker
 *
 * Each component root also carries its own block class (for example `.thunderid-user-list`), so an
 * application can target a single component.
 */
const ADMIN_CSS = `
/* ============================================================
   Admin components
   ============================================================ */

.thunderid-admin {
  display: flex;
  flex-direction: column;
  gap: calc(var(--thunderid-spacing-unit) * 2);
  font-family: var(--thunderid-typography-fontFamily);
  color: var(--thunderid-color-text-primary);
}

.thunderid-admin__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: calc(var(--thunderid-spacing-unit) * 1.5);
}

.thunderid-admin__title {
  margin: 0;
  font-size: var(--thunderid-typography-fontSize-xl);
  font-weight: var(--thunderid-typography-fontWeight-normal);
}

.thunderid-admin__description {
  margin: calc(var(--thunderid-spacing-unit) / 2) 0 0;
  color: var(--thunderid-color-text-secondary);
  font-size: var(--thunderid-typography-fontSize-sm);
}

.thunderid-admin__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--thunderid-spacing-unit);
}

.thunderid-admin__form {
  display: flex;
  flex-direction: column;
  gap: calc(var(--thunderid-spacing-unit) * 2);
  max-width: 560px;
}

.thunderid-admin__form-actions {
  display: flex;
  gap: var(--thunderid-spacing-unit);
  justify-content: flex-end;
}

.thunderid-admin__panel {
  display: flex;
  flex-direction: column;
  gap: calc(var(--thunderid-spacing-unit) * 1.5);
  padding: calc(var(--thunderid-spacing-unit) * 2);
  border: 1px solid var(--thunderid-color-border);
  border-radius: var(--thunderid-border-radius-large);
  background: var(--thunderid-color-background-surface);
}

.thunderid-admin__panel-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: calc(var(--thunderid-spacing-unit) * 1.5);
}

.thunderid-admin__panel-title {
  margin: 0;
  font-size: var(--thunderid-typography-fontSize-md);
  font-weight: var(--thunderid-typography-fontWeight-semibold);
}

.thunderid-admin__detail {
  display: grid;
  grid-template-columns: fit-content(200px) minmax(0, 1fr);
  gap: var(--thunderid-spacing-unit) calc(var(--thunderid-spacing-unit) * 2);
  margin: 0;
  font-size: var(--thunderid-typography-fontSize-sm);
}

.thunderid-admin__detail-label {
  color: var(--thunderid-color-text-secondary);
}

.thunderid-admin__detail-value {
  margin: 0;
  color: var(--thunderid-color-text-primary);
  overflow-wrap: anywhere;
}

.thunderid-admin__chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--thunderid-spacing-unit);
  margin: 0;
  padding: 0;
  list-style: none;
}

.thunderid-admin__chip {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--thunderid-spacing-unit) / 2);
  padding: calc(var(--thunderid-spacing-unit) / 2) var(--thunderid-spacing-unit);
  border-radius: var(--thunderid-border-radius-full);
  border: 1px solid var(--thunderid-color-border);
  background: var(--thunderid-color-background-surface);
  font-size: var(--thunderid-typography-fontSize-sm);
  color: var(--thunderid-color-text-primary);
}

.thunderid-admin__confirm {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--thunderid-spacing-unit);
  font-size: var(--thunderid-typography-fontSize-sm);
}

.thunderid-admin__muted {
  display: inline-flex;
  align-items: center;
  gap: var(--thunderid-spacing-unit);
  color: var(--thunderid-color-text-secondary);
  font-size: var(--thunderid-typography-fontSize-sm);
}

.thunderid-admin__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: calc(var(--thunderid-spacing-unit) * 1.5);
}

.thunderid-admin__name {
  display: inline-flex;
  align-items: center;
  gap: 0.75em;
}

.thunderid-admin__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: var(--thunderid-border-radius-full);
  background: var(--thunderid-color-primary-main);
  color: var(--thunderid-color-primary-contrastText);
  font-weight: var(--thunderid-typography-fontWeight-semibold);
  line-height: 1;
  user-select: none;
}

.thunderid-admin__picker {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: calc(var(--thunderid-spacing-unit) * 1.5);
}

.thunderid-admin__picker > .thunderid-select {
  flex: 1 1 180px;
}

.thunderid-admin__edit-form {
  display: flex;
  flex-direction: column;
  gap: calc(var(--thunderid-spacing-unit) * 1.5);
}
`;

export default ADMIN_CSS;
