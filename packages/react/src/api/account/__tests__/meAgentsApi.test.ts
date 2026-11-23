// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Mock, beforeEach, describe, expect, it, vi} from 'vitest';
import deleteMeAgent from '../deleteMeAgent';
import getMeAgent from '../getMeAgent';
import getMeAgents from '../getMeAgents';
import suspendAllMeAgents from '../suspendAllMeAgents';
import suspendMeAgent from '../suspendMeAgent';
import unsuspendMeAgent from '../unsuspendMeAgent';
import updateMeAgent from '../updateMeAgent';

const {mockBase, mockCreateFetcher} = vi.hoisted(() => ({
  mockBase: {
    deleteMeAgent: vi.fn(),
    getMeAgent: vi.fn(),
    getMeAgents: vi.fn(),
    suspendAllMeAgents: vi.fn(),
    suspendMeAgent: vi.fn(),
    unsuspendMeAgent: vi.fn(),
    updateMeAgent: vi.fn(),
  } as Record<string, Mock>,
  mockCreateFetcher: vi.fn() as Mock,
}));

vi.mock('@thunderid/browser', () => ({
  createHttpClientFetcher: (...args: unknown[]): unknown => mockCreateFetcher(...args) as unknown,
  deleteMeAgent: (...args: unknown[]): unknown => mockBase['deleteMeAgent'](...args) as unknown,
  getMeAgent: (...args: unknown[]): unknown => mockBase['getMeAgent'](...args) as unknown,
  getMeAgents: (...args: unknown[]): unknown => mockBase['getMeAgents'](...args) as unknown,
  suspendAllMeAgents: (...args: unknown[]): unknown => mockBase['suspendAllMeAgents'](...args) as unknown,
  suspendMeAgent: (...args: unknown[]): unknown => mockBase['suspendMeAgent'](...args) as unknown,
  unsuspendMeAgent: (...args: unknown[]): unknown => mockBase['unsuspendMeAgent'](...args) as unknown,
  updateMeAgent: (...args: unknown[]): unknown => mockBase['updateMeAgent'](...args) as unknown,
}));

const baseUrl = 'https://localhost:8090';
const payload = {attributes: {name: 'Spending assistant'}, grantTypes: ['ciba'], redirectUris: []};

const calls: [string, (fetcher?: Mock) => Promise<unknown>, Record<string, unknown>][] = [
  ['getMeAgents', (fetcher) => getMeAgents({baseUrl, fetcher, instanceId: 2, limit: 5}), {baseUrl, limit: 5}],
  ['getMeAgent', (fetcher) => getMeAgent({agentId: 'a-1', baseUrl, fetcher, instanceId: 2}), {agentId: 'a-1', baseUrl}],
  [
    'updateMeAgent',
    (fetcher) => updateMeAgent({agentId: 'a-1', baseUrl, fetcher, instanceId: 2, payload}),
    {agentId: 'a-1', baseUrl, payload},
  ],
  [
    'deleteMeAgent',
    (fetcher) => deleteMeAgent({agentId: 'a-1', baseUrl, fetcher, instanceId: 2}),
    {agentId: 'a-1', baseUrl},
  ],
  [
    'suspendMeAgent',
    (fetcher) => suspendMeAgent({agentId: 'a-1', baseUrl, fetcher, instanceId: 2}),
    {agentId: 'a-1', baseUrl},
  ],
  [
    'unsuspendMeAgent',
    (fetcher) => unsuspendMeAgent({agentId: 'a-1', baseUrl, fetcher, instanceId: 2}),
    {agentId: 'a-1', baseUrl},
  ],
  ['suspendAllMeAgents', (fetcher) => suspendAllMeAgents({baseUrl, fetcher, instanceId: 2}), {baseUrl}],
];

describe('personal agent self-service functions (React)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(mockBase).forEach((mock: Mock) => mock.mockResolvedValue(undefined));
  });

  it.each(calls)(
    "%s uses the SDK's HTTP client, which attaches the access token, for the instance",
    async (name, call, expected) => {
      const fetcher: Mock = vi.fn();
      mockCreateFetcher.mockReturnValue(fetcher);

      await call();

      expect(mockCreateFetcher).toHaveBeenCalledWith(2);
      expect(mockBase[name]).toHaveBeenCalledWith({...expected, fetcher});
    },
  );

  it.each(calls)('%s keeps a fetcher the caller supplies', async (name, call) => {
    const fetcher: Mock = vi.fn();

    await call(fetcher);

    expect(mockCreateFetcher).not.toHaveBeenCalled();
    expect(mockBase[name].mock.calls[0][0]).toMatchObject({fetcher});
  });
});
