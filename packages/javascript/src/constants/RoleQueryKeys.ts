// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Cache keys for role resources. The SDK's reactive wrappers use them to refetch after a mutation,
 * and an application can reuse them as keys in its own data fetching cache.
 */
const RoleQueryKeys: {
  ROLE: 'role';
  ROLES: 'roles';
  ROLE_ASSIGNMENTS: 'role-assignments';
} = {
  ROLE: 'role',
  ROLES: 'roles',
  ROLE_ASSIGNMENTS: 'role-assignments',
};

export default RoleQueryKeys;
