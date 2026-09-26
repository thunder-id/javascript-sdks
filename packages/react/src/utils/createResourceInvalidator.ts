// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * A key identifying a resource query, e.g. `['applications', {limit: 10}]` or `['application', id]`.
 */
export type ResourceQueryKey = readonly unknown[];

/**
 * Lets mutations tell mounted queries that their data is stale.
 */
export interface ResourceInvalidator {
  /**
   * Notifies every subscribed query whose key starts with `partialKey`.
   */
  invalidate: (partialKey: ResourceQueryKey) => void;
  /**
   * Registers a listener for invalidations matching `queryKey`. Returns an unsubscribe function.
   */
  subscribe: (queryKey: ResourceQueryKey, listener: () => void) => () => void;
}

const matches = (queryKey: ResourceQueryKey, partialKey: ResourceQueryKey): boolean =>
  partialKey.every((part: unknown, index: number) => JSON.stringify(part) === JSON.stringify(queryKey[index]));

/**
 * Creates an in-memory invalidator. Invalidation matches on key prefix, so invalidating
 * `['applications']` reaches every applications list query regardless of its pagination.
 */
const createResourceInvalidator = (): ResourceInvalidator => {
  const subscriptions = new Set<{listener: () => void; queryKey: ResourceQueryKey}>();

  return {
    invalidate: (partialKey: ResourceQueryKey): void => {
      subscriptions.forEach(({listener, queryKey}: {listener: () => void; queryKey: ResourceQueryKey}) => {
        if (matches(queryKey, partialKey)) {
          listener();
        }
      });
    },
    subscribe: (queryKey: ResourceQueryKey, listener: () => void): (() => void) => {
      const subscription: {listener: () => void; queryKey: ResourceQueryKey} = {listener, queryKey};
      subscriptions.add(subscription);

      return (): void => {
        subscriptions.delete(subscription);
      };
    },
  };
};

/**
 * Used when the context does not supply an invalidator, for example when an integration renders
 * its own `ThunderIDContext` value instead of using `ThunderIDProvider`.
 */
export const fallbackResourceInvalidator: ResourceInvalidator = createResourceInvalidator();

export default createResourceInvalidator;
