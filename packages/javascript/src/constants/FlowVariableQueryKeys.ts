// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Cache keys for a flow's variables. The SDK's reactive wrappers use them to refetch after a mutation, and
 * an application can reuse them as keys in its own data fetching cache.
 */
const FlowVariableQueryKeys: {
  DEFINITIONS: 'flow-variable-definitions';
  VALUES: 'flow-variable-values';
} = {
  DEFINITIONS: 'flow-variable-definitions',
  VALUES: 'flow-variable-values',
};

export default FlowVariableQueryKeys;
