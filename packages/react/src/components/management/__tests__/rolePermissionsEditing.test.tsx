// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {ApiFetcher, createResourceInvalidator} from '@thunderid/browser';
import {ReactElement, ReactNode} from 'react';
import {Mock, afterEach, describe, expect, it, vi} from 'vitest';
import I18nProvider from '../../../contexts/I18n/I18nProvider';
import ThemeProvider from '../../../contexts/Theme/ThemeProvider';
import ThunderIDContext, {ThunderIDContextProps} from '../../../contexts/ThunderID/ThunderIDContext';
import UserContext, {UserContextProps} from '../../../contexts/User/UserContext';
import RoleDetails from '../RoleDetails/RoleDetails';
import BaseRolePermissions, {BaseRolePermissionsRenderProps} from '../RolePermissions/BaseRolePermissions';
import RolePermissions from '../RolePermissions/RolePermissions';

type FetcherMock = Mock<ApiFetcher>;

const baseUrl = 'https://localhost:8090';

const respond = (body: unknown, status = 200): Response =>
  ({
    json: () => Promise.resolve(body),
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    text: () => Promise.resolve(JSON.stringify(body)),
  }) as Response;

const renderWithProviders = (ui: ReactElement, fetcher?: ApiFetcher): ReturnType<typeof render> => {
  const thunderID = {
    baseUrl,
    http: {fetcher},
    instanceId: 0,
    invalidator: createResourceInvalidator(),
    isInitialized: true,
    isLoading: false,
    vendor: 'thunderid',
  } as unknown as ThunderIDContextProps;
  const user = {flattenedProfile: null, profile: null} as unknown as UserContextProps;

  function Providers({children}: {children: ReactNode}): ReactElement {
    return (
      <ThunderIDContext.Provider value={thunderID}>
        <UserContext.Provider value={user}>
          <I18nProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </I18nProvider>
        </UserContext.Provider>
      </ThunderIDContext.Provider>
    );
  }

  return render(ui, {wrapper: Providers});
};

const role = {
  id: 'r-1',
  name: 'Support',
  ouId: 'ou-1',
  permissions: [{permissions: ['orders:read'], resourceServerId: 'rs-1'}],
};

/**
 * A server with one role, one resource server and its actions. Records every role update.
 */
const createServer = (current: typeof role = role): {fetcher: FetcherMock; updates: unknown[]} => {
  const updates: unknown[] = [];
  let stored: typeof role = current;
  const fetcher: FetcherMock = vi.fn<ApiFetcher>((url: string, init?: RequestInit) => {
    const {pathname} = new URL(url);

    if (pathname === '/roles/r-1' && init?.method === 'PUT') {
      const body: typeof role = JSON.parse(init.body as string) as typeof role;
      updates.push(body);
      stored = {...stored, ...body};

      return Promise.resolve(respond(stored));
    }
    if (pathname === '/roles/r-1') {
      return Promise.resolve(respond(stored));
    }
    if (pathname === '/resource-servers') {
      return Promise.resolve(respond({resourceServers: [{id: 'rs-1', name: 'Orders API'}]}));
    }
    if (pathname === '/resource-servers/rs-1/actions') {
      return Promise.resolve(
        respond({
          actions: [
            {handle: 'read', id: 'a-1', name: 'Read', permission: 'orders:read'},
            {handle: 'write', id: 'a-2', name: 'Write', permission: 'orders:write'},
          ],
        }),
      );
    }
    if (pathname === '/resource-servers/rs-1/resources') {
      return Promise.resolve(respond({resources: []}));
    }

    return Promise.reject(new Error(`unexpected request to ${url}`));
  });

  return {fetcher, updates};
};

const optionValues = (select: HTMLElement): string[] =>
  Array.from(select.querySelectorAll('option')).map((option: HTMLOptionElement) => option.value);

afterEach(() => {
  cleanup();
});

