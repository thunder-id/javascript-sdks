// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {createResourceInvalidator, ApiFetcher, ManagedUser} from '@thunderid/browser';
import {ReactElement, ReactNode} from 'react';
import {Mock, afterEach, describe, expect, it, vi} from 'vitest';
import I18nProvider from '../../../../contexts/I18n/I18nProvider';
import ThemeProvider from '../../../../contexts/Theme/ThemeProvider';
import ThunderIDContext, {ThunderIDContextProps} from '../../../../contexts/ThunderID/ThunderIDContext';
import UserContext, {UserContextProps} from '../../../../contexts/User/UserContext';
import BaseAgentCreate from '../AgentCreate/BaseAgentCreate';
import BaseGroupCreate from '../GroupCreate/BaseGroupCreate';
import BaseGroupMembers from '../GroupMembers/BaseGroupMembers';
import GroupMembers from '../GroupMembers/GroupMembers';
import AgentList from '../AgentList/AgentList';
import BaseRoleAssignments from '../RoleAssignments/BaseRoleAssignments';
import RoleAssignments from '../RoleAssignments/RoleAssignments';
import BaseRolePermissions from '../RolePermissions/BaseRolePermissions';
import RolePermissions from '../RolePermissions/RolePermissions';
import BaseUserCreate from '../UserCreate/BaseUserCreate';
import UserCreate from '../UserCreate/UserCreate';
import BaseUserDetails from '../UserDetails/BaseUserDetails';
import UserDetails from '../UserDetails/UserDetails';
import BaseUserList from '../UserList/BaseUserList';
import UserList from '../UserList/UserList';

type FetcherMock = Mock<ApiFetcher>;

const baseUrl = 'https://localhost:8090';

const users: ManagedUser[] = [
  {
    attributes: {username: 'aiko'},
    display: 'Aiko Tanaka',
    id: 'u-1',
    ouHandle: 'engineering',
    ouId: 'ou-1',
    type: 'person',
  },
  {attributes: {username: 'sam'}, id: 'u-2', ouId: 'ou-1', type: 'person'},
];

const respond = (body: unknown, status = 200): Response =>
  ({
    json: () => Promise.resolve(body),
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 403 ? 'Forbidden' : 'OK',
    text: () => Promise.resolve(JSON.stringify(body)),
  }) as Response;

const renderWithProviders = (
  ui: ReactElement,
  {fetcher, ouId}: {fetcher?: ApiFetcher; ouId?: string} = {},
): ReturnType<typeof render> => {
  const thunderID = {
    baseUrl,
    endpoints: undefined,
    http: {fetcher},
    instanceId: 0,
    invalidator: createResourceInvalidator(),
    isInitialized: true,
    isLoading: false,
    vendor: 'thunderid',
  } as unknown as ThunderIDContextProps;
  const user = {flattenedProfile: ouId ? {ouId} : null, profile: null} as unknown as UserContextProps;

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

afterEach(() => {
  cleanup();
});

describe('BaseUserList', () => {
  it('shows the email of each person under their name', () => {
    renderWithProviders(
      <BaseUserList
        users={[{attributes: {email: 'aiko@acme.io'}, display: 'Aiko Tanaka', id: 'u-9', ouId: 'ou-1', type: 'person'}]}
      />,
    );

    expect(screen.getByText('aiko@acme.io')).toBeTruthy();
  });

  it('renders each user with its display name and organization unit', () => {
    renderWithProviders(<BaseUserList users={users} />);

    const table: HTMLElement = screen.getByRole('table', {name: 'Users'});

    expect(within(table).getByText('Aiko Tanaka')).toBeTruthy();
    expect(within(table).getByText('engineering')).toBeTruthy();
    // Falls back to the username attribute when the server sends no display value.
    expect(within(table).getByText('sam')).toBeTruthy();
  });

  it('lets a row be chosen from the keyboard when selection is enabled', () => {
    const onSelect: Mock = vi.fn();

    renderWithProviders(<BaseUserList users={users} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', {name: /Aiko Tanaka/}));

    expect(onSelect).toHaveBeenCalledWith(users[0]);
  });

  it('pages through results', () => {
    const onPageChange: Mock = vi.fn();

    renderWithProviders(
      <BaseUserList users={users} totalResults={5} limit={2} offset={0} onPageChange={onPageChange} />,
    );

    expect(screen.getByText('1 to 2 of 5')).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Previous'}).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', {name: 'Next'}));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('shows the empty message when there are no users', () => {
    renderWithProviders(<BaseUserList users={[]} />);

    expect(screen.getByText('No users found.')).toBeTruthy();
  });
});

describe('UserList', () => {
  it('shows a permission message when the server refuses the request', async () => {
    const fetcher: FetcherMock = vi.fn<ApiFetcher>().mockResolvedValue(respond({}, 403));

    renderWithProviders(<UserList />, {fetcher});

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('You do not have permission'));
  });
});

describe('BaseUserCreate', () => {
  it('submits the chosen type and the filled attributes only', () => {
    const onSubmit: Mock = vi.fn();

    renderWithProviders(<BaseUserCreate userTypes={[{label: 'Person', value: 'person'}]} onSubmit={onSubmit} />);

    const submit: HTMLButtonElement = screen.getByRole('button', {name: 'Create user'});
    expect(submit.disabled).toBe(true);

    fireEvent.change(document.querySelector('input[name="username"]')!, {target: {value: 'priya'}});
    fireEvent.change(document.querySelector('input[name="email"]')!, {target: {value: 'priya@acme.io'}});
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);

    expect(onSubmit).toHaveBeenCalledWith({attributes: {email: 'priya@acme.io', username: 'priya'}, type: 'person'});
  });
});

