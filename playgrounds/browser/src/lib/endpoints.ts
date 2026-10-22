// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ResourceEndpointConfig, ResourceEndpointKey, resolveResourceEndpoint} from '@thunderid/browser';
import {MANAGEMENT_PATHS} from '../config';

/**
 * Paths of the sign-in and self-service endpoints under `baseUrl`. The SDK exports no table of
 * these defaults, so the playground lists them to show what an unset override resolves to.
 */
const SELF_SERVICE_PATHS: Record<string, string> = {
  flowExecute: 'flow/execute',
  flowMeta: 'flow/meta',
  usersMe: 'users/me',
  usersMeCredentials: 'users/me/update-credentials',
  usersMeMeta: 'users/me/meta',
};

export interface ResolvedEndpoint {
  key: string;
  group: 'management' | 'selfService';
  /** Whether `endpoints.<key>` set the URL, or the SDK falls back to `{baseUrl}/{path}`. */
  source: 'override' | 'baseUrl';
  url: string;
}

/**
 * The URL each resource endpoint resolves to for a client configuration, the way the SDK resolves
 * it: `resolveResourceEndpoint()` returns the `endpoints` override, and an unset one falls back to
 * `{baseUrl}/{path}`.
 */
export const resolveEndpoints = (config: ResourceEndpointConfig & {baseUrl?: string}): ResolvedEndpoint[] => {
  const baseUrl: string = config.baseUrl?.replace(/\/+$/, '') ?? '';
  const rows = (paths: Record<string, string>, group: ResolvedEndpoint['group']): ResolvedEndpoint[] =>
    Object.entries(paths).map(([key, path]: [string, string]): ResolvedEndpoint => {
      const override: string | undefined = resolveResourceEndpoint(key as ResourceEndpointKey, config);

      return {key, group, source: override ? 'override' : 'baseUrl', url: override ?? `${baseUrl}/${path}`};
    });

  return [...rows(MANAGEMENT_PATHS, 'management'), ...rows(SELF_SERVICE_PATHS, 'selfService')];
};
