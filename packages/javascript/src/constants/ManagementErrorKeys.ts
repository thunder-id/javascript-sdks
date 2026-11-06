// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Translation keys for the refusals a project operation can meet, keyed by the server's error code, to
 * pass to `toManagementErrorMessage`. The server never refuses deleting a project.
 */
export const PROJECT_ERROR_KEYS: Readonly<Record<string, string>> = {
  'PRJ-1001': 'admin.projects.errors.invalid',
  'PRJ-1003': 'admin.projects.errors.invalid',
  'PRJ-1004': 'admin.projects.errors.invalid',
  'PRJ-1005': 'admin.projects.errors.invalid',
  'PRJ-1006': 'admin.projects.errors.conflict',
  'PRJ-1007': 'admin.projects.errors.handle_immutable',
  'PRJ-1012': 'admin.projects.errors.conflict',
};

/**
 * Translation keys for the refusals an organization unit operation can meet, keyed by the server's
 * error code, to pass to `toManagementErrorMessage`.
 */
export const ORGANIZATION_UNIT_ERROR_KEYS: Readonly<Record<string, string>> = {
  'OU-1001': 'admin.organization_units.errors.invalid',
  'OU-1004': 'admin.organization_units.errors.conflict',
  'OU-1005': 'admin.organization_units.errors.parent_not_found',
  'OU-1006': 'admin.organization_units.errors.has_children',
  'OU-1007': 'admin.organization_units.errors.circular',
  'OU-1008': 'admin.organization_units.errors.conflict',
  'OU-1012': 'admin.organization_units.errors.read_only',
};

/**
 * Translation keys for the refusals a sharing policy change can meet, keyed by HTTP status, to pass
 * to `toManagementErrorMessage`: a policy the server cannot accept, and an edit against a version
 * that has since changed.
 */
export const SHARING_POLICY_ERROR_KEYS: Readonly<Record<string, string>> = {
  '400': 'admin.sharing.errors.invalid',
  '409': 'admin.sharing.errors.version_conflict',
};