describe('UserCreate', () => {
  it('creates the user in the signed-in user organization unit', async () => {
    const fetcher: FetcherMock = vi
      .fn<ApiFetcher>()
      .mockImplementation((url: string) =>
        Promise.resolve(
          url.includes('/user-types')
            ? respond({count: 1, startIndex: 1, totalResults: 1, types: [{handle: 'person', id: 't-1'}]})
            : respond({id: 'u-9', ouId: 'ou-1', type: 'person'}),
        ),
      );
    const onCreated: Mock = vi.fn();

    renderWithProviders(<UserCreate onCreated={onCreated} fields={[{name: 'username', required: true}]} />, {
      fetcher,
      ouId: 'ou-1',
    });

    await waitFor(() => expect(screen.getByRole('option', {name: 'person'})).toBeTruthy());
    fireEvent.change(document.querySelector('input[name="username"]')!, {target: {value: 'priya'}});
    fireEvent.click(screen.getByRole('button', {name: 'Create user'}));

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    const [url, init] = fetcher.mock.calls.find(([, request]: [string, RequestInit]) => request.method === 'POST')!;
    expect(url).toBe(`${baseUrl}/users`);
    expect(JSON.parse(init.body as string)).toEqual({attributes: {username: 'priya'}, ouId: 'ou-1', type: 'person'});
  });

  it('explains that an organization unit is needed when none is known', () => {
    renderWithProviders(<UserCreate fields={[{name: 'username'}]} />, {
      fetcher: vi.fn<ApiFetcher>().mockResolvedValue(respond({count: 0, startIndex: 1, totalResults: 0, types: []})),
    });

    expect(screen.getByRole('alert').textContent).toContain('Choose an organization unit');
  });
});

