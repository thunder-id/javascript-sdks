// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Cache keys for project resources. The SDK's reactive wrappers use them to refetch after a
 * mutation, and an application can reuse them as keys in its own data fetching cache.
 */
const ProjectQueryKeys: {
  PROJECT: 'project';
  PROJECTS: 'projects';
} = {
  PROJECT: 'project',
  PROJECTS: 'projects',
};

export default ProjectQueryKeys;
