// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/typedef, sort-keys, @typescript-eslint/explicit-function-return-type */

import {getQuery, getRouterParam, readBody} from 'h3';
import {describe, it, expect, vi, beforeEach} from 'vitest';

import agentDelete from '../../src/runtime/server/routes/auth/user/agents/agent.delete';
import agentGet from '../../src/runtime/server/routes/auth/user/agents/agent.get';
import agentPut from '../../src/runtime/server/routes/auth/user/agents/agent.put';
import agentSuspend from '../../src/runtime/server/routes/auth/user/agents/agent-suspend.post';
import agentUnsuspend from '../../src/runtime/server/routes/auth/user/agents/agent-unsuspend.post';
import agentsGet from '../../src/runtime/server/routes/auth/user/agents/agents.get';
import agentsSuspend from '../../src/runtime/server/routes/auth/user/agents/agents-suspend.post';
import {verifyAndRehydrateSession} from '../../src/runtime/server/utils/serverSession';

const mockClientInstance = vi.hoisted(() => ({
  getMeAgentRequestConfig: vi.fn<(...args: any[]) => Promise<any>>(),
}));

const core = vi.hoisted(() => ({
  deleteMeAgent: vi.fn<(...args: any[]) => Promise<any>>(),
  getMeAgent: vi.fn<(...args: any[]) => Promise<any>>(),
  getMeAgents: vi.fn<(...args: any[]) => Promise<any>>(),
  suspendAllMeAgents: vi.fn<(...args: any[]) => Promise<any>>(),
  suspendMeAgent: vi.fn<(...args: any[]) => Promise<any>>(),
  unsuspendMeAgent: vi.fn<(...args: any[]) => Promise<any>>(),
  updateMeAgent: vi.fn<(...args: any[]) => Promise<any>>(),
}));

vi.mock('@thunderid/node', async (importOriginal: () => Promise<Record<string, unknown>>) => ({
  ...(await importOriginal()),
  ...core,
}));

vi.mock('h3', () => ({
  defineEventHandler: (fn: Function) => fn,
  getQuery: vi.fn(),
  getRouterParam: vi.fn(),
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

const requestConfig = {
  baseUrl: 'https://localhost:8090',
  headers: {Authorization: 'Bearer session-token'},
  url: undefined,
};

const payload = {
  attributes: {name: 'Budget assistant'},
  description: 'Budgets',
  grantTypes: ['authorization_code'],
  redirectUris: ['https://assistant.example.com/callback'],
};

describe('/api/auth/user/agents routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAndRehydrateSession).mockResolvedValue({sessionId: 'session-1'} as any);
    vi.mocked(getQuery).mockReturnValue({});
    vi.mocked(getRouterParam).mockReturnValue('a-1');
    mockClientInstance.getMeAgentRequestConfig.mockResolvedValue(requestConfig);
  });

  it('rejects a missing session with 401 and sends nothing', async () => {
    vi.mocked(verifyAndRehydrateSession).mockResolvedValue(null as any);

    await expect((agentsGet as any)({})).rejects.toMatchObject({statusCode: 401});
    await expect((agentSuspend as any)({})).rejects.toMatchObject({statusCode: 401});
    expect(mockClientInstance.getMeAgentRequestConfig).not.toHaveBeenCalled();
  });

  it("lists the personal agents with the server-held session's token and the paging", async () => {
    vi.mocked(getQuery).mockReturnValue({limit: '5', offset: '10'});
    core.getMeAgents.mockResolvedValue({agents: [], totalResults: 0});

    await expect((agentsGet as any)({})).resolves.toEqual({agents: [], totalResults: 0});
    expect(mockClientInstance.getMeAgentRequestConfig).toHaveBeenCalledWith('session-1');
    expect(core.getMeAgents).toHaveBeenCalledWith({...requestConfig, kind: 'personal-assistant', limit: 5, offset: 10});
  });

  it('refuses a malformed page', async () => {
    vi.mocked(getQuery).mockReturnValue({limit: '-1'});

    await expect((agentsGet as any)({})).rejects.toMatchObject({statusCode: 400});
    expect(core.getMeAgents).not.toHaveBeenCalled();
  });

  it('suspends every personal agent', async () => {
    core.suspendAllMeAgents.mockResolvedValue({suspendedCount: 2});

    await expect((agentsSuspend as any)({})).resolves.toEqual({suspendedCount: 2});
    expect(core.suspendAllMeAgents).toHaveBeenCalledWith(requestConfig);
  });

  it.each([
    ['GET', agentGet, core.getMeAgent],
    ['DELETE', agentDelete, core.deleteMeAgent],
    ['POST suspend', agentSuspend, core.suspendMeAgent],
    ['POST unsuspend', agentUnsuspend, core.unsuspendMeAgent],
  ])('%s addresses the one agent in the route', async (_name: string, handler: unknown, operation: any) => {
    operation.mockResolvedValue(undefined);

    await (handler as any)({});

    expect(getRouterParam).toHaveBeenCalledWith({}, 'id', {decode: true});
    expect(operation).toHaveBeenCalledWith({...requestConfig, agentId: 'a-1'});
  });

  it.each([
    ['GET', agentGet],
    ['PUT', agentPut],
    ['DELETE', agentDelete],
    ['POST suspend', agentSuspend],
    ['POST unsuspend', agentUnsuspend],
  ])('%s refuses a route without an agent identifier', async (_name: string, handler: unknown) => {
    vi.mocked(getRouterParam).mockReturnValue('  ');

    await expect((handler as any)({})).rejects.toMatchObject({statusCode: 400});
    expect(mockClientInstance.getMeAgentRequestConfig).not.toHaveBeenCalled();
  });

  it('sends only the fields an owner may change', async () => {
    vi.mocked(readBody).mockResolvedValue({...payload, clientSecret: 'stolen'});
    core.updateMeAgent.mockResolvedValue({id: 'a-1'});

    await expect((agentPut as any)({})).resolves.toEqual({id: 'a-1'});
    expect(core.updateMeAgent).toHaveBeenCalledWith({...requestConfig, agentId: 'a-1', payload});
  });

  it('refuses an update body of the wrong shape, or one that cannot be read', async () => {
    vi.mocked(readBody).mockResolvedValue({...payload, grantTypes: 'all'});
    await expect((agentPut as any)({})).rejects.toMatchObject({statusCode: 400});

    vi.mocked(readBody).mockRejectedValue(new Error('not JSON'));
    await expect((agentPut as any)({})).rejects.toMatchObject({statusCode: 400});
    expect(core.updateMeAgent).not.toHaveBeenCalled();
  });

  it('keeps the server status and code without repeating its reply', async () => {
    core.suspendMeAgent.mockRejectedValue(
      Object.assign(new Error('secret upstream detail'), {code: 'AGT-1003', statusCode: 403}),
    );

    await expect((agentSuspend as any)({})).rejects.toMatchObject({
      data: {code: 'AGT-1003'},
      statusCode: 403,
      statusMessage: 'The personal agent request failed.',
    });
  });

  it('answers 502 for a failure that carries no status', async () => {
    core.getMeAgent.mockRejectedValue(new Error('network down'));

    await expect((agentGet as any)({})).rejects.toMatchObject({statusCode: 502});
  });
});
