// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ResourceEndpointKey, resolveResourceEndpoint} from '@thunderid/browser';
import useThunderID from './useThunderID';

/**
 * The URL inputs a management API function needs.
 */
export interface ManagementEndpoint {
  baseUrl: string | undefined;
  /**
   * The collection URL from `endpoints` when overridden, otherwise `undefined` so the API function
   * falls back to `{baseUrl}/{collection}`.
   */
  url: string | undefined;
}

/**
 * The management resource collections a composable can address.
 */
export type ManagementEndpointKey = Extract<
  ResourceEndpointKey,
  'agents' | 'agentTypes' | 'applications' | 'groups' | 'roles' | 'users' | 'userTypes'
>;

/**
 * Resolves where a management resource collection lives, honoring the provider's `endpoints`
 * override, or `{baseUrl}/{collection}` when none is set.
 *
 * @param key - The resource collection.
 * @returns The base URL and optional collection URL override.
 */
const useManagementEndpoint = (key: ManagementEndpointKey): ManagementEndpoint => {
  const {baseUrl, endpoints} = useThunderID();

  return {baseUrl, url: resolveResourceEndpoint(key, {endpoints})};
};

export default useManagementEndpoint;
