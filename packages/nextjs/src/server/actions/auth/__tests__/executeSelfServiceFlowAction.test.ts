// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDAPIError} from '@thunderid/node';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import getClient from '../../../getClient';
import getSessionId from '../../getSessionId';
import executeSelfServiceFlowAction from '../executeSelfServiceFlowAction';

vi.mock('../../getSessionId', () => ({default: vi.fn()}));
vi.mock('../../../getClient', () => ({default: vi.fn()}));

const mockExecute = vi.fn();

const start = {
  flowType: 'SELF_SERVICE',
  handle: 'default-self-attribute-verification-flow',
  inputs: {attribute: 'email'},
};
const step = {challengeToken: 'ct-1', executionId: 'exec-1', flowStatus: 'INCOMPLETE'};

describe('executeSelfServiceFlowAction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getClient).mockReturnValue({
      executeEmbeddedSelfServiceFlow: mockExecute,
    } as unknown as ReturnType<typeof getClient>);
    vi.mocked(getSessionId).mockResolvedValue('session-1');
  });

  it('refuses without a session and never reaches the server', async () => {
    vi.mocked(getSessionId).mockResolvedValue(undefined);

    expect(await executeSelfServiceFlowAction(start)).toEqual({statusCode: 401, success: false});
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('runs the step with the server-resolved session and returns it', async () => {
    mockExecute.mockResolvedValue(step);

    const result = await executeSelfServiceFlowAction(start);

    expect(mockExecute).toHaveBeenCalledWith(start, 'session-1');
    expect(result).toEqual({data: step, success: true});
  });

  it('does not let the caller choose the session or add a user or application identifier', async () => {
    mockExecute.mockResolvedValue(step);

    await executeSelfServiceFlowAction({
      ...start,
      applicationId: 'app-1',
      sessionId: 'someone-elses-session',
      userId: 'someone-else',
    });

    expect(mockExecute).toHaveBeenCalledWith(start, 'session-1');
  });

  it.each([
    ['a flow of another type', {flowType: 'AUTHENTICATION', handle: 'h'}],
    ['a new flow without a handle', {flowType: 'SELF_SERVICE'}],
    ['inputs that are not strings', {executionId: 'exec-1', inputs: {otp: 1}}],
    ['a body that is not an object', 'flowType=SELF_SERVICE'],
  ])('refuses %s without reaching the server', async (_label: string, request: unknown) => {
    expect(await executeSelfServiceFlowAction(request)).toEqual({statusCode: 400, success: false});
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it("carries a refusal's status across the boundary, without the reply of the server", async () => {
    mockExecute.mockRejectedValue(
      new ThunderIDAPIError(
        '{"code":"FES-1017","description":"internal detail"}',
        'x-ResponseError-001',
        'javascript',
        403,
      ),
    );

    const result = await executeSelfServiceFlowAction(start);

    expect(result).toEqual({statusCode: 403, success: false});
    expect(JSON.stringify(result)).not.toContain('internal detail');
  });

  it('does not leak the text of an unexpected error', async () => {
    mockExecute.mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.5:8090'));

    expect(await executeSelfServiceFlowAction(start)).toEqual({success: false});
  });
});