describe('BaseUserDetails', () => {
  it('hides credentials and lists the user groups', () => {
    renderWithProviders(
      <BaseUserDetails
        user={{...users[0], attributes: {password: 'secret', username: 'aiko'}}}
        groups={[{id: 'g-1', name: 'Platform team', ouId: 'ou-1'}]}
      />,
    );

    expect(screen.getByRole('heading', {name: 'Aiko Tanaka'})).toBeTruthy();
    expect(screen.queryByText('secret')).toBeNull();
    expect(screen.getByRole('list', {name: 'Groups'}).textContent).toContain('Platform team');
  });

  it('asks for confirmation before deleting', () => {
    const onDelete: Mock = vi.fn();

    renderWithProviders(<BaseUserDetails user={users[0]} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole('button', {name: 'Delete user'}));
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name: 'Confirm'}));

    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('edits text attributes and keeps the others when saving', () => {
    const onUpdate: Mock = vi.fn();

    renderWithProviders(
      <BaseUserDetails user={{...users[0], attributes: {age: 30, username: 'aiko'}}} onUpdate={onUpdate} />,
    );
    fireEvent.click(screen.getByRole('button', {name: 'Edit'}));
    fireEvent.change(screen.getByLabelText('username'), {target: {value: 'aiko.t'}});
    fireEvent.click(screen.getByRole('button', {name: 'Save changes'}));

    expect(onUpdate).toHaveBeenCalledWith({age: 30, username: 'aiko.t'});
    expect(screen.queryByRole('button', {name: 'Save changes'})).toBeNull();
  });

  it('hides editing for read-only users', () => {
    renderWithProviders(<BaseUserDetails user={{...users[0], isReadOnly: true}} onUpdate={vi.fn()} />);

    expect(screen.queryByRole('button', {name: 'Edit'})).toBeNull();
  });
});

describe('UserDetails', () => {
  it('saves edited attributes through the management API', async () => {
    const fetcher: FetcherMock = vi
      .fn<ApiFetcher>()
      .mockImplementation((url: string) =>
        Promise.resolve(
          respond(url.includes('/groups') ? {count: 0, groups: [], startIndex: 1, totalResults: 0} : users[0]),
        ),
      );

    renderWithProviders(<UserDetails userId="u-1" editable />, {fetcher});

    fireEvent.click(await screen.findByRole('button', {name: 'Edit'}));
    fireEvent.change(screen.getByLabelText('username'), {target: {value: 'aiko.t'}});
    fireEvent.click(screen.getByRole('button', {name: 'Save changes'}));

    await waitFor(() => {
      const update = fetcher.mock.calls.find(([, init]: [string, RequestInit]) => init?.method === 'PUT');
      expect(update).toBeTruthy();
      expect(JSON.parse(update![1].body as string)).toEqual({
        attributes: {username: 'aiko.t'},
        ouId: 'ou-1',
        type: 'person',
      });
    });
  });

  it('offers no editing unless editable', async () => {
    const fetcher: FetcherMock = vi
      .fn<ApiFetcher>()
      .mockImplementation((url: string) =>
        Promise.resolve(
          respond(url.includes('/groups') ? {count: 0, groups: [], startIndex: 1, totalResults: 0} : users[0]),
        ),
      );

    renderWithProviders(<UserDetails userId="u-1" />, {fetcher});

    await screen.findByRole('heading', {name: 'Aiko Tanaka'});
    expect(screen.queryByRole('button', {name: 'Edit'})).toBeNull();
  });
});

describe('BaseGroupMembers', () => {
  it('offers only identities that are not members yet and adds the chosen one', () => {
    const onAdd: Mock = vi.fn();

    renderWithProviders(
      <BaseGroupMembers
        members={[{display: 'Aiko Tanaka', id: 'u-1', type: 'user'}]}
        candidates={{
          user: [
            {id: 'u-1', label: 'Aiko Tanaka'},
            {id: 'u-2', label: 'Sam Rivera'},
          ],
        }}
        onAdd={onAdd}
      />,
    );

    const identity: HTMLSelectElement = document.querySelector('select[name="identity"]')!;
    expect(within(identity).queryByRole('option', {name: 'Aiko Tanaka'})).toBeNull();
    fireEvent.change(identity, {target: {value: 'u-2'}});
    fireEvent.click(screen.getByRole('button', {name: 'Add member'}));

    expect(onAdd).toHaveBeenCalledWith({id: 'u-2', type: 'user'});
  });
});

describe('GroupMembers', () => {
  it('removes a member through the management API', async () => {
    const fetcher: FetcherMock = vi
      .fn<ApiFetcher>()
      .mockImplementation((url: string) =>
        Promise.resolve(
          respond(
            url.includes('/members')
              ? {count: 1, members: [{display: 'Aiko Tanaka', id: 'u-1', type: 'user'}], startIndex: 1, totalResults: 1}
              : {agents: [], count: 0, id: 'g-1', startIndex: 1, totalResults: 0, users: []},
          ),
        ),
      );

    renderWithProviders(<GroupMembers groupId="g-1" editable />, {fetcher});

    fireEvent.click(await screen.findByRole('button', {name: 'Remove Aiko Tanaka from the group'}));

    await waitFor(() => {
      const removal = fetcher.mock.calls.find(([url]: [string, RequestInit]) => url.endsWith('/members/remove'));
      expect(removal).toBeTruthy();
      expect(JSON.parse(removal![1].body as string)).toEqual({members: [{id: 'u-1', type: 'user'}]});
    });
  });
});

