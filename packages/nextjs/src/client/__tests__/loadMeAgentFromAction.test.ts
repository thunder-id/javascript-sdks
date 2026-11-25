// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDAPIError} from '@thunderid/node';
import {describe, expect, it} from 'vitest';
import loadMeAgentFromAction from '../loadMeAgentFromAction';

describe('loadMeAgentFromAction', () => {
  it('returns the data of a successful action', async () => {
    await expect(loadMeAgentFromAction(Promise.resolve({data: 3, success: true}))).resolves.toBe(3);
  });

  it('raises a refusal as an API error with its status and code', async () => {
    await expect(
      loadMeAgentFromAction(Promise.resolve({code: 'X-1', statusCode: 403, success: false})),
    ).rejects.toMatchObject({code: 'X-1', statusCode: 403});
    await expect(loadMeAgentFromAction(Promise.resolve({success: false}))).rejects.toThrow(ThunderIDAPIError);
    await expect(loadMeAgentFromAction(Promise.resolve({success: false}))).rejects.toMatchObject({
      code: 'PersonalAgents-ResponseError-001',
    });
  });
});
