// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, fireEvent, render, screen, within} from '@testing-library/react';
import {ApiFetcher, BasicAgent, createResourceInvalidator} from '@thunderid/browser';
import {ReactElement, ReactNode} from 'react';
import {Mock, afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import I18nProvider from '../../../../contexts/I18n/I18nProvider';
import ThemeProvider from '../../../../contexts/Theme/ThemeProvider';
import ThunderIDContext, {ThunderIDContextProps} from '../../../../contexts/ThunderID/ThunderIDContext';
import BasePersonalAgentList, {BasePersonalAgentListRenderProps} from '../BasePersonalAgentList';
import PersonalAgentList from '../PersonalAgentList';

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

const assistant: BasicAgent = {
  attributes: {name: 'Spending assistant'},
  clientId: 'pa_1',
  id: 'a-1',
  kind: 'personal-assistant',
  ouId: 'ou-1',
  status: {value: 'ACTIVE'},
  type: 'default',
};

const createFetcher = (overrides: Record<string, Response> = {}): FetcherMock =>
  vi.fn<ApiFetcher>().mockImplementation((url: string, init?: RequestInit) => {
    const method: string = init?.method ?? 'GET';
    const path: string = new URL(url).pathname;
    const override: Response | undefined = overrides[`${method} ${path}`];

    if (override) {
      return Promise.resolve(override);
    }
    if (method === 'POST' && path === '/users/me/agents/suspend') {
      return Promise.resolve(respond({suspendedCount: 1}));
    }

    return Promise.resolve(respond({agents: [assistant], count: 1, startIndex: 1, totalResults: 1}));
  });

const renderWithProviders = (
  ui: ReactElement,
  {endpoints, httpFetcher}: {endpoints?: ThunderIDContextProps['endpoints']; httpFetcher?: ApiFetcher} = {},
): ReturnType<typeof render> => {
  const thunderID = {
    baseUrl,
    endpoints,
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

const requests = (fetcher: FetcherMock): {method: string; url: string}[] =>
  fetcher.mock.calls.map(([url, init]: [string, RequestInit]) => ({method: init?.method ?? 'GET', url}));

let fetcher: FetcherMock;

beforeEach(() => {
  fetcher = createFetcher();
  sdkFetcher.current = fetcher;
});

afterEach(() => {
  cleanup();
});

describe('PersonalAgentList', () => {
  it("lists the user's personal agents through the SDK's own transport, not the management fetcher", async () => {
    const httpFetcher: FetcherMock = vi.fn<ApiFetcher>();
    const onSelect: Mock = vi.fn();

    renderWithProviders(<PersonalAgentList onSelect={onSelect} />, {httpFetcher});

    const table: HTMLElement = await screen.findByRole('table', {name: 'Personal agents'});
    expect(await within(table).findByText('Spending assistant')).toBeTruthy();
    expect(within(table).getByText('pa_1')).toBeTruthy();
    expect(within(table).getByText('Active')).toBeTruthy();
    expect(requests(fetcher)[0]).toEqual({
      method: 'GET',
      url: `${baseUrl}/users/me/agents?kind=personal-assistant&limit=20&offset=0`,
    });
    expect(httpFetcher).not.toHaveBeenCalled();

    fireEvent.click(within(table).getByText('Spending assistant'));
    expect(onSelect).toHaveBeenCalledWith(assistant);
  });

  it('sends requests to the usersMeAgents endpoint override', async () => {
    renderWithProviders(<PersonalAgentList />, {endpoints: {usersMeAgents: 'https://rs.example.com/users/me/agents'}});

    await screen.findByText('Spending assistant');
    expect(requests(fetcher)[0].url).toBe(
      'https://rs.example.com/users/me/agents?kind=personal-assistant&limit=20&offset=0',
    );
  });

  it('offers no suspend-all unless the app turns it on', async () => {
    renderWithProviders(<PersonalAgentList />);

    await screen.findByText('Spending assistant');
    expect(screen.queryByRole('button', {name: 'Suspend all'})).toBeNull();
  });

  it('suspends every agent after confirmation and says how many', async () => {
    renderWithProviders(<PersonalAgentList suspendable />);

    fireEvent.click(await screen.findByRole('button', {name: 'Suspend all'}));
    expect(requests(fetcher).some(({method}: {method: string}) => method === 'POST')).toBe(false);
    fireEvent.click(screen.getByRole('button', {name: 'Confirm'}));

    expect(await screen.findByText('Agents suspended: 1')).toBeTruthy();
    expect(requests(fetcher)).toContainEqual({method: 'POST', url: `${baseUrl}/users/me/agents/suspend`});
  });

  it('shows a translated message, never the server text, when a request is refused', async () => {
    fetcher = createFetcher({
      'GET /users/me/agents': respond({code: 'AGT-1061', message: {defaultValue: 'Delegated token'}}, 403),
    });
    sdkFetcher.current = fetcher;
    renderWithProviders(<PersonalAgentList />);

    expect(await screen.findByText('You do not have permission to do this.')).toBeTruthy();
    expect(screen.queryByText('Delegated token')).toBeNull();
  });
});

describe('BasePersonalAgentList', () => {
  it('says so when the user has no personal agents, and hides suspend-all', () => {
    renderWithProviders(<BasePersonalAgentList agents={[]} onSuspendAll={vi.fn()} />);

    expect(screen.getByText("You don't have any personal agents.")).toBeTruthy();
    expect(screen.queryByRole('button', {name: 'Suspend all'})).toBeNull();
  });

  it('hands a custom render the agents, the columns and suspend-all', () => {
    const renderList: Mock<(props: BasePersonalAgentListRenderProps) => ReactNode> = vi.fn(() => <p>custom list</p>);
    const onSuspendAll: Mock = vi.fn();

    renderWithProviders(
      <BasePersonalAgentList agents={[assistant]} onSuspendAll={onSuspendAll}>
        {renderList}
      </BasePersonalAgentList>,
    );

    expect(screen.getByText('custom list')).toBeTruthy();
    const props: BasePersonalAgentListRenderProps = renderList.mock.calls[0][0];
    expect(props.agents).toEqual([assistant]);
    expect(props.rows).toEqual([assistant]);
    expect(props.columns.map((column: {id: string}) => column.id)).toEqual(['name', 'clientId', 'status']);
    expect(props.totalResults).toBe(1);
    props.onSuspendAll?.();
    expect(onSuspendAll).toHaveBeenCalled();
  });
});