describe('BaseRoleAssignments', () => {
  it('lists assignees with their type and hides editing when read only', () => {
    renderWithProviders(
      <BaseRoleAssignments
        assignments={[
          {display: 'Platform team', id: 'g-1', type: 'group'},
          {display: 'Deploy bot', id: 'ag-1', type: 'agent'},
        ]}
      />,
    );

    const table: HTMLElement = screen.getByRole('table', {name: 'Assigned to'});
    expect(within(table).getByText('Group')).toBeTruthy();
    expect(within(table).getByText('Agent')).toBeTruthy();
    expect(screen.queryByRole('button', {name: 'Assign role'})).toBeNull();
    expect(screen.queryByRole('button', {name: 'Remove'})).toBeNull();
  });
});

describe('BaseRolePermissions', () => {
  it('groups permissions by resource server and names known servers', () => {
    renderWithProviders(
      <BaseRolePermissions
        permissions={[
          {permissions: ['system:user', 'system:group:view'], resourceServerId: 'rs-1'},
          {permissions: ['orders:read'], resourceServerId: 'rs-2'},
          {permissions: [], resourceServerId: 'rs-3'},
        ]}
        resourceServerNames={{'rs-1': 'System'}}
      />,
    );

    expect(screen.getByRole('list', {name: 'System'}).textContent).toContain('system:group:view');
    expect(screen.getByRole('list', {name: 'rs-2'}).textContent).toContain('orders:read');
    expect(screen.queryByRole('list', {name: 'rs-3'})).toBeNull();
  });

  it('says when the role grants nothing', () => {
    renderWithProviders(<BaseRolePermissions permissions={[]} />);

    expect(screen.getByText('This role grants no permissions.')).toBeTruthy();
  });
});

describe('RolePermissions', () => {
  it('loads the role and shows its permissions', async () => {
    const fetcher: FetcherMock = vi.fn<ApiFetcher>().mockResolvedValue(
      respond({
        id: 'r-1',
        name: 'Support',
        ouId: 'ou-1',
        permissions: [{permissions: ['system:user:view'], resourceServerId: 'rs-1'}],
      }),
    );

    renderWithProviders(<RolePermissions roleId="r-1" />, {fetcher});

    expect((await screen.findByRole('list', {name: 'rs-1'})).textContent).toContain('system:user:view');
    expect(fetcher.mock.calls[0][0]).toBe(`${baseUrl}/roles/r-1`);
  });
});

