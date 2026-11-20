// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {SuspendAllMeAgentsResponse} from '../../models/agent-resource';
import {ManagementRequestConfig} from '../../models/api';
import requestManagementResource from '../../utils/requestManagementResource';

/**
 * Configuration for the suspendAllMeAgents request.
 */
export type SuspendAllMeAgentsConfig = ManagementRequestConfig;

/**
 * Suspends every personal agent of the signed-in user that the user has not already suspended, in the
 * organization unit the access token names, after the server revokes the tokens issued to each.
 *
 * @param config - Request configuration object. A `url` is the collection of the user's agents, as for
 * {@link getMeAgents}.
 * @returns A promise that resolves with how many agents the request suspended.
 *
 * @example
 * ```typescript
 * const {suspendedCount} = await suspendAllMeAgents({baseUrl: 'https://localhost:8090'});
 * ```
 */
const suspendAllMeAgents = async ({url, ...config}: SuspendAllMeAgentsConfig): Promise<SuspendAllMeAgentsResponse> =>
  requestManagementResource<SuspendAllMeAgentsResponse>(
    {...config, url: url ? `${url.replace(/\/+$/, '')}/suspend` : undefined},
    {
      collection: 'users/me/agents/suspend',
      failureMessage: 'Failed to suspend your agents',
      method: 'POST',
      operation: 'suspendAllMeAgents',
    },
  );

export default suspendAllMeAgents;
