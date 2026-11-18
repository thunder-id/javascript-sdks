// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AgentQueryKeys, ThunderIDAPIError} from '@thunderid/node';
import {ReactElement} from 'react';
import {beforeEach, describe, expect, it, Mock, vi} from 'vitest';

const BasePersonalAgentList: () => null = () => null;
const BasePersonalAgentDetails: () => null = () => null;

vi.mock('react', async (importOriginal: () => Promise<Record<string, unknown>>) => ({
  ...(await importOriginal()),
  // Lets the components run outside a renderer.
  useMemo: <T>(factory: () => T): T => factory(),
  useState: <T>(initial: T): [T, Mock] => [initial, vi.fn()],
}));

interface Resource {
  data: unknown;
  error: Error | null;
  isLoading: boolean;
}

const resources: {key: unknown; load: () => unknown; options?: {enabled?: boolean}}[] = [];
const mutations: {
  invalidates: () => unknown;
  onSuccess?: (data: unknown, variables?: unknown) => void;
  run: (variables: unknown) => unknown;
}[] = [];
const mutate: Mock = vi.fn();
let resource: Resource = {data: undefined, error: null, isLoading: false};
let mutationError: Error | null = null;

vi.mock('@thunderid/react', () => ({
  BasePersonalAgentDetails,
  BasePersonalAgentList,
  useResourceMutation: (
    run: (variables: unknown) => unknown,
    invalidates: () => unknown,
    options?: {onSuccess?: (data: unknown, variables?: unknown) => void},
  ) => {
    mutations.push({invalidates, onSuccess: options?.onSuccess, run});

    return {error: mutationError, isLoading: false, mutate};
  },
  useResourceQuery: (key: unknown, load: () => unknown, options?: {enabled?: boolean}) => {
    resources.push({key, load, options});

    return resource;
  },
  useTranslation: () => ({t: (key: string): string => key}),
}));

vi.mock('../../../../contexts/ThunderID/useThunderID', () => ({default: () => ({preferences: {}})}));

const succeed = (): Promise<{data: undefined; success: true}> => Promise.resolve({data: undefined, success: true});

const actions: Record<string, Mock> = {
  deleteMeAgentAction: vi.fn(succeed),
  getMeAgentAction: vi.fn(succeed),
  getMeAgentsAction: vi.fn(succeed),
  suspendAllMeAgentsAction: vi.fn(succeed),
  suspendMeAgentAction: vi.fn(succeed),
  unsuspendMeAgentAction: vi.fn(succeed),
  updateMeAgentAction: vi.fn(succeed),
};

Object.keys(actions).forEach((name: string) => {
  vi.doMock(`../../../../../server/actions/account/${name}`, () => ({
    default: (...args: unknown[]): unknown => actions[name](...args) as unknown,
  }));
});

const {default: PersonalAgentList} = await import('../PersonalAgentList');
const {default: PersonalAgentDetails} = await import('../../PersonalAgentDetails/PersonalAgentDetails');

type Props = Record<string, (...args: unknown[]) => unknown> & Record<string, unknown>;

beforeEach(() => {
  resources.length = 0;
  mutations.length = 0;
  resource = {data: undefined, error: null, isLoading: false};
  mutationError = null;
  vi.clearAllMocks();
  mutate.mockResolvedValue(undefined);
  Object.values(actions).forEach((action: Mock) => action.mockImplementation(succeed));
});

describe('PersonalAgentList (Next.js)', () => {
  it('renders the React Base list with the page read through the server action', () => {
    resource = {data: {agents: [{id: 'a-1'}], totalResults: 7}, error: null, isLoading: false};
    const element = PersonalAgentList({limit: 5}) as ReactElement<Props>;

    expect(element.type).toBe(BasePersonalAgentList);
    expect(element.props['agents']).toEqual([{id: 'a-1'}]);
    expect(element.props['totalResults']).toBe(7);
    expect(element.props['onSuspendAll']).toBeUndefined();
    expect(resources[0].key).toEqual([AgentQueryKeys.ME_AGENTS, {limit: 5, offset: 0}]);

    resources[0].load();
    expect(actions['getMeAgentsAction']).toHaveBeenCalledWith({limit: 5, offset: 0});
  });

  it('suspends every agent through the server action when the app allows it', () => {
    const element = PersonalAgentList({suspendable: true}) as ReactElement<Props>;

    element.props['onSuspendAll']();
    expect(mutate).toHaveBeenCalled();
    mutations[0].run(undefined);
    expect(actions['suspendAllMeAgentsAction']).toHaveBeenCalled();
    expect(mutations[0].invalidates()).toEqual([[AgentQueryKeys.ME_AGENT], [AgentQueryKeys.ME_AGENTS]]);
  });

  it('translates a refusal', () => {
    resource = {data: undefined, error: new ThunderIDAPIError('x', 'y', 'nextjs', 403), isLoading: false};
    const element = PersonalAgentList({}) as ReactElement<Props>;

    expect(element.props['error']).toBe('admin.common.errors.forbidden');
  });
});

