// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type SuspendAllMeAgentsResponse, suspendAllMeAgents} from '@thunderid/node';
import {defineEventHandler} from 'h3';
import type {H3Event} from 'h3';
import handleMeAgentRequest from '../../../../utils/meAgentRoute';

/**
 * POST /api/auth/user/agents/suspend
 *
 * Suspends every personal agent of the signed-in user that the user has not already suspended. Takes no body.
 *
 * Response: `{suspendedCount}`.
 */
export default defineEventHandler(
  (event: H3Event): Promise<SuspendAllMeAgentsResponse> =>
    handleMeAgentRequest(event, (config) => suspendAllMeAgents(config)),
);
