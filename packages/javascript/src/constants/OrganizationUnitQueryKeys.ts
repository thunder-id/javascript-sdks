// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Cache keys for organization unit resources and their members. The SDK's reactive wrappers use them
 * to refetch after a mutation, and an application can reuse them as keys in its own data fetching cache.
 */
const OrganizationUnitQueryKeys: {
  ORGANIZATION_UNIT: 'organization-unit';
  ORGANIZATION_UNITS: 'organization-units';
  ORGANIZATION_UNIT_CHILDREN: 'organization-unit-children';
  ORGANIZATION_UNIT_GROUPS: 'organization-unit-groups';
  ORGANIZATION_UNIT_ROLES: 'organization-unit-roles';
  ORGANIZATION_UNIT_USERS: 'organization-unit-users';
} = {
  ORGANIZATION_UNIT: 'organization-unit',
  ORGANIZATION_UNITS: 'organization-units',
  ORGANIZATION_UNIT_CHILDREN: 'organization-unit-children',
  ORGANIZATION_UNIT_GROUPS: 'organization-unit-groups',
  ORGANIZATION_UNIT_ROLES: 'organization-unit-roles',
  ORGANIZATION_UNIT_USERS: 'organization-unit-users',
};

export default OrganizationUnitQueryKeys;