describe('PersonalAgentDetails (Next.js)', () => {
  it('renders the React Base details with the agent read through the server action, offering nothing by default', () => {
    resource = {data: {id: 'a-1'}, error: null, isLoading: false};
    const element = PersonalAgentDetails({agentId: 'a-1'}) as ReactElement<Props>;

    expect(element.type).toBe(BasePersonalAgentDetails);
    expect(element.props['agent']).toEqual({id: 'a-1'});
    ['onUpdate', 'onDelete', 'onSuspend', 'onUnsuspend'].forEach((name: string) =>
      expect(element.props[name]).toBeUndefined(),
    );
    resources[0].load();
    expect(actions['getMeAgentAction']).toHaveBeenCalledWith('a-1');
  });

  it('runs each change through its server action for this agent', () => {
    const onDeleted: Mock = vi.fn();
    const element = PersonalAgentDetails({
      agentId: 'a-1',
      deletable: true,
      editable: true,
      onDeleted,
      suspendable: true,
    }) as ReactElement<Props>;
    const [update, deletion, suspension] = mutations;

    void element.props['onUpdate']({attributes: {}, grantTypes: [], redirectUris: []});
    element.props['onDelete']();
    element.props['onSuspend']();
    element.props['onUnsuspend']();
    expect(mutate.mock.calls).toEqual([
      [{id: 'a-1', payload: {attributes: {}, grantTypes: [], redirectUris: []}}],
      ['a-1'],
      [{action: 'suspend', id: 'a-1'}],
      [{action: 'unsuspend', id: 'a-1'}],
    ]);

    update.run({id: 'a-1', payload: {attributes: {}}});
    deletion.run('a-1');
    suspension.run({action: 'suspend', id: 'a-1'});
    suspension.run({action: 'unsuspend', id: 'a-1'});
    expect(actions['updateMeAgentAction']).toHaveBeenCalledWith('a-1', {attributes: {}});
    expect(actions['deleteMeAgentAction']).toHaveBeenCalledWith('a-1');
    expect(actions['suspendMeAgentAction']).toHaveBeenCalledWith('a-1');
    expect(actions['unsuspendMeAgentAction']).toHaveBeenCalledWith('a-1');
    expect(suspension.invalidates({action: 'suspend', id: 'a-1'})).toEqual([
      [AgentQueryKeys.ME_AGENT, 'a-1'],
      [AgentQueryKeys.ME_AGENTS],
    ]);

    deletion.onSuccess?.(undefined, 'a-1');
    expect(onDeleted).toHaveBeenCalled();
  });

  it('reports whether the update saved', async () => {
    const element = PersonalAgentDetails({agentId: 'a-1', editable: true}) as ReactElement<Props>;
    const changes = {attributes: {}, grantTypes: [], redirectUris: []};

    mutate.mockResolvedValueOnce({id: 'a-1'});
    await expect(element.props['onUpdate'](changes)).resolves.toBe(true);
    mutate.mockResolvedValueOnce(undefined);
    await expect(element.props['onUpdate'](changes)).resolves.toBe(false);
  });

  it('shows no other agent while the next one loads', () => {
    resource = {data: {id: 'a-1'}, error: null, isLoading: false};
    const element = PersonalAgentDetails({agentId: 'a-2'}) as ReactElement<Props>;

    expect(element.props['agent']).toBeUndefined();
    expect(element.props['isLoading']).toBe(true);
  });

  it('does not close an agent for a delete of another that completes later', () => {
    const onDeleted: Mock = vi.fn();
    expect((PersonalAgentDetails({agentId: 'a-2', deletable: true, onDeleted}) as ReactElement).type).toBe(
      BasePersonalAgentDetails,
    );

    mutations[1].onSuccess?.(undefined, 'a-1');
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('translates a failed change', () => {
    resource = {data: {id: 'a-1'}, error: null, isLoading: false};
    mutationError = new ThunderIDAPIError('x', 'y', 'nextjs', 500);
    const element = PersonalAgentDetails({agentId: 'a-1'}) as ReactElement<Props>;

    expect(element.props['error']).toBe('user.agents.action.error');
  });
});
