// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {Agent, ApiFetcher} from '@thunderid/browser';
import {type DOMWrapper, type VueWrapper, flushPromises, mount} from '@vue/test-utils';
import {type Mock, afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {h} from 'vue';
import BasePersonalAgentDetails, {
  type BasePersonalAgentDetailsRenderProps,
} from '../../../components/account/personal-agent-details/BasePersonalAgentDetails';
import PersonalAgentDetails from '../../../components/account/personal-agent-details/PersonalAgentDetails';
import BasePersonalAgentList, {
  type BasePersonalAgentListRenderProps,
} from '../../../components/account/personal-agent-list/BasePersonalAgentList';
import PersonalAgentList from '../../../components/account/personal-agent-list/PersonalAgentList';
import {createManagementContext, jsonResponse, translate} from '../../helpers/managementContext';

type FetcherMock = Mock<ApiFetcher>;

const {sdkFetcher} = vi.hoisted(() => ({sdkFetcher: {current: undefined as unknown as ApiFetcher}}));

vi.mock('@thunderid/browser', async (importOriginal: () => Promise<Record<string, unknown>>) => ({
  ...(await importOriginal()),
  createHttpClientFetcher: (): ApiFetcher => (url: string, init: RequestInit) => sdkFetcher.current(url, init),
}));

const baseUrl = 'https://thunder.example';

const assistant: Agent = {
  attributes: {name: 'Spending assistant', software: 'assistant-x'},
  clientId: 'pa_1',
  description: 'Answers questions about my spending',
  id: 'a-1',
  inboundAuthConfig: [
    {
      config: {
        grantTypes: ['authorization_code'],
        redirectUris: ['https://assistant.example.com/callback'],
        responseTypes: ['code'],
      },
      type: 'oauth2',
    },
  ],
  kind: 'personal-assistant',
  ouId: 'ou-1',
  status: {value: 'ACTIVE'},
  type: 'default',
};

interface Request {
  body?: unknown;
  method: string;
  url: string;
}

/** Answers like the server: the agent for a read or update, the list, suspend-all, and 204 for the rest. */
const createServer = (agent: Agent = assistant, overrides: Record<string, Response> = {}): FetcherMock =>
  vi.fn<ApiFetcher>().mockImplementation((url: string, init?: RequestInit) => {
    const method: string = init?.method ?? 'GET';
    const path: string = new URL(url).pathname;
    const override: Response | undefined = overrides[`${method} ${path}`];

    if (override) {
      return Promise.resolve(override);
    }
    if (path === '/users/me/agents') {
      return Promise.resolve(jsonResponse({agents: [agent], count: 1, startIndex: 1, totalResults: 1}));
    }
    if (method === 'POST' && path === '/users/me/agents/suspend') {
      return Promise.resolve(jsonResponse({suspendedCount: 1}));
    }
    if (method === 'GET' || method === 'PUT') {
      return Promise.resolve(jsonResponse(agent));
    }

    return Promise.resolve(jsonResponse(undefined, 204));
  });

const requests = (fetcher: FetcherMock): Request[] =>
  fetcher.mock.calls.map(([url, init]: [string, RequestInit]) => ({
    body: typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined,
    method: init?.method ?? 'GET',
    url,
  }));

const mounted: VueWrapper[] = [];
let server: FetcherMock;

const serve = (agent: Agent, overrides: Record<string, Response> = {}): void => {
  server = createServer(agent, overrides);
  sdkFetcher.current = server;
};

const mountWith = (
  component: unknown,
  props: Record<string, unknown> = {},
  {endpoints, slots = {}}: {endpoints?: Record<string, string>; slots?: Record<string, unknown>} = {},
): {context: ReturnType<typeof createManagementContext>; wrapper: VueWrapper} => {
  const context = createManagementContext({endpoints});
  const wrapper: VueWrapper = mount(component as never, {
    attachTo: document.body,
    global: {provide: context.provide},
    props,
    slots: slots as never,
  });
  mounted.push(wrapper);

  return {context, wrapper};
};

const button = (wrapper: VueWrapper | DOMWrapper<Element>, name: string): DOMWrapper<HTMLButtonElement> | undefined =>
  wrapper.findAll('button').find((candidate: DOMWrapper<HTMLButtonElement>) => candidate.text() === name);

const field = (wrapper: VueWrapper, name: string): DOMWrapper<HTMLInputElement> =>
  wrapper.find<HTMLInputElement>(`input[name="${name}"]`);

beforeEach(() => {
  serve(assistant);
});

afterEach(() => {
  mounted.splice(0).forEach((wrapper: VueWrapper) => wrapper.unmount());
});

describe('PersonalAgentList', () => {
  it("lists the user's personal agents through the SDK's own transport, not the management fetcher", async () => {
    const onSelect: Mock = vi.fn();
    const {context, wrapper} = mountWith(PersonalAgentList, {onSelect});

    await vi.waitFor(() => expect(wrapper.find('tbody').text()).toContain('Spending assistant'));
    expect(wrapper.find('caption').text()).toBe(translate('user.agents.title'));
    expect(wrapper.find('tbody').text()).toContain('pa_1');
    expect(wrapper.find('tbody').text()).toContain(translate('admin.common.status.active'));
    expect(requests(server)[0]).toEqual({
      body: undefined,
      method: 'GET',
      url: `${baseUrl}/users/me/agents?kind=personal-assistant&limit=20&offset=0`,
    });
    expect(context.fetcher).not.toHaveBeenCalled();

    await wrapper.find('tbody button').trigger('click');
    expect(onSelect).toHaveBeenCalledWith(assistant);
  });

  it('sends requests to the usersMeAgents endpoint override', async () => {
    mountWith(PersonalAgentList, {}, {endpoints: {usersMeAgents: 'https://rs.example.com/users/me/agents'}});

    await vi.waitFor(() => expect(server).toHaveBeenCalled());
    expect(requests(server)[0].url).toBe(
      'https://rs.example.com/users/me/agents?kind=personal-assistant&limit=20&offset=0',
    );
  });

  it('offers no suspend-all unless the app turns it on', async () => {
    const {wrapper} = mountWith(PersonalAgentList);

    await vi.waitFor(() => expect(wrapper.text()).toContain('Spending assistant'));
    expect(button(wrapper, translate('user.agents.suspend_all.action'))).toBeUndefined();
  });

  it('suspends every agent after confirmation and says how many', async () => {
    const {wrapper} = mountWith(PersonalAgentList, {suspendable: true});

    await vi.waitFor(() => expect(button(wrapper, translate('user.agents.suspend_all.action'))).toBeDefined());
    await button(wrapper, translate('user.agents.suspend_all.action'))!.trigger('click');
    expect(requests(server).some(({method}: Request) => method === 'POST')).toBe(false);
    await button(wrapper.find('[role="group"]'), translate('admin.common.actions.confirm'))!.trigger('click');

    await vi.waitFor(() => expect(wrapper.text()).toContain(translate('user.agents.suspend_all.done', {count: 1})));
    expect(requests(server)).toContainEqual({
      body: undefined,
      method: 'POST',
      url: `${baseUrl}/users/me/agents/suspend`,
    });
  });

  it('shows a translated message, never the server text, when a request is refused', async () => {
    serve(assistant, {
      'GET /users/me/agents': jsonResponse({code: 'AGT-1061', message: {defaultValue: 'Delegated token'}}, 403),
    });
    const {wrapper} = mountWith(PersonalAgentList);

    await vi.waitFor(() => expect(wrapper.text()).toContain(translate('admin.common.errors.forbidden')));
    expect(wrapper.text()).not.toContain('Delegated token');
  });
});

describe('BasePersonalAgentList', () => {
  it('says so when the user has no personal agents, and hides suspend-all', () => {
    const {wrapper} = mountWith(BasePersonalAgentList, {agents: [], onSuspendAll: vi.fn()});

    expect(wrapper.text()).toContain(translate('user.agents.list.empty'));
    expect(button(wrapper, translate('user.agents.suspend_all.action'))).toBeUndefined();
  });

  it('hands a custom render the agents, the columns and suspend-all', () => {
    let props: BasePersonalAgentListRenderProps | undefined;
    const onSuspendAll: Mock = vi.fn();
    const {wrapper} = mountWith(
      BasePersonalAgentList,
      {agents: [assistant], onSuspendAll},
      {
        slots: {
          default: (renderProps: BasePersonalAgentListRenderProps) => {
            props = renderProps;
            return h('p', 'custom list');
          },
        },
      },
    );

    expect(wrapper.text()).toContain('custom list');
    expect(props?.agents).toEqual([assistant]);
    expect(props?.rows).toEqual([assistant]);
    expect(props?.columns.map((column: {id: string}) => column.id)).toEqual(['name', 'clientId', 'status']);
    expect(props?.totalResults).toBe(1);
    props?.onSuspendAll?.();
    expect(onSuspendAll).toHaveBeenCalled();
  });
});

describe('PersonalAgentDetails', () => {
  it("shows the agent through the SDK's own transport, and offers no action unless the app turns it on", async () => {
    const {context, wrapper} = mountWith(PersonalAgentDetails, {agentId: 'a-1'});

    await vi.waitFor(() => expect(wrapper.find('h2').text()).toBe('Spending assistant'));
    expect(wrapper.text()).toContain(translate('user.agents.grant_types.authorization_code'));
    expect(wrapper.text()).toContain('https://assistant.example.com/callback');
    expect(wrapper.text()).toContain('software');
    expect(wrapper.text()).toContain('assistant-x');
    expect(requests(server)[0]).toEqual({
      body: undefined,
      method: 'GET',
      url: `${baseUrl}/users/me/agents/a-1?include=display`,
    });
    expect(context.fetcher).not.toHaveBeenCalled();
    [
      translate('user.agents.edit.action'),
      translate('user.agents.suspend.action'),
      translate('user.agents.unsuspend.action'),
      translate('user.agents.delete.action'),
    ].forEach((name: string) => expect(button(wrapper, name)).toBeUndefined());
  });

  it('suspends the agent after confirmation, then offers to lift the suspension', async () => {
    const {wrapper} = mountWith(PersonalAgentDetails, {agentId: 'a-1', suspendable: true});

    await vi.waitFor(() => expect(button(wrapper, translate('user.agents.suspend.action'))).toBeDefined());
    await button(wrapper, translate('user.agents.suspend.action'))!.trigger('click');
    expect(requests(server).some(({method}: Request) => method === 'POST')).toBe(false);
    serve({...assistant, status: {details: {appliedBy: ['owner'], reason: 'OWNER_SUSPENSION'}, value: 'SUSPENDED'}});
    const confirmation: DOMWrapper<Element> = wrapper.find('[role="group"]');
    expect(confirmation.attributes('aria-label')).toBe(
      translate('user.agents.suspend.confirm', {name: 'Spending assistant'}),
    );
    await button(confirmation, translate('admin.common.actions.confirm'))!.trigger('click');

    await vi.waitFor(() =>
      expect(requests(server)).toContainEqual({
        body: undefined,
        method: 'POST',
        url: `${baseUrl}/users/me/agents/a-1/suspend`,
      }),
    );
    await vi.waitFor(() => expect(button(wrapper, translate('user.agents.unsuspend.action'))).toBeDefined());
    expect(wrapper.text()).toContain(translate('user.agents.suspension.owner'));
  });

  it("lifts the owner's suspension, which needs no confirmation", async () => {
    serve({...assistant, status: {details: {appliedBy: ['owner']}, value: 'SUSPENDED'}});
    const {wrapper} = mountWith(PersonalAgentDetails, {agentId: 'a-1', suspendable: true});

    await vi.waitFor(() => expect(button(wrapper, translate('user.agents.unsuspend.action'))).toBeDefined());
    await button(wrapper, translate('user.agents.unsuspend.action'))!.trigger('click');

    await vi.waitFor(() =>
      expect(requests(server)).toContainEqual({
        body: undefined,
        method: 'POST',
        url: `${baseUrl}/users/me/agents/a-1/unsuspend`,
      }),
    );
  });

  it("explains the organization's suspension and offers only the owner's own", async () => {
    serve({...assistant, status: {details: {appliedBy: ['organization']}, value: 'SUSPENDED'}});
    const {wrapper} = mountWith(PersonalAgentDetails, {agentId: 'a-1', suspendable: true});

    await vi.waitFor(() => expect(wrapper.text()).toContain(translate('user.agents.suspension.organization')));
    expect(button(wrapper, translate('user.agents.suspend.action'))).toBeDefined();
    expect(button(wrapper, translate('user.agents.unsuspend.action'))).toBeUndefined();
  });

  it('saves the editable part, keeping the attributes it does not edit', async () => {
    serve({...assistant, attributes: {...assistant.attributes, tags: ['finance']}});
    const {wrapper} = mountWith(PersonalAgentDetails, {agentId: 'a-1', editable: true});

    await vi.waitFor(() => expect(button(wrapper, translate('user.agents.edit.action'))).toBeDefined());
    await button(wrapper, translate('user.agents.edit.action'))!.trigger('click');
    await field(wrapper, 'name').setValue('Budget assistant');
    await field(wrapper, 'attribute-software').setValue('assistant-y');
    await field(wrapper, 'grantType-refresh_token').setValue(true);
    await wrapper.find('form').trigger('submit');

    await vi.waitFor(() =>
      expect(requests(server)).toContainEqual({
        body: {
          attributes: {name: 'Budget assistant', software: 'assistant-y', tags: ['finance']},
          description: 'Answers questions about my spending',
          grantTypes: ['authorization_code', 'refresh_token'],
          redirectUris: ['https://assistant.example.com/callback'],
        },
        method: 'PUT',
        url: `${baseUrl}/users/me/agents/a-1`,
      }),
    );
  });

  it('closes the form once the update succeeds, and keeps the changes when it fails', async () => {
    serve(assistant, {'PUT /users/me/agents/a-1': jsonResponse({code: 'AGT-5000'}, 500)});
    const {wrapper} = mountWith(PersonalAgentDetails, {agentId: 'a-1', editable: true});

    await vi.waitFor(() => expect(button(wrapper, translate('user.agents.edit.action'))).toBeDefined());
    await button(wrapper, translate('user.agents.edit.action'))!.trigger('click');
    await field(wrapper, 'name').setValue('Budget assistant');
    await wrapper.find('form').trigger('submit');

    await vi.waitFor(() => expect(wrapper.text()).toContain(translate('user.agents.action.error')));
    expect(field(wrapper, 'name').element.value).toBe('Budget assistant');

    server.mockImplementationOnce(() => Promise.resolve(jsonResponse(assistant)));
    await wrapper.find('form').trigger('submit');

    await vi.waitFor(() => expect(wrapper.find('form').exists()).toBe(false));
  });

  it('keeps the save off while the authorization code grant has no redirect URI', async () => {
    const {wrapper} = mountWith(PersonalAgentDetails, {agentId: 'a-1', editable: true});

    await vi.waitFor(() => expect(button(wrapper, translate('user.agents.edit.action'))).toBeDefined());
    await button(wrapper, translate('user.agents.edit.action'))!.trigger('click');
    await field(wrapper, 'redirectUris').setValue('');

    expect(button(wrapper, translate('user.agents.edit.save'))!.element.disabled).toBe(true);

    await field(wrapper, 'grantType-authorization_code').setValue(false);
    expect(button(wrapper, translate('user.agents.edit.save'))!.element.disabled).toBe(false);
  });

  it('deletes the agent after confirmation', async () => {
    const {wrapper} = mountWith(PersonalAgentDetails, {agentId: 'a-1', deletable: true});

    await vi.waitFor(() => expect(button(wrapper, translate('user.agents.delete.action'))).toBeDefined());
    await button(wrapper, translate('user.agents.delete.action'))!.trigger('click');
    expect(requests(server).some(({method}: Request) => method === 'DELETE')).toBe(false);
    await button(wrapper.find('[role="group"]'), translate('admin.common.actions.confirm'))!.trigger('click');

    await vi.waitFor(() => expect(wrapper.emitted('deleted')).toHaveLength(1));
    expect(requests(server)).toContainEqual({body: undefined, method: 'DELETE', url: `${baseUrl}/users/me/agents/a-1`});
    await vi.waitFor(() => expect(wrapper.find('h2').exists()).toBe(false));
    expect(button(wrapper, translate('user.agents.delete.action'))).toBeUndefined();
  });

  it('never shows the previous agent, or its actions, while the next one loads', async () => {
    const {wrapper} = mountWith(PersonalAgentDetails, {agentId: 'a-1', deletable: true, suspendable: true});
    await vi.waitFor(() => expect(button(wrapper, translate('user.agents.delete.action'))).toBeDefined());
    await button(wrapper, translate('user.agents.delete.action'))!.trigger('click');
    server.mockImplementation(() => new Promise<Response>(() => undefined));

    await wrapper.setProps({agentId: 'a-2'});

    expect(wrapper.find('h2').exists()).toBe(false);
    expect(wrapper.find('[role="group"]').exists()).toBe(false);
    expect(wrapper.find('[role="status"]').exists()).toBe(true);
  });

  it('does not emit deleted for a delete that completes after another agent was selected', async () => {
    let finishDelete: (response: Response) => void = () => undefined;
    const {wrapper} = mountWith(PersonalAgentDetails, {agentId: 'a-1', deletable: true});
    await vi.waitFor(() => expect(button(wrapper, translate('user.agents.delete.action'))).toBeDefined());
    await button(wrapper, translate('user.agents.delete.action'))!.trigger('click');
    server.mockImplementation((_url: string, init?: RequestInit) =>
      init?.method === 'DELETE'
        ? new Promise<Response>((resolve: (response: Response) => void) => {
            finishDelete = resolve;
          })
        : Promise.resolve(jsonResponse({...assistant, attributes: {name: 'Travel planner'}, id: 'a-2'})),
    );
    await button(wrapper.find('[role="group"]'), translate('admin.common.actions.confirm'))!.trigger('click');

    await wrapper.setProps({agentId: 'a-2'});
    await vi.waitFor(() => expect(wrapper.find('h2').text()).toBe('Travel planner'));
    finishDelete(jsonResponse(undefined, 204));

    await vi.waitFor(() =>
      expect(requests(server)).toContainEqual({
        body: undefined,
        method: 'DELETE',
        url: `${baseUrl}/users/me/agents/a-1`,
      }),
    );
    await new Promise<void>((resolve: () => void) => {
      setTimeout(resolve, 0);
    });
    expect(wrapper.emitted('deleted')).toBeUndefined();
    expect(wrapper.find('h2').text()).toBe('Travel planner');
  });

  it('offers no edit or deletion for a declarative agent', async () => {
    serve({...assistant, isReadOnly: true});
    const {wrapper} = mountWith(PersonalAgentDetails, {
      agentId: 'a-1',
      deletable: true,
      editable: true,
      suspendable: true,
    });

    await vi.waitFor(() => expect(button(wrapper, translate('user.agents.suspend.action'))).toBeDefined());
    expect(button(wrapper, translate('user.agents.edit.action'))).toBeUndefined();
    expect(button(wrapper, translate('user.agents.delete.action'))).toBeUndefined();
  });
});

describe('BasePersonalAgentDetails', () => {
  const renderSlot = (agent: Agent, handlers: Record<string, unknown>): BasePersonalAgentDetailsRenderProps => {
    let props: BasePersonalAgentDetailsRenderProps | undefined;
    mountWith(
      BasePersonalAgentDetails,
      {agent, ...handlers},
      {
        slots: {
          default: (renderProps: BasePersonalAgentDetailsRenderProps) => {
            props = renderProps;
            return h('p', 'custom view');
          },
        },
      },
    );

    return props!;
  };

  it("closes the edit form when the agent changes, so one agent's values are never saved onto another", async () => {
    const onUpdate: Mock = vi.fn();
    const {wrapper} = mountWith(BasePersonalAgentDetails, {agent: assistant, onUpdate});

    await button(wrapper, translate('user.agents.edit.action'))!.trigger('click');
    await field(wrapper, 'name').setValue('Budget assistant');
    await wrapper.setProps({agent: {...assistant, attributes: {name: 'Travel planner'}, id: 'a-2'}});

    expect(wrapper.find('form').exists()).toBe(false);
    await button(wrapper, translate('user.agents.edit.action'))!.trigger('click');
    expect(field(wrapper, 'name').element.value).toBe('Travel planner');
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('keeps the form open until the update settles, and with the changes when it fails', async () => {
    let settle: (saved: boolean) => void = () => undefined;
    const onUpdate: Mock = vi.fn(
      () =>
        new Promise<boolean>((resolve: (saved: boolean) => void) => {
          settle = resolve;
        }),
    );
    const {wrapper} = mountWith(BasePersonalAgentDetails, {agent: assistant, onUpdate});

    await button(wrapper, translate('user.agents.edit.action'))!.trigger('click');
    await field(wrapper, 'name').setValue('Budget assistant');
    await wrapper.find('form').trigger('submit');
    settle(false);
    await flushPromises();

    expect(field(wrapper, 'name').element.value).toBe('Budget assistant');

    await wrapper.find('form').trigger('submit');
    settle(true);
    await flushPromises();

    expect(wrapper.find('form').exists()).toBe(false);
    expect(onUpdate).toHaveBeenCalledTimes(2);
  });

  it('hands a custom render the agent and only the actions that apply', () => {
    const onUnsuspend: Mock = vi.fn();
    const agent: Agent = {
      ...assistant,
      isReadOnly: true,
      status: {details: {appliedBy: ['owner']}, value: 'SUSPENDED'},
    };
    const props: BasePersonalAgentDetailsRenderProps = renderSlot(agent, {
      onDelete: vi.fn(),
      onSuspend: vi.fn(),
      onUnsuspend,
      onUpdate: vi.fn(),
    });

    expect(props.agent).toEqual(agent);
    expect(props.oauth?.grantTypes).toEqual(['authorization_code']);
    expect(props.onDelete).toBeUndefined();
    expect(props.onUpdate).toBeUndefined();
    expect(props.onSuspend).toBeUndefined();
    props.onUnsuspend?.();
    expect(onUnsuspend).toHaveBeenCalled();
  });

  it('hands a custom render the suspension of an agent the owner has not suspended', () => {
    const props: BasePersonalAgentDetailsRenderProps = renderSlot(
      {...assistant, status: {details: {appliedBy: ['organization']}, value: 'SUSPENDED'}},
      {onSuspend: vi.fn(), onUnsuspend: vi.fn()},
    );

    expect(props.onSuspend).toBeDefined();
    expect(props.onUnsuspend).toBeUndefined();
  });

  it('says the agent was not found when there is none to show', () => {
    const {wrapper} = mountWith(BasePersonalAgentDetails, {});

    expect(wrapper.find('[role="alert"]').text()).toBe(translate('admin.common.errors.not_found'));
  });
});
