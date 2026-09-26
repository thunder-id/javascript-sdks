// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Cache keys for application resources. The SDK's reactive wrappers use them to refetch after a
 * mutation, and an application can reuse them as keys in its own data fetching cache.
 */
const ApplicationQueryKeys: {
  APPLICATION: 'application';
  APPLICATIONS: 'applications';
} = {
  APPLICATION: 'application',
  APPLICATIONS: 'applications',
};

export default ApplicationQueryKeys;
