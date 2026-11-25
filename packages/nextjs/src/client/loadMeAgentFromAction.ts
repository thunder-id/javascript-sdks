// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDAPIError} from '@thunderid/node';
import type {MeAgentActionResult} from '../server/actions/account/runMeAgentRequest';

/**
 * Waits for a personal agent server action and returns its data, or raises its refusal as a
 * {@link ThunderIDAPIError} carrying the server's status and the SDK's error code. The Nuxt SDK raises the same error
 * from its server routes, so a refusal reads the same in both.
 *
 * @param action - The pending server action.
 * @returns The action's data.
 */
const loadMeAgentFromAction = async <T>(action: Promise<MeAgentActionResult<T>>): Promise<T> => {
  const result: MeAgentActionResult<T> = await action;

  if (!result.success) {
    throw new ThunderIDAPIError(
      'Personal agent request failed',
      result.code ?? 'PersonalAgents-ResponseError-001',
      'nextjs',
      result.statusCode,
    );
  }

  return result.data;
};

export default loadMeAgentFromAction;
