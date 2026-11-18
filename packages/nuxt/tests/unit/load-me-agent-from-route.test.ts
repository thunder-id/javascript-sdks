// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDAPIError} from '@thunderid/browser';
import {describe, expect, it} from 'vitest';
import loadMeAgentFromRoute from '../../src/runtime/utils/loadMeAgentFromRoute';

describe('loadMeAgentFromRoute', () => {
  it('returns the body of a successful request', async () => {
    await expect(loadMeAgentFromRoute(Promise.resolve(3))).resolves.toBe(3);
  });

  it("raises a refusal as an API error with the route's status and the SDK's error code", async () => {
    await expect(
      loadMeAgentFromRoute(
        Promise.reject(Object.assign(new Error('x'), {data: {data: {code: 'X-1'}}, statusCode: 403})),
      ),
    ).rejects.toMatchObject({code: 'X-1', statusCode: 403});
    await expect(loadMeAgentFromRoute(Promise.reject(new Error('down')))).rejects.toThrow(ThunderIDAPIError);
    await expect(loadMeAgentFromRoute(Promise.reject(new Error('down')))).rejects.toMatchObject({
      code: 'PersonalAgents-ResponseError-001',
    });
  });
});
