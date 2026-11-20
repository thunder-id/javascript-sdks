// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/typedef, @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-function-return-type */

import {AgentQueryKeys, ThunderIDAPIError} from '@thunderid/browser';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {effectScope, shallowRef} from 'vue';

const fetchMock = vi.fn();
const mutate = vi.fn();
const resources: {key: () => unknown; load: () => Promise<unknown>; options?: {enabled?: () => boolean}}[] = [];
const mutations: {
  invalidates: () => unknown;
  onSuccess?: (data: unknown, variables?: unknown) => void;
  run: (variables?: unknown) => Promise<unknown>;
}[] = [];
let resource: {data: unknown; error: Error | null};
let mutationError: Error | null;

vi.mock('@thunderid/vue', () => ({
  BasePersonalAgentDetails: {name: 'BasePersonalAgentDetails'},
  BasePersonalAgentList: {name: 'BasePersonalAgentList'},
  useI18n: () => ({t: (key: string) => key}),
  useResourceMutation: (
    run: any,
    invalidates: any,
    options?: {onSuccess?: (data: unknown, variables?: unknown) => void},
  ) => {
    mutations.push({invalidates, onSuccess: options?.onSuccess, run});

    return {error: shallowRef(mutationError), isLoading: shallowRef(false), mutate};
  },
  useResourceQuery: (key: any, load: any, options?: {enabled?: () => boolean}) => {
    resources.push({key, load, options});

    return {data: shallowRef(resource.data), error: shallowRef(resource.error), isLoading: shallowRef(false)};
  },
}));

const {default: PersonalAgentList} = await import('../../src/runtime/components/account/PersonalAgentList');
const {default: PersonalAgentDetails} = await import('../../src/runtime/components/account/PersonalAgentDetails');

const setup = (component: any, props: Record<string, unknown>) => {
  const emit = vi.fn();
  const scope = effectScope();
  const render = scope.run(() => component.setup(props, {attrs: {}, emit, slots: {}} as any));

  return {emit, props: () => render().props as any, scope};
};

const listProps = {
  className: '',
  description: undefined,
  limit: 20,
  onSelect: undefined,
  preferences: undefined,
  selectedAgentId: undefined,
  suspendable: false,
  title: undefined,
};

const detailsProps = {
  agentId: 'a/1',
  className: '',
  deletable: false,
  editable: false,
  preferences: undefined,
  suspendable: false,
};