describe('BaseRolePermissions editing', () => {
  it('shows no add or remove controls unless the handlers are given', () => {
    renderWithProviders(
      <BaseRolePermissions permissions={role.permissions} resourceServers={[{id: 'rs-1', name: 'Orders API'}]} />,
    );

    expect(screen.queryByRole('button', {name: 'Add permission'})).toBeNull();
    expect(screen.queryByRole('button', {name: 'Remove orders:read from Orders API'})).toBeNull();
  });

  it('asks before removing a permission', () => {
    const onRemove: Mock = vi.fn();

    renderWithProviders(
      <BaseRolePermissions
        permissions={role.permissions}
        resourceServerNames={{'rs-1': 'Orders API'}}
        onRemove={onRemove}
      />,
    );

    fireEvent.click(screen.getByRole('button', {name: 'Remove orders:read from Orders API'}));
    expect(onRemove).not.toHaveBeenCalled();
    expect(screen.getByRole('group', {name: 'Remove orders:read from this role?'})).toBeTruthy();

    fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));
    expect(screen.queryByRole('group', {name: 'Remove orders:read from this role?'})).toBeNull();

    fireEvent.click(screen.getByRole('button', {name: 'Remove orders:read from Orders API'}));
    fireEvent.click(screen.getByRole('button', {name: 'Confirm'}));
    expect(onRemove).toHaveBeenCalledWith({permission: 'orders:read', resourceServerId: 'rs-1'});
  });

  it('picks a resource server, then one of its permissions not yet granted, and adds it', () => {
    const onAdd: Mock = vi.fn();
    const onResourceServerSelect: Mock = vi.fn();

    renderWithProviders(
      <BaseRolePermissions
        permissions={role.permissions}
        resourceServers={[{id: 'rs-1', name: 'Orders API'}]}
        availablePermissions={{
          'rs-1': [
            {name: 'Read', permission: 'orders:read'},
            {name: 'Write', permission: 'orders:write', resourceName: 'Orders'},
          ],
        }}
        onAdd={onAdd}
        onResourceServerSelect={onResourceServerSelect}
      />,
    );

    fireEvent.change(screen.getByLabelText('Resource server'), {target: {value: 'rs-1'}});
    expect(onResourceServerSelect).toHaveBeenCalledWith('rs-1');

    const permission: HTMLSelectElement = screen.getByLabelText('Permission');
    const offered: string[] = Array.from(permission.options).map((option: HTMLOptionElement) => option.value);
    expect(offered).toContain('orders:write');
    expect(offered).not.toContain('orders:read');

    fireEvent.change(permission, {target: {value: 'orders:write'}});
    fireEvent.click(screen.getByRole('button', {name: 'Add permission'}));
    expect(onAdd).toHaveBeenCalledWith({permission: 'orders:write', resourceServerId: 'rs-1'});
  });

  it('hands a custom render the add and remove handlers only when editable', () => {
    const seen: BaseRolePermissionsRenderProps[] = [];
    const capture = (props: BaseRolePermissionsRenderProps): ReactNode => {
      seen.push(props);

      return null;
    };

    renderWithProviders(<BaseRolePermissions permissions={role.permissions}>{capture}</BaseRolePermissions>);
    renderWithProviders(
      <BaseRolePermissions
        permissions={role.permissions}
        resourceServers={[{id: 'rs-1', name: 'Orders API'}]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onResourceServerSelect={vi.fn()}
      >
        {capture}
      </BaseRolePermissions>,
    );

    expect(seen[0]).toMatchObject({onAdd: undefined, onRemove: undefined, resourceServers: undefined});
    expect(seen[1].onAdd).toBeTypeOf('function');
    expect(seen[1].onRemove).toBeTypeOf('function');
    expect(seen[1].resourceServers).toEqual([{id: 'rs-1', name: 'Orders API'}]);
    expect(seen[1].resolveResourceServerName('rs-1')).toBe('Orders API');
  });
});

