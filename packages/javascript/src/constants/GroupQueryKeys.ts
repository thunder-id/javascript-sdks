// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Cache keys for group resources and group memberships. The SDK's reactive wrappers use them to
 * refetch after a mutation, and an application can reuse them as keys in its own data fetching cache.
 */
const GroupQueryKeys: {
  GROUP: 'group';
  GROUPS: 'groups';
  GROUP_MEMBERS: 'group-members';
  MEMBERSHIPS: 'group-memberships';
} = {
  GROUP: 'group',
  GROUPS: 'groups',
  GROUP_MEMBERS: 'group-members',
  MEMBERSHIPS: 'group-memberships',
};

export default GroupQueryKeys;
