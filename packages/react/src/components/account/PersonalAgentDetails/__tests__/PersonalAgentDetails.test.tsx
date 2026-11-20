// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {act, cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {Agent, ApiFetcher, createResourceInvalidator} from '@thunderid/browser';
import {ReactElement, ReactNode} from 'react';
import {Mock, afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import I18nProvider from '../../../../contexts/I18n/I18nProvider';
import ThemeProvider from '../../../../contexts/Theme/ThemeProvider';
import ThunderIDContext, {ThunderIDContextProps} from '../../../../contexts/ThunderID/ThunderIDContext';
import BasePersonalAgentDetails, {BasePersonalAgentDetailsRenderProps} from '../BasePersonalAgentDetails';
import PersonalAgentDetails from '../PersonalAgentDetails';

type FetcherMock = Mock<ApiFetcher>;

const {sdkFetcher} = vi.hoisted(() => ({sdkFetcher: {current: undefined as unknown as ApiFetcher}}));

vi.mock('@thunderid/browser', async (importOriginal: () => Promise<Record<string, unknown>>) => ({
  ...(await importOriginal()),
  createHttpClientFetcher: (): ApiFetcher => (url: string, init: RequestInit) => sdkFetcher.current(url, init),
}));

const baseUrl = 'https://localhost:8090';

const respond = (body: unknown, status = 200): Response =>
  ({
    json: () => Promise.resolve(body),
    ok: status >= 200 && status < 300,
    status,
    statusText: '',
    text: () => Promise.resolve(JSON.stringify(body)),
  }) as Response;

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

interface Server {
  fetcher: FetcherMock;
  requests: () => {body?: unknown; method: string; url: string}[];
}

const createServer = (agent: Agent = assistant): Server => {
  const fetcher: FetcherMock = vi.fn<ApiFetcher>().mockImplementation((url: string, init?: RequestInit) => {
    const method: string = init?.method ?? 'GET';

    if (method === 'GET' || method === 'PUT') {
      return Promise.resolve(respond(agent));
    }

    return Promise.resolve(respond(undefined, 204));
  });

  return {
    fetcher,
    requests: () =>
      fetcher.mock.calls.map(([url, init]: [string, RequestInit]) => ({
        body: typeof init?.body === 'string' ? (JSON.parse(init.body) as unknown) : undefined,
        method: init?.method ?? 'GET',
        url,
      })),
  };
};

const renderWithProviders = (ui: ReactElement, httpFetcher?: ApiFetcher): ReturnType<typeof render> => {
  const thunderID = {
    baseUrl,
    http: {fetcher: httpFetcher},
    instanceId: 0,
    invalidator: createResourceInvalidator(),
    isInitialized: true,
    isLoading: false,
    vendor: 'thunderid',
  } as unknown as ThunderIDContextProps;

  function Providers({children}: {children: ReactNode}): ReactElement {
    return (
      <ThunderIDContext.Provider value={thunderID}>
        <I18nProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </I18nProvider>
      </ThunderIDContext.Provider>
    );
  }

  return render(ui, {wrapper: Providers});
};

const serve = (agent: Agent): void => {
  server = createServer(agent);
  sdkFetcher.current = server.fetcher;
};

let server: Server;

beforeEach(() => {
  serve(assistant);
});

afterEach(() => {
  cleanup();
});

describe('PersonalAgentDetails', () => {
  it("shows the agent through the SDK's own transport, and offers no action unless the app turns it on", async () => {
    const httpFetcher: FetcherMock = vi.fn<ApiFetcher>();
    renderWithProviders(<PersonalAgentDetails agentId="a-1" />, httpFetcher);

    expect(await screen.findByRole('heading', {name: 'Spending assistant'})).toBeTruthy();
    expect(screen.getByText('Authorization code')).toBeTruthy();
    expect(screen.getByText('https://assistant.example.com/callback')).toBeTruthy();
    expect(screen.getByText('software')).toBeTruthy();
    expect(screen.getByText('assistant-x')).toBeTruthy();
    expect(server.requests()[0]).toEqual({
      body: undefined,
      method: 'GET',
      url: `${baseUrl}/users/me/agents/a-1?include=display`,
    });
    expect(httpFetcher).not.toHaveBeenCalled();
    ['Edit', 'Suspend', 'Unsuspend', 'Delete agent'].forEach((name: string) =>
      expect(screen.queryByRole('button', {name})).toBeNull(),
    );
  });

  it('suspends the agent after confirmation, then offers to lift the suspension', async () => {
    renderWithProviders(<PersonalAgentDetails agentId="a-1" suspendable />);

    fireEvent.click(await screen.findByRole('button', {name: 'Suspend'}));
    expect(server.requests().some(({method}: {method: string}) => method === 'POST')).toBe(false);
    serve({...assistant, status: {details: {appliedBy: ['owner'], reason: 'OWNER_SUSPENSION'}, value: 'SUSPENDED'}});
    fireEvent.click(
      within(screen.getByRole('group', {name: /^Suspend Spending assistant\?/})).getByRole('button', {
        name: 'Confirm',
      }),
    );

    await waitFor(() =>
      expect(server.requests()).toContainEqual({
        body: undefined,
        method: 'POST',
        url: `${baseUrl}/users/me/agents/a-1/suspend`,
      }),
    );
    expect(await screen.findByRole('button', {name: 'Unsuspend'})).toBeTruthy();
    expect(screen.getByText('You suspended this agent.')).toBeTruthy();
  });

  it("lifts the owner's suspension, which needs no confirmation", async () => {
    serve({...assistant, status: {details: {appliedBy: ['owner']}, value: 'SUSPENDED'}});
    renderWithProviders(<PersonalAgentDetails agentId="a-1" suspendable />);

    fireEvent.click(await screen.findByRole('button', {name: 'Unsuspend'}));

    await waitFor(() =>
      expect(server.requests()).toContainEqual({
        body: undefined,
        method: 'POST',
        url: `${baseUrl}/users/me/agents/a-1/unsuspend`,
      }),
    );
  });

  it("explains the organization's suspension and offers only the owner's own", async () => {
    serve({...assistant, status: {details: {appliedBy: ['organization']}, value: 'SUSPENDED'}});
    renderWithProviders(<PersonalAgentDetails agentId="a-1" suspendable />);

    expect(
      await screen.findByText(
        'Your organization suspended this agent. Only an administrator can lift that suspension.',
      ),
    ).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Suspend'})).toBeTruthy();
    expect(screen.queryByRole('button', {name: 'Unsuspend'})).toBeNull();
  });

  it('saves the editable part, keeping the attributes it does not edit', async () => {
    serve({...assistant, attributes: {...assistant.attributes, tags: ['finance']}});
    renderWithProviders(<PersonalAgentDetails agentId="a-1" editable />);

    fireEvent.click(await screen.findByRole('button', {name: 'Edit'}));
    fireEvent.change(screen.getByLabelText(/^Name/), {target: {value: 'Budget assistant'}});
    fireEvent.change(screen.getByLabelText('software'), {target: {value: 'assistant-y'}});
    fireEvent.click(screen.getByLabelText('Refresh token'));
    fireEvent.click(screen.getByRole('button', {name: 'Save changes'}));

    await waitFor(() =>
      expect(server.requests()).toContainEqual({
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
    renderWithProviders(<PersonalAgentDetails agentId="a-1" editable />);

    fireEvent.click(await screen.findByRole('button', {name: 'Edit'}));
    fireEvent.change(screen.getByLabelText(/^Name/), {target: {value: 'Budget assistant'}});
    server.fetcher.mockImplementationOnce(() => Promise.resolve(respond({code: 'AGT-5000'}, 500)));
    fireEvent.click(screen.getByRole('button', {name: 'Save changes'}));

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect((screen.getByLabelText(/^Name/) as HTMLInputElement).value).toBe('Budget assistant');

    fireEvent.click(screen.getByRole('button', {name: 'Save changes'}));

    await waitFor(() => expect(screen.queryByRole('button', {name: 'Save changes'})).toBeNull());
  });

  it('keeps the save off while the authorization code grant has no redirect URI', async () => {
    renderWithProviders(<PersonalAgentDetails agentId="a-1" editable />);

    fireEvent.click(await screen.findByRole('button', {name: 'Edit'}));
    fireEvent.change(screen.getByLabelText(/^Redirect URIs/), {target: {value: ''}});

    expect(screen.getByRole<HTMLButtonElement>('button', {name: 'Save changes'}).disabled).toBe(true);

    fireEvent.click(screen.getByLabelText('Authorization code'));
    expect(screen.getByRole<HTMLButtonElement>('button', {name: 'Save changes'}).disabled).toBe(false);
  });

  it('deletes the agent after confirmation', async () => {
    const onDeleted: Mock = vi.fn();
    renderWithProviders(<PersonalAgentDetails agentId="a-1" deletable onDeleted={onDeleted} />);

    fireEvent.click(await screen.findByRole('button', {name: 'Delete agent'}));
    expect(server.requests().some(({method}: {method: string}) => method === 'DELETE')).toBe(false);
    fireEvent.click(screen.getByRole('button', {name: 'Confirm'}));

    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(server.requests()).toContainEqual({
      body: undefined,
      method: 'DELETE',
      url: `${baseUrl}/users/me/agents/a-1`,
    });
  });

  it('shows a deleted agent as gone, without an onDeleted', async () => {
    renderWithProviders(<PersonalAgentDetails agentId="a-1" deletable />);

    fireEvent.click(await screen.findByRole('button', {name: 'Delete agent'}));
    fireEvent.click(screen.getByRole('button', {name: 'Confirm'}));

    await waitFor(() => expect(screen.queryByRole('heading', {name: 'Spending assistant'})).toBeNull());
    expect(screen.queryByRole('button', {name: 'Delete agent'})).toBeNull();
  });

  it('never shows the previous agent, or its actions, while the next one loads', async () => {
    const {rerender} = renderWithProviders(<PersonalAgentDetails agentId="a-1" deletable suspendable />);
    fireEvent.click(await screen.findByRole('button', {name: 'Delete agent'}));
    server.fetcher.mockImplementation(() => new Promise<Response>(() => undefined));

    rerender(<PersonalAgentDetails agentId="a-2" deletable suspendable />);

    expect(screen.queryByRole('heading', {name: 'Spending assistant'})).toBeNull();
    expect(screen.queryByRole('button', {name: 'Confirm'})).toBeNull();
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });

  it('does not report a delete that completes after another agent was selected', async () => {
    const onDeleted: Mock = vi.fn();
    let finishDelete: (response: Response) => void = () => undefined;
    const {rerender} = renderWithProviders(<PersonalAgentDetails agentId="a-1" deletable onDeleted={onDeleted} />);
    fireEvent.click(await screen.findByRole('button', {name: 'Delete agent'}));
    server.fetcher.mockImplementation((_url: string, init?: RequestInit) =>
      init?.method === 'DELETE'
        ? new Promise<Response>((resolve: (response: Response) => void) => {
            finishDelete = resolve;
          })
        : Promise.resolve(respond({...assistant, attributes: {name: 'Travel planner'}, id: 'a-2'})),
    );
    fireEvent.click(screen.getByRole('button', {name: 'Confirm'}));

    rerender(<PersonalAgentDetails agentId="a-2" deletable onDeleted={onDeleted} />);
    expect(await screen.findByRole('heading', {name: 'Travel planner'})).toBeTruthy();
    finishDelete(respond(undefined, 204));

    await waitFor(() =>
      expect(server.requests()).toContainEqual({
        body: undefined,
        method: 'DELETE',
        url: `${baseUrl}/users/me/agents/a-1`,
      }),
    );
    await new Promise<void>((resolve: () => void) => {
      setTimeout(resolve, 0);
    });
    expect(onDeleted).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', {name: 'Travel planner'})).toBeTruthy();
  });

  it('offers no edit or deletion for a declarative agent', async () => {
    serve({...assistant, isReadOnly: true});
    renderWithProviders(<PersonalAgentDetails agentId="a-1" editable deletable suspendable />);

    expect(await screen.findByRole('button', {name: 'Suspend'})).toBeTruthy();
    expect(screen.queryByRole('button', {name: 'Edit'})).toBeNull();
    expect(screen.queryByRole('button', {name: 'Delete agent'})).toBeNull();
  });
});

describe('BasePersonalAgentDetails', () => {
  it("closes the edit form when the agent changes, so one agent's values are never saved onto another", () => {
    const onUpdate: Mock = vi.fn();
    const other: Agent = {...assistant, attributes: {name: 'Travel planner'}, id: 'a-2'};
    const {rerender} = renderWithProviders(<BasePersonalAgentDetails agent={assistant} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByRole('button', {name: 'Edit'}));
    fireEvent.change(screen.getByLabelText(/^Name/), {target: {value: 'Budget assistant'}});
    rerender(<BasePersonalAgentDetails agent={other} onUpdate={onUpdate} />);

    expect(screen.queryByRole('button', {name: 'Save changes'})).toBeNull();
    fireEvent.click(screen.getByRole('button', {name: 'Edit'}));
    expect((screen.getByLabelText(/^Name/) as HTMLInputElement).value).toBe('Travel planner');
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('discards the draft when another agent is shown, so coming back starts from the stored values', () => {
    const other: Agent = {...assistant, attributes: {name: 'Travel planner'}, id: 'a-2'};
    const {rerender} = renderWithProviders(<BasePersonalAgentDetails agent={assistant} onUpdate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', {name: 'Edit'}));
    fireEvent.change(screen.getByLabelText(/^Name/), {target: {value: 'Budget assistant'}});
    rerender(<BasePersonalAgentDetails agent={other} onUpdate={vi.fn()} />);
    rerender(<BasePersonalAgentDetails agent={assistant} onUpdate={vi.fn()} />);

    expect(screen.queryByRole('button', {name: 'Save changes'})).toBeNull();
    fireEvent.click(screen.getByRole('button', {name: 'Edit'}));
    expect((screen.getByLabelText(/^Name/) as HTMLInputElement).value).toBe('Spending assistant');
  });

  it('keeps the form open until the update settles, and with the changes when it fails', async () => {
    let settle: (saved: boolean) => void = () => undefined;
    const onUpdate: Mock = vi.fn(
      () =>
        new Promise<boolean>((resolve: (saved: boolean) => void) => {
          settle = resolve;
        }),
    );
    renderWithProviders(<BasePersonalAgentDetails agent={assistant} onUpdate={onUpdate} />);

    fireEvent.click(screen.getByRole('button', {name: 'Edit'}));
    fireEvent.change(screen.getByLabelText(/^Name/), {target: {value: 'Budget assistant'}});
    fireEvent.click(screen.getByRole('button', {name: 'Save changes'}));
    await act(async () => settle(false));

    expect((screen.getByLabelText(/^Name/) as HTMLInputElement).value).toBe('Budget assistant');

    fireEvent.click(screen.getByRole('button', {name: 'Save changes'}));
    await act(async () => settle(true));

    expect(screen.queryByRole('button', {name: 'Save changes'})).toBeNull();
    expect(onUpdate).toHaveBeenCalledTimes(2);
  });

  it('hands a custom render the agent and only the actions that apply', () => {
    const renderDetails: Mock<(props: BasePersonalAgentDetailsRenderProps) => ReactNode> = vi.fn(() => (
      <p>custom view</p>
    ));
    const onUnsuspend: Mock = vi.fn();
    const agent: Agent = {
      ...assistant,
      isReadOnly: true,
      status: {details: {appliedBy: ['owner']}, value: 'SUSPENDED'},
    };

    renderWithProviders(
      <BasePersonalAgentDetails
        agent={agent}
        onDelete={vi.fn()}
        onSuspend={vi.fn()}
        onUnsuspend={onUnsuspend}
        onUpdate={vi.fn()}
      >
        {renderDetails}
      </BasePersonalAgentDetails>,
    );

    expect(screen.getByText('custom view')).toBeTruthy();
    const props: BasePersonalAgentDetailsRenderProps = renderDetails.mock.calls[0][0];
    expect(props.agent).toEqual(agent);
    expect(props.oauth?.grantTypes).toEqual(['authorization_code']);
    expect(props.onDelete).toBeUndefined();
    expect(props.onUpdate).toBeUndefined();
    expect(props.onSuspend).toBeUndefined();
    props.onUnsuspend?.();
    expect(onUnsuspend).toHaveBeenCalled();
  });

  it('hands a custom render the suspension of an agent the owner has not suspended', () => {
    const renderDetails: Mock<(props: BasePersonalAgentDetailsRenderProps) => ReactNode> = vi.fn(() => null);

    renderWithProviders(
      <BasePersonalAgentDetails
        agent={{...assistant, status: {details: {appliedBy: ['organization']}, value: 'SUSPENDED'}}}
        onSuspend={vi.fn()}
        onUnsuspend={vi.fn()}
      >
        {renderDetails}
      </BasePersonalAgentDetails>,
    );

    const props: BasePersonalAgentDetailsRenderProps = renderDetails.mock.calls[0][0];
    expect(props.onSuspend).toBeDefined();
    expect(props.onUnsuspend).toBeUndefined();
  });
});
