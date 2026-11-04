// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Cache keys for the sharing policies of a user, an application, a role or a flow, and the overlay
 * rules they resolve to. The SDK's reactive wrappers use them to refetch after a mutation, and an
 * application can reuse them as keys in its own data fetching cache.
 */
const SharingPolicyQueryKeys: {
  OVERLAY_RULES: 'overlay-rules';
  SHARING_POLICIES: 'sharing-policies';
} = {
  OVERLAY_RULES: 'overlay-rules',
  SHARING_POLICIES: 'sharing-policies',
};

export default SharingPolicyQueryKeys;
