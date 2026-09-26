// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ResourceEndpointKey, resolveResourceEndpoint} from '@thunderid/browser';
import useThunderID from '../contexts/ThunderID/useThunderID';

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
 * Resolves where a management resource collection lives, honoring the provider's `endpoints`
 * override so the management API can run on a different host from the authorization server.
 *
 * @param key - The resource collection.
 * @returns The base URL and optional collection URL override.
 */
const useManagementEndpoint = (
  key: Extract<ResourceEndpointKey, 'agents' | 'applications' | 'users'>,
): ManagementEndpoint => {
  const {baseUrl, endpoints} = useThunderID();

  return {baseUrl, url: resolveResourceEndpoint(key, {endpoints})};
};

export default useManagementEndpoint;
