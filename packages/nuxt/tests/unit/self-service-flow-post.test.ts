// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/typedef, sort-keys, @typescript-eslint/explicit-function-return-type */

import {ThunderIDAPIError} from '@thunderid/node';
import {readBody} from 'h3';
import {describe, it, expect, vi, beforeEach} from 'vitest';

import selfServiceFlowHandler from '../../src/runtime/server/routes/auth/user/self-service-flow.post';
import {verifyAndRehydrateSession} from '../../src/runtime/server/utils/serverSession';

// ── vi.hoisted ────────────────────────────────────────────────────────────────
const mockClientInstance = vi.hoisted(() => ({
  executeEmbeddedSelfServiceFlow: vi.fn<(...args: any[]) => Promise<any>>(),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('h3', () => ({
  defineEventHandler: (fn: Function) => fn,
  readBody: vi.fn(),
  createError: vi.fn((opts: any) => Object.assign(new Error(opts.statusMessage), opts)),
}));

vi.mock('#imports', () => ({
  useRuntimeConfig: vi.fn(() => ({thunderid: {sessionSecret: 'test-secret'}})),
}));

vi.mock('../../src/runtime/server/ThunderIDNuxtClient', () => ({
  default: {getInstance: () => mockClientInstance},
}));

vi.mock('../../src/runtime/server/utils/serverSession', () => ({
  verifyAndRehydrateSession: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockEvent = {};

const start = {
  flowType: 'SELF_SERVICE',
  handle: 'default-self-attribute-verification-flow',
  inputs: {attribute: 'email'},
};
const step = {challengeToken: 'ct-1', executionId: 'exec-1', flowStatus: 'INCOMPLETE'};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/auth/user/self-service-flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAndRehydrateSession).mockResolvedValue({sessionId: 'session-1'} as any);
    vi.mocked(readBody).mockResolvedValue(start);
  });

  it('rejects an invalid or missing session with 401 and never reaches the server', async () => {
    vi.mocked(verifyAndRehydrateSession).mockResolvedValue(null as any);

    await expect((selfServiceFlowHandler as any)(mockEvent)).rejects.toMatchObject({statusCode: 401});
    expect(mockClientInstance.executeEmbeddedSelfServiceFlow).not.toHaveBeenCalled();
  });

  it('runs the step with the server-resolved session and returns it', async () => {
    mockClientInstance.executeEmbeddedSelfServiceFlow.mockResolvedValue(step);

    const result = await (selfServiceFlowHandler as any)(mockEvent);

    expect(mockClientInstance.executeEmbeddedSelfServiceFlow).toHaveBeenCalledWith(start, 'session-1');
    expect(result).toEqual(step);
  });

  it('does not let the caller choose the session or add a user or application identifier', async () => {
    vi.mocked(readBody).mockResolvedValue({
      ...start,
      applicationId: 'app-1',
      sessionId: 'someone-elses-session',
      userId: 'someone-else',
    });
    mockClientInstance.executeEmbeddedSelfServiceFlow.mockResolvedValue(step);

    await (selfServiceFlowHandler as any)(mockEvent);

    expect(mockClientInstance.executeEmbeddedSelfServiceFlow).toHaveBeenCalledWith(start, 'session-1');
  });

  it.each([
    ['a flow of another type', {flowType: 'AUTHENTICATION', handle: 'h'}],
    ['a new flow without a handle', {flowType: 'SELF_SERVICE'}],
    ['inputs that are not strings', {executionId: 'exec-1', inputs: {otp: 1}}],
    ['no body', undefined],
  ])('refuses %s with 400 without reaching the server', async (_label: string, body: unknown) => {
    vi.mocked(readBody).mockResolvedValue(body);

    await expect((selfServiceFlowHandler as any)(mockEvent)).rejects.toMatchObject({statusCode: 400});
    expect(mockClientInstance.executeEmbeddedSelfServiceFlow).not.toHaveBeenCalled();
  });

  it("answers with the status of the server's refusal, never its reply", async () => {
    mockClientInstance.executeEmbeddedSelfServiceFlow.mockRejectedValue(
      new ThunderIDAPIError('{"description":"internal detail"}', 'x-ResponseError-001', 'javascript', 403),
    );

    const failure: any = await (selfServiceFlowHandler as any)(mockEvent).catch((error: unknown) => error);

    expect(failure).toMatchObject({statusCode: 403, statusMessage: 'Self-service flow request failed.'});
    expect(JSON.stringify(failure)).not.toContain('internal detail');
    expect(String(failure.message)).not.toContain('internal detail');
  });

  it('answers 502 for an unexpected failure, without its text', async () => {
    mockClientInstance.executeEmbeddedSelfServiceFlow.mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.5'));

    const failure: any = await (selfServiceFlowHandler as any)(mockEvent).catch((error: unknown) => error);

    expect(failure).toMatchObject({statusCode: 502});
    expect(String(failure.message)).not.toContain('ECONNREFUSED');
  });
});