describe('personal agents (Nuxt)', () => {
  beforeEach(() => {
    resources.length = 0;
    mutations.length = 0;
    resource = {data: undefined, error: null};
    mutationError = null;
    fetchMock.mockResolvedValue({});
    mutate.mockResolvedValue(undefined);
    vi.stubGlobal('$fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('lists the agents through the server route, offering suspend-all only when the app allows it', async () => {
    resource = {data: {agents: [{id: 'a-1'}], totalResults: 3}, error: null};
    const {props, scope} = setup(PersonalAgentList, listProps);

    expect(props().agents).toEqual([{id: 'a-1'}]);
    expect(props().totalResults).toBe(3);
    expect(props().onSuspendAll).toBeUndefined();
    expect(resources[0].key()).toEqual([AgentQueryKeys.ME_AGENTS, {limit: 20, offset: 0}]);

    await resources[0].load();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/user/agents', {query: {limit: 20, offset: 0}});

    props().onPageChange(20);
    expect(resources[0].key()).toEqual([AgentQueryKeys.ME_AGENTS, {limit: 20, offset: 20}]);
    scope.stop();
  });

  it('suspends every agent through its route and says how many', async () => {
    const {props, scope} = setup(PersonalAgentList, {...listProps, suspendable: true});

    props().onSuspendAll();
    expect(mutate).toHaveBeenCalled();
    await mutations[0].run();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/user/agents/suspend', {method: 'POST'});
    expect(mutations[0].invalidates()).toEqual([[AgentQueryKeys.ME_AGENT], [AgentQueryKeys.ME_AGENTS]]);

    mutations[0].onSuccess?.({suspendedCount: 2});
    expect(props().suspendedCount).toBe(2);
    scope.stop();
  });

  it('translates a refusal without the server reply', () => {
    resource = {data: undefined, error: new ThunderIDAPIError('x', 'y', 'nuxt', 403)};
    const {props, scope} = setup(PersonalAgentList, listProps);

    expect(props().error).toBe('admin.common.errors.forbidden');
    scope.stop();
  });

  it('reads the agent through its server route and offers nothing by default', async () => {
    resource = {data: {id: 'a/1'}, error: null};
    const {props, scope} = setup(PersonalAgentDetails, detailsProps);

    expect(props().agent).toEqual({id: 'a/1'});
    ['onUpdate', 'onDelete', 'onSuspend', 'onUnsuspend'].forEach((name: string) =>
      expect(props()[name]).toBeUndefined(),
    );
    expect(resources[0].key()).toEqual([AgentQueryKeys.ME_AGENT, 'a/1']);
    expect(resources[0].options?.enabled?.()).toBe(true);
    await resources[0].load();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/user/agents/a%2F1');
    scope.stop();
  });

  it('runs each change through the route for this agent', async () => {
    const {emit, props, scope} = setup(PersonalAgentDetails, {
      ...detailsProps,
      deletable: true,
      editable: true,
      suspendable: true,
    });
    const [update, deletion, suspension] = mutations;

    void props().onUpdate({attributes: {name: 'x'}, grantTypes: [], redirectUris: []});
    props().onDelete();
    props().onSuspend();
    props().onUnsuspend();
    expect(mutate.mock.calls).toEqual([
      [{id: 'a/1', payload: {attributes: {name: 'x'}, grantTypes: [], redirectUris: []}}],
      ['a/1'],
      [{action: 'suspend', id: 'a/1'}],
      [{action: 'unsuspend', id: 'a/1'}],
    ]);

    await update.run({id: 'a/1', payload: {attributes: {name: 'x'}}});
    await deletion.run('a/1');
    await suspension.run({action: 'suspend', id: 'a/1'});
    await suspension.run({action: 'unsuspend', id: 'a/1'});
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/user/agents/a%2F1', {
      body: {attributes: {name: 'x'}},
      method: 'PUT',
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/user/agents/a%2F1', {method: 'DELETE'});
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/user/agents/a%2F1/suspend', {method: 'POST'});
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/user/agents/a%2F1/unsuspend', {method: 'POST'});
    expect(suspension.invalidates({action: 'suspend', id: 'a/1'})).toEqual([
      [AgentQueryKeys.ME_AGENT, 'a/1'],
      [AgentQueryKeys.ME_AGENTS],
    ]);

    deletion.onSuccess?.(undefined, 'a/1');
    expect(emit).toHaveBeenCalledWith('deleted');
    scope.stop();
  });

  it('reports whether the update saved', async () => {
    const {props, scope} = setup(PersonalAgentDetails, {...detailsProps, editable: true});
    const changes = {attributes: {name: 'x'}, grantTypes: [], redirectUris: []};

    mutate.mockResolvedValueOnce({id: 'a/1'});
    await expect(props().onUpdate(changes)).resolves.toBe(true);
    mutate.mockResolvedValueOnce(undefined);
    await expect(props().onUpdate(changes)).resolves.toBe(false);
    scope.stop();
  });

  it('shows nothing for a deleted agent, and no other agent while the next one loads', () => {
    resource = {data: {id: 'a/1'}, error: null};
    const current = {...detailsProps, deletable: true};
    const {props, scope} = setup(PersonalAgentDetails, current);

    mutations[1].onSuccess?.(undefined, 'a/1');
    expect(props().agent).toBeUndefined();
    expect(props().isLoading).toBe(false);

    current.agentId = 'a/2';
    expect(props().agent).toBeUndefined();
    expect(props().isLoading).toBe(true);
    scope.stop();
  });

  it('does not emit deleted for a delete that completes after another agent was selected', () => {
    const current = {...detailsProps, deletable: true};
    const {emit, scope} = setup(PersonalAgentDetails, current);

    current.agentId = 'a/2';
    mutations[1].onSuccess?.(undefined, 'a/1');
    expect(emit).not.toHaveBeenCalled();
    scope.stop();
  });

  it('translates a failed change', () => {
    resource = {data: {id: 'a/1'}, error: null};
    mutationError = new ThunderIDAPIError('x', 'y', 'nuxt', 500);
    const {props, scope} = setup(PersonalAgentDetails, detailsProps);

    expect(props().error).toBe('user.agents.action.error');
    scope.stop();
  });

  it('reads nothing without an agent identifier', () => {
    const {scope} = setup(PersonalAgentDetails, {...detailsProps, agentId: ''});

    expect(resources[0].options?.enabled?.()).toBe(false);
    scope.stop();
  });
});
