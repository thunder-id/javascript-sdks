// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use server';

import {SuspendAllMeAgentsResponse, suspendAllMeAgents} from '@thunderid/node';
import runMeAgentRequest, {MeAgentActionResult} from './runMeAgentRequest';

/**
 * Suspends every personal agent of the signed-in user that the user has not already suspended, with the session's
 * access token, which stays on the server. Takes nothing from the caller.
 */
const suspendAllMeAgentsAction = async (): Promise<MeAgentActionResult<SuspendAllMeAgentsResponse>> =>
  runMeAgentRequest((config) => suspendAllMeAgents(config));

export default suspendAllMeAgentsAction;