describe('render props', () => {
  it('hands a list its rows, default columns and pagination instead of rendering the table', () => {
    const onPageChange: Mock = vi.fn();

    renderWithProviders(
      <BaseUserList users={users} totalResults={45} limit={20} offset={20} onPageChange={onPageChange}>
        {({columns, offset, rows, totalResults, onPageChange: changePage}): ReactNode => (
          <div>
            <p>{`${rows.length} of ${totalResults} from ${offset}`}</p>
            <p>{columns.map((column: {id: string}) => column.id).join(',')}</p>
            <button type="button" onClick={(): void => changePage?.(40)}>
              Next
            </button>
          </div>
        )}
      </BaseUserList>,
    );

    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('2 of 45 from 20')).toBeTruthy();
    expect(screen.getByText('name,type,ou')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', {name: 'Next'}));
    expect(onPageChange).toHaveBeenCalledWith(40);
  });

  it('passes the rows a connected list fetched to its render function', async () => {
    const fetcher: FetcherMock = vi
      .fn<ApiFetcher>()
      .mockResolvedValue(respond({count: 2, startIndex: 1, totalResults: 2, users}));

    renderWithProviders(
      <UserList>
        {({isLoading, users: rows}): ReactNode => (
          <ul aria-busy={isLoading}>
            {rows.map((user: ManagedUser) => (
              <li key={user.id}>{user.id}</li>
            ))}
          </ul>
        )}
      </UserList>,
      {fetcher},
    );

    await waitFor(() =>
      expect(screen.getAllByRole('listitem').map((item: HTMLElement) => item.textContent)).toEqual(['u-1', 'u-2']),
    );
  });

  it('lets a custom form set values and submit them', () => {
    const onSubmit: Mock = vi.fn();

    renderWithProviders(
      <BaseGroupCreate onSubmit={onSubmit}>
        {({handleInputChange, handleSubmit, isValid, values}): ReactNode => (
          <div>
            <input
              aria-label="Group name"
              value={values.name}
              onChange={(event): void => handleInputChange('name', event.target.value)}
            />
            <button type="button" disabled={!isValid} onClick={handleSubmit}>
              Save
            </button>
          </div>
        )}
      </BaseGroupCreate>,
    );

    expect(screen.getByRole('button', {name: 'Save'}).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Group name'), {target: {value: '  Engineering '}});
    fireEvent.click(screen.getByRole('button', {name: 'Save'}));
    expect(onSubmit).toHaveBeenCalledWith({description: undefined, name: 'Engineering'});
  });

  it('defaults a custom agent form to the first agent type', () => {
    const onSubmit: Mock = vi.fn();
    let submit: () => void = () => undefined;

    renderWithProviders(
      <BaseAgentCreate agentTypes={[{label: 'Assistant', value: 'assistant'}]} onSubmit={onSubmit}>
        {({handleInputChange, handleSubmit, values}): ReactNode => {
          submit = handleSubmit;

          return (
            <input
              aria-label="Agent name"
              value={values.name}
              onChange={(event): void => handleInputChange('name', event.target.value)}
            />
          );
        }}
      </BaseAgentCreate>,
    );

    fireEvent.change(screen.getByLabelText('Agent name'), {target: {value: 'Concierge'}});
    submit();
    expect(onSubmit).toHaveBeenCalledWith({description: undefined, name: 'Concierge', type: 'assistant'});
  });

  it('hides credentials from custom details and offers no delete for read-only users', () => {
    const seen: {attributes?: Record<string, unknown>; onDelete?: () => void} = {};

    renderWithProviders(
      <BaseUserDetails
        user={{...users[0], attributes: {password: 'x', username: 'aiko'}, isReadOnly: true}}
        onDelete={vi.fn()}
      >
        {({attributes, displayName, onDelete}): ReactNode => {
          seen.attributes = attributes;
          seen.onDelete = onDelete;

          return <h2>{displayName}</h2>;
        }}
      </BaseUserDetails>,
    );

    expect(screen.getByRole('heading', {name: 'Aiko Tanaka'})).toBeTruthy();
    expect(seen.attributes).toEqual({username: 'aiko'});
    expect(seen.onDelete).toBeUndefined();
  });

  it('hands custom members UI the remove handler and the actions column', () => {
    const onRemove: Mock = vi.fn();

    renderWithProviders(
      <BaseGroupMembers members={[{display: 'Aiko Tanaka', id: 'u-1', type: 'user'}]} onRemove={onRemove}>
        {({columns, members, onRemove: remove}): ReactNode => (
          <div>
            <p>{columns.map((column: {id: string}) => column.id).join(',')}</p>
            <button type="button" onClick={(): void => remove?.(members[0])}>
              Drop
            </button>
          </div>
        )}
      </BaseGroupMembers>,
    );

    expect(screen.getByText('member,type,actions')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', {name: 'Drop'}));
    expect(onRemove).toHaveBeenCalledWith({display: 'Aiko Tanaka', id: 'u-1', type: 'user'});
  });

  it('hands custom permissions UI only the granted servers, with their names', () => {
    renderWithProviders(
      <BaseRolePermissions
        permissions={[
          {permissions: ['read'], resourceServerId: 'rs-1'},
          {permissions: [], resourceServerId: 'rs-2'},
        ]}
        resourceServerNames={{'rs-1': 'Orders API'}}
      >
        {({permissions, resolveResourceServerName}): ReactNode => (
          <ul>
            {permissions.map((entry: {permissions: string[]; resourceServerId: string}) => (
              <li
                key={entry.resourceServerId}
              >{`${resolveResourceServerName(entry.resourceServerId)}: ${entry.permissions.join(' ')}`}</li>
            ))}
          </ul>
        )}
      </BaseRolePermissions>,
    );

    expect(screen.getAllByRole('listitem').map((item: HTMLElement) => item.textContent)).toEqual(['Orders API: read']);
  });
});

describe('search and filters', () => {
  it('searches users on the server by the chosen attribute', async () => {
    const fetcher: FetcherMock = vi
      .fn<ApiFetcher>()
      .mockResolvedValue(respond({count: 0, startIndex: 1, totalResults: 0, users: []}));

    renderWithProviders(<UserList />, {fetcher});

    fireEvent.change(await screen.findByRole('combobox', {name: 'Search by'}), {target: {value: 'email'}});
    fireEvent.change(screen.getByRole('searchbox', {name: 'Email'}), {target: {value: ' ada@example.com '}});
    fireEvent.click(screen.getByRole('button', {name: 'Search'}));

    await waitFor(() => {
      const url: string = fetcher.mock.calls[fetcher.mock.calls.length - 1][0];
      expect(new URL(url).searchParams.get('filter')).toBe('email eq "ada@example.com"');
    });
    expect(await screen.findByText('No matches for "ada@example.com". Search matches the whole value.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', {name: 'Clear search'}));
    await waitFor(() => {
      const url: string = fetcher.mock.calls[fetcher.mock.calls.length - 1][0];
      expect(new URL(url).searchParams.has('filter')).toBe(false);
    });
  });

  it('hides the user search when a fixed filter is given', () => {
    renderWithProviders(<UserList filter={'username eq "ada"'} />, {
      fetcher: vi.fn<ApiFetcher>().mockResolvedValue(respond({users: []})),
    });

    expect(screen.queryByRole('search')).toBeNull();
  });

  it('searches agents by name', async () => {
    const fetcher: FetcherMock = vi
      .fn<ApiFetcher>()
      .mockResolvedValue(respond({agents: [], count: 0, startIndex: 1, totalResults: 0}));

    renderWithProviders(<AgentList />, {fetcher});

    fireEvent.change(await screen.findByRole('searchbox', {name: 'Name'}), {target: {value: 'Concierge'}});
    fireEvent.click(screen.getByRole('button', {name: 'Search'}));

    await waitFor(() => {
      const url: string = fetcher.mock.calls[fetcher.mock.calls.length - 1][0];
      expect(new URL(url).searchParams.get('filter')).toBe('name eq "Concierge"');
    });
  });

  it('narrows role assignments to one assignee type on the server', async () => {
    const fetcher: FetcherMock = vi
      .fn<ApiFetcher>()
      .mockResolvedValue(respond({assignments: [], count: 0, startIndex: 1, totalResults: 0}));

    renderWithProviders(<RoleAssignments roleId="r-1" />, {fetcher});

    fireEvent.change(await screen.findByRole('combobox', {name: 'Assignee type'}), {target: {value: 'group'}});

    await waitFor(() => {
      const url: string = fetcher.mock.calls[fetcher.mock.calls.length - 1][0];
      expect(new URL(url).searchParams.get('type')).toBe('group');
    });
  });

  it('hands the search to a list render function', () => {
    const onSearch: Mock = vi.fn();

    renderWithProviders(
      <BaseUserList
        users={users}
        search={{attribute: 'username', value: 'aiko'}}
        searchAttributes={[{label: 'Username', value: 'username'}]}
        onSearch={onSearch}
      >
        {({search, onSearch: apply}): ReactNode => (
          <button type="button" onClick={(): void => apply?.(null)}>
            {`Searching ${search?.attribute}=${search?.value}`}
          </button>
        )}
      </BaseUserList>,
    );

    fireEvent.click(screen.getByRole('button', {name: 'Searching username=aiko'}));
    expect(onSearch).toHaveBeenCalledWith(null);
  });
});