describe('RolePermissions editing', () => {
  it('is read-only by default and lists no resource servers', async () => {
    const {fetcher} = createServer();

    renderWithProviders(<RolePermissions roleId="r-1" />, fetcher);

    expect((await screen.findByRole('list', {name: 'rs-1'})).textContent).toContain('orders:read');
    expect(screen.queryByRole('button', {name: 'Add permission'})).toBeNull();
    expect(fetcher.mock.calls.map(([url]: [string, RequestInit]) => new URL(url).pathname)).toEqual(['/roles/r-1']);
  });

  it('adds a permission picked from the resource server actions and saves the role', async () => {
    const {fetcher, updates} = createServer();

    renderWithProviders(<RolePermissions roleId="r-1" editable />, fetcher);

    fireEvent.change(await screen.findByLabelText('Resource server'), {target: {value: 'rs-1'}});
    await waitFor(() => expect(optionValues(screen.getByLabelText('Permission'))).toContain('orders:write'));
    fireEvent.change(screen.getByLabelText('Permission'), {target: {value: 'orders:write'}});
    fireEvent.click(screen.getByRole('button', {name: 'Add permission'}));

    await waitFor(() => expect(updates).toHaveLength(1));
    expect(updates[0]).toEqual({
      name: 'Support',
      ouId: 'ou-1',
      permissions: [{permissions: ['orders:read', 'orders:write'], resourceServerId: 'rs-1'}],
    });
    expect((await screen.findByRole('list', {name: 'Orders API'})).textContent).toContain('orders:write');
  });

  it('removes a permission after confirmation and saves the role', async () => {
    const {fetcher, updates} = createServer();

    renderWithProviders(
      <RolePermissions roleId="r-1" editable>
        {({onRemove, permissions}: BaseRolePermissionsRenderProps): ReactNode => (
          <button
            type="button"
            onClick={(): void =>
              onRemove?.({permission: permissions[0].permissions[0], resourceServerId: permissions[0].resourceServerId})
            }
          >
            {`Drop ${permissions[0]?.permissions[0] ?? ''}`}
          </button>
        )}
      </RolePermissions>,
      fetcher,
    );

    fireEvent.click(await screen.findByRole('button', {name: 'Drop orders:read'}));

    await waitFor(() => expect(updates).toHaveLength(1));
    expect(updates[0]).toMatchObject({permissions: []});
  });

  it('shows a translated message when the update fails', async () => {
    const {fetcher} = createServer();
    const failing: FetcherMock = vi.fn<ApiFetcher>((url: string, init?: RequestInit) =>
      init?.method === 'PUT'
        ? Promise.resolve(respond({code: 'ROL-1001', message: {defaultValue: 'Refused'}}, 400))
        : fetcher(url, init!),
    );

    renderWithProviders(<RolePermissions roleId="r-1" editable />, failing);

    fireEvent.click(await screen.findByRole('button', {name: /^Remove orders:read from/}));
    fireEvent.click(screen.getByRole('button', {name: 'Confirm'}));

    expect((await screen.findByRole('alert')).textContent).toBeTruthy();
  });

  it('is not editable for a read-only role', async () => {
    const {fetcher} = createServer({...role, isReadOnly: true} as typeof role);

    renderWithProviders(<RolePermissions roleId="r-1" editable />, fetcher);

    await screen.findByRole('list', {name: 'rs-1'});
    expect(screen.queryByRole('button', {name: /^Remove orders:read from/})).toBeNull();
  });
});

describe('RoleDetails', () => {
  it('passes editable through to the permissions', async () => {
    const {fetcher} = createServer();
    const assignments = vi.fn<ApiFetcher>((url: string, init?: RequestInit) =>
      new URL(url).pathname.startsWith('/roles/r-1/assignments') ||
      ['/users', '/groups', '/agents'].includes(new URL(url).pathname)
        ? Promise.resolve(respond({agents: [], assignments: [], groups: [], users: []}))
        : fetcher(url, init!),
    );

    renderWithProviders(<RoleDetails roleId="r-1" editable />, assignments);

    expect(await screen.findByRole('button', {name: 'Add permission'})).toBeTruthy();
  });
});
