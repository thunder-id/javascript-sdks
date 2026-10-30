// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Styles for the UserProfile presentation component.
 * Parity target: `@thunderid/react` BaseUserProfile.styles.ts
 */
const USER_PROFILE_CSS = `
/* ============================================================
   UserProfile (React Parity)
   ============================================================ */

.thunderid-user-profile {
  display: flex;
  flex-direction: column;
  padding: calc(var(--thunderid-spacing-unit) * 4);
  min-width: 600px;
  font-family: var(--thunderid-typography-fontFamily);
  background: var(--thunderid-color-background-surface);
  border-radius: var(--thunderid-border-radius-large, 8px);
  box-sizing: border-box;
}

/* ── Hero (avatar + name + subtitle) ────────────────────────── */

.thunderid-user-profile__hero {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: calc(var(--thunderid-spacing-unit) * 1);
  padding-bottom: calc(var(--thunderid-spacing-unit) * 2);
  margin-bottom: calc(var(--thunderid-spacing-unit) * 2);
  border-bottom: 1px solid var(--thunderid-color-border);
}

.thunderid-user-profile__avatar-wrapper {
  position: relative;
  border-radius: 50%;
}

.thunderid-user-profile__avatar {
  border-radius: 50%;
  object-fit: cover;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

img.thunderid-user-profile__avatar {
  border-radius: 50%;
  object-fit: cover;
  width: 70px;
  height: 70px;
}

.thunderid-user-profile__avatar--sm {
  width: 48px;
  height: 48px;
}

.thunderid-user-profile__avatar--sm .thunderid-user-profile__avatar-initials {
  font-size: 1rem;
}

.thunderid-user-profile__avatar--md {
  width: 64px;
  height: 64px;
}

.thunderid-user-profile__avatar--md .thunderid-user-profile__avatar-initials {
  font-size: 1.25rem;
}

.thunderid-user-profile__avatar--lg {
  width: 70px;
  height: 70px;
}

.thunderid-user-profile__avatar--lg .thunderid-user-profile__avatar-initials {
  font-size: 1.5rem;
}

.thunderid-user-profile__avatar-initials {
  color: #ffffff;
  font-weight: var(--thunderid-typography-fontWeight-semibold, 600);
  line-height: 1;
  letter-spacing: 0.02em;
  pointer-events: none;
  user-select: none;
}

.thunderid-user-profile__hero-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-top: calc(var(--thunderid-spacing-unit) * 0.5);
}

.thunderid-user-profile__hero-name {
  font-size: var(--thunderid-typography-fontSize-xl, 1.5rem);
  font-weight: var(--thunderid-typography-fontWeight-semibold, 600);
  color: var(--thunderid-color-text-primary);
  margin: 0;
  line-height: var(--thunderid-typography-lineHeight-tight, 1.2);
}

.thunderid-user-profile__hero-subtitle {
  font-size: var(--thunderid-typography-fontSize-sm, 0.875rem);
  color: var(--thunderid-color-text-secondary);
  margin-top: calc(var(--thunderid-spacing-unit) * 0.5);
  line-height: var(--thunderid-typography-lineHeight-normal, 1.4);
}

/* ── Alerts & loading ────────────────────────────────────────── */

.thunderid-user-profile__error {
  margin-bottom: calc(var(--thunderid-spacing-unit) * 3);
}

.thunderid-user-profile__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(var(--thunderid-spacing-unit) * 4) 0;
}

/* ── Fields ──────────────────────────────────────────────────── */

.thunderid-user-profile__fields {
  display: flex;
  flex-direction: column;
}

.thunderid-user-profile__field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(var(--thunderid-spacing-unit) * 1.5) 0;
  border-bottom: 1px solid var(--thunderid-color-border);
  min-height: 28px;
  box-sizing: border-box;
}

.thunderid-user-profile__field:last-child {
  border-bottom: none;
}

.thunderid-user-profile__field-inner {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--thunderid-spacing-unit);
  min-width: 0;
}

.thunderid-user-profile__field-label {
  font-size: var(--thunderid-typography-fontSize-sm, 0.875rem);
  font-weight: var(--thunderid-typography-fontWeight-medium, 500);
  color: var(--thunderid-color-text-secondary);
  width: 120px;
  flex-shrink: 0;
  line-height: 28px;
  text-align: start;
}

.thunderid-user-profile__field-value {
  color: var(--thunderid-color-text-primary);
  flex: 1;
  display: inline-block;
  align-items: center;
  font-size: var(--thunderid-typography-fontSize-sm, 0.875rem);
  line-height: 28px;
  word-break: break-word;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 350px;
  min-width: 0;
  text-align: start;
  overflow: hidden;
}

.thunderid-user-profile__field-placeholder {
  font-size: var(--thunderid-typography-fontSize-sm, 0.875rem);
  font-style: italic;
  color: var(--thunderid-color-text-secondary);
  opacity: 0.7;
  cursor: pointer;
  text-decoration: underline;
  white-space: nowrap;
  line-height: 28px;
}

.thunderid-user-profile__field-placeholder:hover {
  opacity: 1;
}

.thunderid-user-profile__field-actions {
  display: flex;
  gap: calc(var(--thunderid-spacing-unit) * 0.5);
  align-items: center;
  margin-inline-start: calc(var(--thunderid-spacing-unit) * 4);
}

.thunderid-user-profile__field-edit-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--thunderid-color-text-secondary);
  padding: 0;
  min-height: auto;
  opacity: 0.7;
  line-height: 0;
  transition: opacity var(--thunderid-transition-fast, 0.15s ease);
}

.thunderid-user-profile__field-edit-btn:hover {
  opacity: 1;
  background: transparent;
}

.thunderid-user-profile__field-edit {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: calc(var(--thunderid-spacing-unit) * 0.5);
}

.thunderid-user-profile__verification-status {
  flex-shrink: 0;
  padding: 0 var(--thunderid-spacing-unit);
  border: 1px solid currentColor;
  border-radius: var(--thunderid-border-radius-small, 4px);
  font-size: 0.75rem;
  line-height: 20px;
  white-space: nowrap;
}

.thunderid-user-profile__verification-status--verified {
  color: var(--thunderid-color-success-main);
}

.thunderid-user-profile__verification-status--unverified {
  color: var(--thunderid-color-text-secondary);
}

.thunderid-user-profile__verification {
  padding: var(--thunderid-spacing-unit) 0;
}

.thunderid-user-profile__visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.thunderid-user-profile__field-error {
  color: var(--thunderid-color-error, #d32f2f);
  font-size: var(--thunderid-typography-fontSize-xs, 0.8rem);
  font-weight: var(--thunderid-typography-fontWeight-medium, 500);
  margin-top: calc(var(--thunderid-spacing-unit) * 0.5);
}

/* ── Footer ──────────────────────────────────────────────────── */

.thunderid-user-profile__footer {
  padding-top: calc(var(--thunderid-spacing-unit) * 2);
  border-top: 1px solid var(--thunderid-color-border);
}

/* ── Compact modifier ────────────────────────────────────────── */

.thunderid-user-profile--compact {
  padding: calc(var(--thunderid-spacing-unit) * 2);
  width: 100%;
}
`;

export default USER_PROFILE_CSS;
