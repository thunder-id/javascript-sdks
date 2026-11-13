// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {act, cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {createResourceInvalidator, ApiFetcher, Application, EntityTypeSchema, ManagedUser} from '@thunderid/browser';
import {ReactElement, ReactNode} from 'react';
import {Mock, afterEach, describe, expect, it, vi} from 'vitest';
import I18nProvider from '../../../contexts/I18n/I18nProvider';
import ThemeProvider from '../../../contexts/Theme/ThemeProvider';
import ThunderIDContext, {ThunderIDContextProps} from '../../../contexts/ThunderID/ThunderIDContext';
import UserContext, {UserContextProps} from '../../../contexts/User/UserContext';
import AgentCreate from '../AgentCreate/AgentCreate';
import BaseAgentCreate from '../AgentCreate/BaseAgentCreate';
import AgentDetails from '../AgentDetails/AgentDetails';
import BaseAgentDetails from '../AgentDetails/BaseAgentDetails';
import AgentList from '../AgentList/AgentList';
import BaseAgentList from '../AgentList/BaseAgentList';
import ApplicationCreate from '../ApplicationCreate/ApplicationCreate';
import BaseApplicationCreate, {BaseApplicationCreateRenderProps} from '../ApplicationCreate/BaseApplicationCreate';
import ApplicationDetails from '../ApplicationDetails/ApplicationDetails';
import BaseApplicationDetails, {BaseApplicationDetailsRenderProps} from '../ApplicationDetails/BaseApplicationDetails';
import ApplicationList from '../ApplicationList/ApplicationList';
import BaseApplicationList from '../ApplicationList/BaseApplicationList';
import BaseGroupCreate from '../GroupCreate/BaseGroupCreate';
import GroupCreate from '../GroupCreate/GroupCreate';
import BaseGroupDetails, {BaseGroupDetailsRenderProps} from '../GroupDetails/BaseGroupDetails';
import GroupDetails from '../GroupDetails/GroupDetails';
import GroupList from '../GroupList/GroupList';
import BaseGroupMembers, {BaseGroupMembersRenderProps} from '../GroupMembers/BaseGroupMembers';
import GroupMembers from '../GroupMembers/GroupMembers';
import BaseRoleAssignments, {BaseRoleAssignmentsRenderProps} from '../RoleAssignments/BaseRoleAssignments';
import RoleAssignments from '../RoleAssignments/RoleAssignments';
import BaseRoleDetails, {BaseRoleDetailsRenderProps} from '../RoleDetails/BaseRoleDetails';
import RoleDetails from '../RoleDetails/RoleDetails';
import RoleList from '../RoleList/RoleList';
import BaseRolePermissions from '../RolePermissions/BaseRolePermissions';
import RolePermissions from '../RolePermissions/RolePermissions';
import BaseSharedFlowList from '../SharedFlowList/BaseSharedFlowList';
import SharedFlowList from '../SharedFlowList/SharedFlowList';
import BaseUserCreate from '../UserCreate/BaseUserCreate';
import UserCreate from '../UserCreate/UserCreate';
import BaseUserDetails, {BaseUserDetailsRenderProps} from '../UserDetails/BaseUserDetails';
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
  {
    endpoints,
    fetcher,
    ouId,
  }: {endpoints?: ThunderIDContextProps['endpoints']; fetcher?: ApiFetcher; ouId?: string} = {},
): ReturnType<typeof render> => {
  const thunderID = {
    baseUrl,
    endpoints,
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

describe('AgentCreate', () => {
  it('sends the owner it is given as an object', async () => {
    const fetcher: FetcherMock = vi.fn<ApiFetcher>().mockImplementation((url: string) =>
      Promise.resolve(
        url.includes('/agent-types')
          ? respond({
              count: 1,
              startIndex: 1,
              totalResults: 1,
              types: [{displayName: 'Assistant', handle: 'assistant', id: 't-1', ouId: 'ou-1'}],
            })
          : respond({id: 'a-9', ouId: 'ou-1', type: 'assistant'}),
      ),
    );
    const onCreated: Mock = vi.fn();
    const owner = {id: 'jane@example.com', idType: 'email', isLocal: false} as const;

    renderWithProviders(<AgentCreate onCreated={onCreated} owner={owner} />, {fetcher, ouId: 'ou-1'});

    await waitFor(() => expect(screen.getByRole('option', {name: 'Assistant'})).toBeTruthy());
    fireEvent.change(document.querySelector('input[name="name"]')!, {target: {value: 'Concierge'}});
    fireEvent.click(screen.getByRole('button', {name: 'Register agent'}));

    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    const [, init] = fetcher.mock.calls.find(([, request]: [string, RequestInit]) => request.method === 'POST')!;
    expect(JSON.parse(init.body as string)).toMatchObject({owner});
  });
});

describe('BaseAgentDetails', () => {
  it("shows the owner's ID", () => {
    renderWithProviders(
      <BaseAgentDetails
        agent={{id: 'a-1', ouId: 'ou-1', owner: {id: 'jane@example.com', idType: 'email', isLocal: false}, type: 'x'}}
      />,
    );

    expect(screen.getByText('jane@example.com')).toBeTruthy();
  });

  it('says when the agent has no owner', () => {
    renderWithProviders(<BaseAgentDetails agent={{id: 'a-1', ouId: 'ou-1', type: 'x'}} />);

    expect(screen.getByText('No owner')).toBeTruthy();
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
    expect(fetcher.mock.calls[0][0]).toBe(`${baseUrl}/roles/r-1?include=display`);
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

  it('lists the candidates from the organization unit it is given', async () => {
    const fetcher: FetcherMock = vi
      .fn<ApiFetcher>()
      .mockResolvedValue(respond({assignments: [], count: 0, startIndex: 1, totalResults: 0}));

    renderWithProviders(<RoleAssignments roleId="r-1" ouId="ou-1" editable />, {fetcher});

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(4));
    const filters: Record<string, string | null> = Object.fromEntries(
      fetcher.mock.calls.map(([url]: [string, RequestInit]) => {
        const {pathname, searchParams} = new URL(url);

        return [pathname, searchParams.get('filter')];
      }),
    );
    expect(filters).toEqual({
      '/agents': 'ouId eq "ou-1"',
      '/groups': 'ouId eq "ou-1"',
      '/roles/r-1/assignments': null,
      '/users': 'ouId eq "ou-1"',
    });
  });

  it.each<[string, () => Promise<Response>]>([
    ['is pending', () => new Promise<Response>(() => undefined)],
    ['has failed', () => Promise.resolve(respond({}, 500))],
  ])('offers no candidates from the previous organization unit while the new list %s', async (_state, listNext) => {
    const fetcher: FetcherMock = vi.fn<ApiFetcher>().mockImplementation((url: string) =>
      new URL(url).searchParams.get('filter') === 'ouId eq "ou-2"'
        ? listNext()
        : Promise.resolve(
            respond({
              agents: [{attributes: {name: 'Deploy bot'}, id: 'ag-1'}],
              assignments: [],
              count: 1,
              groups: [{id: 'g-1', name: 'Ops'}],
              startIndex: 1,
              totalResults: 1,
              users: [{display: 'Aiko Tanaka', id: 'u-1'}],
            }),
          ),
    );
    let candidates: BaseRoleAssignmentsRenderProps['candidates'];
    const view = (ouId: string): ReactElement => (
      <RoleAssignments roleId="r-1" ouId={ouId} editable>
        {(props: BaseRoleAssignmentsRenderProps) => {
          candidates = props.candidates;

          return null;
        }}
      </RoleAssignments>
    );

    const {rerender} = renderWithProviders(view('ou-1'), {fetcher});
    await waitFor(() => expect(candidates?.user).toHaveLength(1));
    expect(candidates?.group).toHaveLength(1);
    expect(candidates?.agent).toHaveLength(1);

    rerender(view('ou-2'));

    await waitFor(() =>
      expect(
        fetcher.mock.calls
          .filter(([url]: [string, RequestInit]) => url.includes('ou-2'))
          .map(([url]) => new URL(url).pathname),
      ).toEqual(expect.arrayContaining(['/users', '/groups', '/agents'])),
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(candidates).toEqual({agent: [], group: [], user: []});
  });

  it('lists the candidates without a filter when no organization unit is given', async () => {
    const fetcher: FetcherMock = vi
      .fn<ApiFetcher>()
      .mockResolvedValue(respond({assignments: [], count: 0, startIndex: 1, totalResults: 0}));

    renderWithProviders(<RoleAssignments roleId="r-1" editable />, {fetcher});

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(4));
    fetcher.mock.calls.forEach(([url]: [string, RequestInit]) => {
      expect(new URL(url).searchParams.has('filter')).toBe(false);
    });
  });

  it('lists the group member candidates from the organization unit it is given', async () => {
    const fetcher: FetcherMock = vi
      .fn<ApiFetcher>()
      .mockResolvedValue(respond({count: 0, members: [], startIndex: 1, totalResults: 0}));

    renderWithProviders(<GroupMembers groupId="g-1" ouId="ou-1" editable />, {fetcher});

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
    const filters: Record<string, string | null> = Object.fromEntries(
      fetcher.mock.calls.map(([url]: [string, RequestInit]) => {
        const {pathname, searchParams} = new URL(url);

        return [pathname, searchParams.get('filter')];
      }),
    );
    expect(filters).toEqual({
      '/agents': 'ouId eq "ou-1"',
      '/groups/g-1/members': null,
      '/users': 'ouId eq "ou-1"',
    });
  });

  it.each<[string, () => Promise<Response>]>([
    ['is pending', () => new Promise<Response>(() => undefined)],
    ['has failed', () => Promise.resolve(respond({}, 500))],
  ])(
    'offers no group member candidates from the previous organization unit while the new list %s',
    async (_state, listNext) => {
      const fetcher: FetcherMock = vi.fn<ApiFetcher>().mockImplementation((url: string) =>
        new URL(url).searchParams.get('filter') === 'ouId eq "ou-2"'
          ? listNext()
          : Promise.resolve(
              respond({
                agents: [{attributes: {name: 'Deploy bot'}, id: 'ag-1'}],
                count: 1,
                members: [],
                startIndex: 1,
                totalResults: 1,
                users: [{display: 'Aiko Tanaka', id: 'u-1'}],
              }),
            ),
      );
      let candidates: BaseGroupMembersRenderProps['candidates'];
      const view = (ouId: string): ReactElement => (
        <GroupMembers groupId="g-1" ouId={ouId} editable>
          {(props: BaseGroupMembersRenderProps) => {
            candidates = props.candidates;

            return null;
          }}
        </GroupMembers>
      );

      const {rerender} = renderWithProviders(view('ou-1'), {fetcher});
      await waitFor(() => expect(candidates?.user).toHaveLength(1));
      expect(candidates?.agent).toHaveLength(1);

      rerender(view('ou-2'));

      await waitFor(() =>
        expect(
          fetcher.mock.calls
            .filter(([url]: [string, RequestInit]) => url.includes('ou-2'))
            .map(([url]) => new URL(url).pathname),
        ).toEqual(expect.arrayContaining(['/users', '/agents'])),
      );
      await act(async () => {
        await Promise.resolve();
      });
      expect(candidates).toEqual({agent: [], user: []});
    },
  );

  it('lists the group member candidates without a filter when no organization unit is given', async () => {
    const fetcher: FetcherMock = vi
      .fn<ApiFetcher>()
      .mockResolvedValue(respond({count: 0, members: [], startIndex: 1, totalResults: 0}));

    renderWithProviders(<GroupMembers groupId="g-1" editable />, {fetcher});

    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3));
    fetcher.mock.calls.forEach(([url]: [string, RequestInit]) => {
      expect(new URL(url).searchParams.has('filter')).toBe(false);
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

describe('connected data loading', () => {
  const emptyPage: Record<string, unknown> = {
    agents: [],
    assignments: [],
    count: 0,
    groups: [],
    members: [],
    roles: [],
    startIndex: 1,
    totalResults: 0,
    users: [],
  };

  // Answers each management request with a body shaped for the resource it asks for.
  const createRoutingFetcher = (): FetcherMock =>
    vi.fn<ApiFetcher>().mockImplementation((url: string, init?: RequestInit) => {
      const {pathname} = new URL(url);

      if (init?.method === 'DELETE') {
        return Promise.resolve(respond(null, 204));
      }
      if (pathname.endsWith('/members')) {
        return Promise.resolve(
          respond({
            ...emptyPage,
            count: 1,
            members: [{display: 'Aiko Tanaka', id: 'u-1', type: 'user'}],
            totalResults: 1,
          }),
        );
      }
      if (pathname.endsWith('/assignments')) {
        return Promise.resolve(
          respond({...emptyPage, assignments: [{display: 'Deploy bot', id: 'ag-1', type: 'agent'}], count: 1}),
        );
      }
      if (pathname === '/users/u-1') {
        return Promise.resolve(respond(users[0]));
      }
      if (pathname === '/agents/ag-1') {
        return Promise.resolve(
          respond({attributes: {name: 'Deploy bot'}, display: 'Deploy bot', id: 'ag-1', ouId: 'ou-1', type: 'default'}),
        );
      }
      if (init?.method === 'POST' && pathname === '/groups') {
        return Promise.resolve(respond({id: 'g-9', name: 'Support', ouId: 'ou-1'}, 201));
      }

      return Promise.resolve(respond(emptyPage));
    });

  const requestedPaths = (fetcher: FetcherMock): string[] =>
    fetcher.mock.calls.map(([url]: [string, RequestInit]) => {
      const {pathname, search} = new URL(url);

      return `${pathname}${search}`;
    });

  it('loads groups and roles from their collections', async () => {
    const fetcher: FetcherMock = createRoutingFetcher();

    renderWithProviders(
      <>
        <GroupList limit={10} />
        <RoleList limit={10} />
      </>,
      {fetcher},
    );

    await waitFor(() =>
      expect(requestedPaths(fetcher)).toEqual(
        expect.arrayContaining([
          '/groups?include=display&limit=10&offset=0',
          '/roles?include=display&limit=10&offset=0',
        ]),
      ),
    );
  });

  it('targets the groups endpoint override when the provider sets one', async () => {
    const fetcher: FetcherMock = createRoutingFetcher();

    renderWithProviders(<GroupMembers groupId="g-1" />, {
      endpoints: {groups: 'https://rs.example.com/groups'},
      fetcher,
    });

    await screen.findByText('Aiko Tanaka');
    expect(fetcher.mock.calls[0][0]).toBe('https://rs.example.com/groups/g-1/members?include=display&limit=100');
  });

  it('waits for an identifier before fetching a resource', () => {
    const fetcher: FetcherMock = createRoutingFetcher();

    renderWithProviders(
      <>
        <UserDetails userId="" />
        <RoleAssignments roleId="" />
      </>,
      {fetcher},
    );

    expect(fetcher).not.toHaveBeenCalled();
  });

  it('refetches members, memberships and role assignments after removing a group member', async () => {
    const fetcher: FetcherMock = createRoutingFetcher();

    renderWithProviders(
      <>
        <GroupMembers groupId="g-1" editable />
        <UserDetails userId="u-1" />
        <RoleAssignments roleId="r-1" />
      </>,
      {fetcher},
    );

    const remove: HTMLElement = await screen.findByRole('button', {name: 'Remove Aiko Tanaka from the group'});
    await screen.findByRole('heading', {name: 'Aiko Tanaka'});
    await screen.findByText('Deploy bot');
    fetcher.mockClear();

    fireEvent.click(remove);

    await waitFor(() =>
      expect(requestedPaths(fetcher)).toEqual(
        expect.arrayContaining([
          '/groups/g-1/members/remove',
          '/groups/g-1/members?include=display&limit=100',
          '/users/u-1/groups?limit=100',
          '/roles/r-1/assignments?include=display&limit=100',
        ]),
      ),
    );
    // The user itself is not part of the membership change.
    expect(requestedPaths(fetcher)).not.toContain('/users/u-1?include=display');
  });

  it('refetches role assignments and agent roles after unassigning a role', async () => {
    const fetcher: FetcherMock = createRoutingFetcher();

    renderWithProviders(
      <>
        <RoleAssignments roleId="r-1" editable />
        <AgentDetails agentId="ag-1" />
      </>,
      {fetcher},
    );

    const remove: HTMLElement = await screen.findByRole('button', {name: 'Remove the role from Deploy bot'});
    await waitFor(() => expect(requestedPaths(fetcher)).toContain('/agents/ag-1/roles?limit=100'));
    fetcher.mockClear();

    fireEvent.click(remove);

    await waitFor(() =>
      expect(requestedPaths(fetcher)).toEqual(
        expect.arrayContaining([
          '/roles/r-1/assignments/remove',
          '/roles/r-1/assignments?include=display&limit=100',
          '/agents/ag-1/roles?limit=100',
        ]),
      ),
    );
    const removal: [string, RequestInit] = fetcher.mock.calls.find(([url]: [string, RequestInit]) =>
      url.endsWith('/assignments/remove'),
    )!;
    expect(JSON.parse(removal[1].body as string)).toEqual({assignments: [{id: 'ag-1', type: 'agent'}]});
  });

  it('refreshes user lists after a user is deleted', async () => {
    const fetcher: FetcherMock = createRoutingFetcher();
    const onDeleted: Mock = vi.fn();

    renderWithProviders(
      <>
        <UserDetails userId="u-1" deletable onDeleted={onDeleted} />
        <UserList />
      </>,
      {fetcher},
    );

    fireEvent.click(await screen.findByRole('button', {name: 'Delete user'}));
    await waitFor(() => expect(requestedPaths(fetcher)).toContain('/users?include=display&limit=20&offset=0'));
    fetcher.mockClear();
    fireEvent.click(screen.getByRole('button', {name: 'Confirm'}));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
    expect(fetcher.mock.calls[0]).toEqual([`${baseUrl}/users/u-1`, expect.objectContaining({method: 'DELETE'})]);
    await waitFor(() => expect(requestedPaths(fetcher)).toContain('/users?include=display&limit=20&offset=0'));
  });

  it('refreshes group lists after a group is created', async () => {
    const fetcher: FetcherMock = createRoutingFetcher();
    const onCreated: Mock = vi.fn();

    renderWithProviders(
      <>
        <GroupCreate onCreated={onCreated} />
        <GroupList />
      </>,
      {fetcher, ouId: 'ou-1'},
    );

    await waitFor(() => expect(requestedPaths(fetcher)).toContain('/groups?include=display&limit=20&offset=0'));
    fetcher.mockClear();
    fireEvent.change(document.querySelector('input[name="name"]')!, {target: {value: 'Support'}});
    fireEvent.click(screen.getByRole('button', {name: 'Create group'}));

    await waitFor(() =>
      expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({id: 'g-9'}), expect.anything()),
    );
    expect(JSON.parse(fetcher.mock.calls[0][1].body as string)).toEqual({name: 'Support', ouId: 'ou-1'});
    await waitFor(() => expect(requestedPaths(fetcher)).toContain('/groups?include=display&limit=20&offset=0'));
  });
});

describe('agent names', () => {
  it('shows the display value, then the name attribute, then the identifier in the agent list', () => {
    renderWithProviders(
      <BaseAgentList
        agents={[
          {attributes: {name: 'Sync worker'}, display: 'Nightly sync worker', id: 'ag-1', ouId: 'ou-1', type: 'bot'},
          {attributes: {name: 'Billing bot'}, id: 'ag-2', ouId: 'ou-1', type: 'bot'},
          {id: 'ag-3', ouId: 'ou-1', type: 'bot'},
        ]}
      />,
    );

    const table: HTMLElement = screen.getByRole('table', {name: 'Agents'});

    expect(within(table).getByText('Nightly sync worker')).toBeTruthy();
    expect(within(table).getByText('Billing bot')).toBeTruthy();
    expect(within(table).getByText('ag-3')).toBeTruthy();
  });

  it('titles the agent details and asks to delete the agent by its name attribute', () => {
    const onDelete: Mock = vi.fn();

    renderWithProviders(
      <BaseAgentDetails
        agent={{attributes: {name: 'Billing bot'}, id: 'ag-2', ouId: 'ou-1', type: 'bot'}}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText('Billing bot')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', {name: 'Delete agent'}));
    fireEvent.click(
      within(screen.getByRole('group', {name: 'Delete Billing bot?'})).getByRole('button', {name: 'Confirm'}),
    );
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('sends the name of a new agent as its name attribute', async () => {
    const fetcher: FetcherMock = vi.fn<ApiFetcher>().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return Promise.resolve(
          respond({attributes: {name: 'Concierge'}, id: 'ag-9', ouId: 'ou-1', type: 'assistant'}, 201),
        );
      }
      if (new URL(url).pathname === '/agent-types') {
        return Promise.resolve(
          respond({
            count: 1,
            startIndex: 1,
            totalResults: 1,
            types: [{displayName: 'Assistant', handle: 'assistant', id: 'at-1', ouId: 'ou-1'}],
          }),
        );
      }

      return Promise.resolve(respond({agents: [], count: 0, startIndex: 1, totalResults: 0}));
    });
    const onCreated: Mock = vi.fn();

    renderWithProviders(<AgentCreate onCreated={onCreated} />, {fetcher, ouId: 'ou-1'});

    await screen.findByRole('option', {name: 'Assistant'});
    fireEvent.change(document.querySelector('input[name="name"]')!, {target: {value: 'Concierge'}});
    fireEvent.click(screen.getByRole('button', {name: 'Register agent'}));

    await waitFor(() => expect(onCreated).toHaveBeenCalledOnce());
    const creation: [string, RequestInit] | undefined = fetcher.mock.calls.find(
      ([, init]: [string, RequestInit]) => init?.method === 'POST',
    );

    expect(creation?.[0]).toBe(`${baseUrl}/agents`);
    expect(JSON.parse(creation?.[1].body as string)).toEqual({
      attributes: {name: 'Concierge'},
      ouId: 'ou-1',
      type: 'assistant',
    });
  });
});

describe('applications', () => {
  const application: Application = {
    description: 'Customer portal',
    id: 'app-1',
    inboundAuthConfig: [
      {
        config: {
          clientId: 'portal-client',
          clientSecret: 'stored-secret',
          grantTypes: ['authorization_code', 'refresh_token'],
          redirectUris: ['https://portal.example/callback'],
          responseTypes: ['code'],
        },
        type: 'oauth2',
      },
    ],
    name: 'Portal',
    ouId: 'ou-1',
    template: 'browser',
    url: 'https://portal.example',
  };

  const createApplicationFetcher = (created: Application = application): FetcherMock =>
    vi.fn<ApiFetcher>().mockImplementation((url: string, init?: RequestInit) => {
      const {pathname} = new URL(url);

      if (init?.method === 'DELETE') return Promise.resolve(respond(null, 204));
      if (init?.method === 'POST') return Promise.resolve(respond(created, 201));
      if (init?.method === 'PUT') return Promise.resolve(respond(JSON.parse(init.body as string)));
      if (pathname === '/applications/app-1') return Promise.resolve(respond(application));

      return Promise.resolve(
        respond({
          applications: [{clientId: 'portal-client', id: 'app-1', name: 'Portal', template: 'browser'}],
          count: 1,
          totalResults: 1,
        }),
      );
    });

  const paths = (fetcher: FetcherMock): string[] =>
    fetcher.mock.calls.map(([url, init]: [string, RequestInit]) => {
      const {pathname, search} = new URL(url);

      return `${init?.method ?? 'GET'} ${pathname}${search}`;
    });

  it('lists applications with their client ID and type', () => {
    renderWithProviders(
      <BaseApplicationList
        applications={[{clientId: 'portal-client', id: 'app-1', name: 'Portal', template: 'browser'}]}
      />,
    );

    const table: HTMLElement = screen.getByRole('table', {name: 'Applications'});
    expect(within(table).getByText('Portal')).toBeTruthy();
    expect(within(table).getByText('portal-client')).toBeTruthy();
    expect(within(table).getByText('browser')).toBeTruthy();
  });

  it('shows a translated status column only when the server reports a status', () => {
    const {unmount} = renderWithProviders(
      <BaseApplicationList
        applications={[
          {id: 'app-1', name: 'Portal', status: {value: 'ACTIVE'}},
          {id: 'app-2', name: 'Legacy', status: {value: 'SUSPENDED'}},
        ]}
      />,
    );

    const table: HTMLElement = screen.getByRole('table', {name: 'Applications'});
    expect(within(table).getByRole('columnheader', {name: 'Status'})).toBeTruthy();
    expect(within(table).getByText('Active')).toBeTruthy();
    expect(within(table).getByText('Suspended')).toBeTruthy();
    unmount();

    renderWithProviders(<BaseApplicationList applications={[{id: 'app-1', name: 'Portal'}]} />);
    expect(screen.queryByRole('columnheader', {name: 'Status'})).toBeNull();
  });

  it('hands a custom list the applications and default columns', () => {
    renderWithProviders(
      <BaseApplicationList applications={[{id: 'app-1', name: 'Portal'}]} totalResults={9}>
        {({applications: rows, columns, totalResults}): ReactNode => (
          <p>{`${rows.map((row) => row.name).join()} ${totalResults} ${columns.map((column) => column.id).join()}`}</p>
        )}
      </BaseApplicationList>,
    );

    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText('Portal 9 name,clientId,type')).toBeTruthy();
  });

  it('fetches a page of applications', async () => {
    const fetcher: FetcherMock = createApplicationFetcher();

    renderWithProviders(<ApplicationList limit={5} />, {fetcher});

    await screen.findByText('portal-client');
    expect(paths(fetcher)).toEqual(['GET /applications?limit=5&offset=0']);
  });

  it('lists shared flows with their handle and type, and reports the one chosen', () => {
    const onSelect: Mock = vi.fn();
    const flow = {activeVersion: 1, flowType: 'AUTHENTICATION', handle: 'enterprise', id: 'flow-1', name: 'Enterprise'};

    renderWithProviders(<BaseSharedFlowList flows={[flow]} onSelect={onSelect} />);

    const table: HTMLElement = screen.getByRole('table', {name: 'Shared flows'});
    expect(within(table).getByText('enterprise')).toBeTruthy();
    expect(within(table).getByText('AUTHENTICATION')).toBeTruthy();

    fireEvent.click(within(table).getByText('Enterprise'));
    expect(onSelect).toHaveBeenCalledWith(flow);
  });

  it('says no flow is shared when the list is empty', () => {
    renderWithProviders(<BaseSharedFlowList flows={[]} />);

    expect(screen.getByText('No flows have been shared with this organization unit.')).toBeTruthy();
  });

  describe('shared flow list ownership', () => {
    const unitFlows = {
      count: 2,
      flows: [
        {
          activeVersion: 1,
          flowType: 'AUTHENTICATION',
          handle: 'own',
          id: 'flow-1',
          isOwnedByOU: true,
          name: 'Owned flow',
        },
        {
          activeVersion: 1,
          flowType: 'AUTHENTICATION',
          handle: 'shared',
          id: 'flow-2',
          isOwnedByOU: false,
          name: 'Shared flow',
        },
      ],
      totalResults: 2,
    };

    it('lists only the flows shared with the unit by default', async () => {
      const fetcher: FetcherMock = vi.fn<ApiFetcher>().mockResolvedValue(respond(unitFlows));

      renderWithProviders(<SharedFlowList ouId="ou-1" />, {fetcher});

      await screen.findByText('Shared flow');
      expect(screen.queryByText('Owned flow')).toBeNull();
      expect(paths(fetcher)).toEqual(['GET /flows?filter=ouId+eq+%22ou-1%22&limit=100&offset=0']);
    });

    it('lists only the flows the unit owns when asked', async () => {
      const fetcher: FetcherMock = vi.fn<ApiFetcher>().mockResolvedValue(respond(unitFlows));

      renderWithProviders(<SharedFlowList ouId="ou-1" ownership="owned" />, {fetcher});

      await screen.findByText('Owned flow');
      expect(screen.queryByText('Shared flow')).toBeNull();
    });

    it('lists both a page at a time when asked for all', async () => {
      const fetcher: FetcherMock = vi.fn<ApiFetcher>().mockResolvedValue(respond(unitFlows));

      renderWithProviders(<SharedFlowList ouId="ou-1" ownership="all" limit={5} />, {fetcher});

      await screen.findByText('Owned flow');
      expect(screen.getByText('Shared flow')).toBeTruthy();
      expect(paths(fetcher)).toEqual(['GET /flows?filter=ouId+eq+%22ou-1%22&limit=5&offset=0']);
    });
  });

  it('needs a redirect URI for the authorization code grant and submits the OAuth basics', () => {
    const onSubmit: Mock = vi.fn();

    renderWithProviders(<BaseApplicationCreate onSubmit={onSubmit} />);
    const submit: HTMLButtonElement = screen.getByRole('button', {name: 'Create application'});

    fireEvent.change(document.querySelector('input[name="name"]')!, {target: {value: ' Portal '}});
    expect(submit.disabled).toBe(true);
    fireEvent.change(document.querySelector('input[name="redirectUris"]')!, {
      target: {value: 'https://a.example/cb, https://b.example/cb'},
    });
    expect(submit.disabled).toBe(false);
    fireEvent.click(screen.getByLabelText('Public client (no client secret)'));
    fireEvent.click(submit);

    expect(onSubmit).toHaveBeenCalledWith({
      description: undefined,
      grantTypes: ['authorization_code', 'refresh_token'],
      logoUrl: undefined,
      name: 'Portal',
      publicClient: true,
      redirectUris: ['https://a.example/cb', 'https://b.example/cb'],
      url: undefined,
    });
  });

  it('refuses the client credentials grant for a public client', () => {
    renderWithProviders(<BaseApplicationCreate onSubmit={vi.fn()} />);

    fireEvent.change(document.querySelector('input[name="name"]')!, {target: {value: 'Worker'}});
    fireEvent.click(screen.getByLabelText('Authorization code'));
    fireEvent.click(screen.getByLabelText('Client credentials'));
    expect(screen.getByRole('button', {name: 'Create application'}).disabled).toBe(false);
    fireEvent.click(screen.getByLabelText('Public client (no client secret)'));

    expect(screen.getByRole('button', {name: 'Create application'}).disabled).toBe(true);
  });

  it('lets a custom create form set values and submit them', () => {
    const onSubmit: Mock = vi.fn();
    let form: BaseApplicationCreateRenderProps | undefined;

    renderWithProviders(
      <BaseApplicationCreate onSubmit={onSubmit}>
        {(props: BaseApplicationCreateRenderProps): ReactNode => {
          form = props;

          return <p>{props.grantTypeOptions.map((option) => option.label).join(',')}</p>;
        }}
      </BaseApplicationCreate>,
    );

    expect(screen.getByText('Authorization code,Refresh token,Client credentials')).toBeTruthy();
    act(() => {
      form!.handleInputChange('name', 'Daemon');
      form!.handleGrantTypesChange(['client_credentials']);
    });
    expect(form!.isValid).toBe(true);
    act(() => form!.handleSubmit());

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({grantTypes: ['client_credentials'], name: 'Daemon'}),
    );
  });

  it('creates the application and shows the returned client secret once before reporting it', async () => {
    const fetcher: FetcherMock = createApplicationFetcher({
      ...application,
      id: 'app-9',
      inboundAuthConfig: [{config: {clientSecret: 's3cr3t', grantTypes: [], responseTypes: []}, type: 'oauth2'}],
    });
    const onCreated: Mock = vi.fn();

    renderWithProviders(
      <>
        <ApplicationCreate onCreated={onCreated} />
        <ApplicationList />
      </>,
      {fetcher, ouId: 'ou-1'},
    );

    await screen.findByText('portal-client');
    fetcher.mockClear();
    fireEvent.change(document.querySelector('input[name="name"]')!, {target: {value: 'Portal'}});
    fireEvent.change(document.querySelector('input[name="redirectUris"]')!, {target: {value: 'https://p.example/cb'}});
    fireEvent.click(screen.getByRole('button', {name: 'Create application'}));

    expect(await screen.findByDisplayValue('s3cr3t')).toBeTruthy();
    expect(onCreated).not.toHaveBeenCalled();
    const [url, init] = fetcher.mock.calls[0];
    expect(url).toBe(`${baseUrl}/applications`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({
      inboundAuthConfig: [
        {
          config: {
            grantTypes: ['authorization_code', 'refresh_token'],
            publicClient: false,
            redirectUris: ['https://p.example/cb'],
            responseTypes: ['code'],
            tokenEndpointAuthMethod: 'client_secret_basic',
          },
          type: 'oauth2',
        },
      ],
      name: 'Portal',
      ouId: 'ou-1',
    });
    // The list refetches after the create.
    await waitFor(() => expect(paths(fetcher)).toContain('GET /applications?limit=20&offset=0'));

    fireEvent.click(screen.getByRole('button', {name: 'Done'}));

    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({id: 'app-9'}));
    expect(screen.queryByDisplayValue('s3cr3t')).toBeNull();
    expect(document.querySelector<HTMLInputElement>('input[name="name"]')!.value).toBe('');
  });

  it('shows the details and OAuth configuration without the stored secret, and offers no actions by default', () => {
    renderWithProviders(<BaseApplicationDetails application={application} />);

    expect(screen.getByRole('heading', {name: 'Portal'})).toBeTruthy();
    expect(screen.getByRole('list', {name: 'Redirect URIs'}).textContent).toContain('https://portal.example/callback');
    expect(screen.getByRole('list', {name: 'Grant types'}).textContent).toContain('Authorization code');
    expect(document.body.innerHTML).not.toContain('stored-secret');
    expect(screen.queryByRole('button', {name: 'Edit'})).toBeNull();
    expect(screen.queryByRole('button', {name: 'Delete application'})).toBeNull();
    expect(screen.queryByRole('button', {name: 'Regenerate client secret'})).toBeNull();
  });

  it('asks for confirmation before deleting or regenerating the secret', () => {
    const onDelete: Mock = vi.fn();
    const onRegenerateSecret: Mock = vi.fn();

    renderWithProviders(
      <BaseApplicationDetails application={application} onDelete={onDelete} onRegenerateSecret={onRegenerateSecret} />,
    );

    fireEvent.click(screen.getByRole('button', {name: 'Regenerate client secret'}));
    expect(onRegenerateSecret).not.toHaveBeenCalled();
    const regenerate: HTMLElement = screen.getByRole('group', {name: /Regenerate the client secret of Portal/});
    fireEvent.click(within(regenerate).getByRole('button', {name: 'Confirm'}));
    expect(onRegenerateSecret).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', {name: 'Delete application'}));
    expect(onDelete).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('group', {name: 'Delete Portal?'})).getByRole('button', {name: 'Confirm'}));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('offers no secret regeneration for public clients and no actions for read-only applications', () => {
    const publicApplication: Application = {
      ...application,
      inboundAuthConfig: [{config: {grantTypes: [], publicClient: true, responseTypes: []}, type: 'oauth2'}],
    };
    const {unmount} = renderWithProviders(
      <BaseApplicationDetails application={publicApplication} onRegenerateSecret={vi.fn()} />,
    );

    expect(screen.queryByRole('button', {name: 'Regenerate client secret'})).toBeNull();
    unmount();

    renderWithProviders(
      <BaseApplicationDetails application={{...application, isReadOnly: true}} onDelete={vi.fn()} onUpdate={vi.fn()} />,
    );
    expect(screen.queryByRole('button', {name: 'Edit'})).toBeNull();
    expect(screen.queryByRole('button', {name: 'Delete application'})).toBeNull();
  });

  it('edits the general fields, redirect URIs and grant types', () => {
    const onUpdate: Mock = vi.fn();

    renderWithProviders(<BaseApplicationDetails application={application} onUpdate={onUpdate} />);
    fireEvent.click(screen.getByRole('button', {name: 'Edit'}));
    fireEvent.change(document.querySelector('input[name="name"]')!, {target: {value: 'Portal 2'}});
    fireEvent.change(document.querySelector('input[name="redirectUris"]')!, {
      target: {value: 'https://portal.example/callback, https://portal.example/alt'},
    });
    fireEvent.click(screen.getByLabelText('Refresh token'));
    fireEvent.click(screen.getByRole('button', {name: 'Save changes'}));

    expect(onUpdate).toHaveBeenCalledWith({
      description: 'Customer portal',
      grantTypes: ['authorization_code'],
      logoUrl: undefined,
      name: 'Portal 2',
      redirectUris: ['https://portal.example/callback', 'https://portal.example/alt'],
      url: 'https://portal.example',
    });
  });

  it('shows a regenerated secret once and hands custom details only the allowed actions', () => {
    const onSecretDismiss: Mock = vi.fn();
    const {unmount} = renderWithProviders(
      <BaseApplicationDetails application={application} clientSecret="fresh" onSecretDismiss={onSecretDismiss} />,
    );

    expect(screen.getByDisplayValue('fresh')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', {name: 'Done'}));
    expect(onSecretDismiss).toHaveBeenCalledOnce();
    unmount();

    let details: BaseApplicationDetailsRenderProps | undefined;
    renderWithProviders(
      <BaseApplicationDetails application={application} onDelete={vi.fn()}>
        {(props: BaseApplicationDetailsRenderProps): ReactNode => {
          details = props;

          return <p>{props.oauth?.clientId}</p>;
        }}
      </BaseApplicationDetails>,
    );

    expect(screen.getByText('portal-client')).toBeTruthy();
    expect(details!.oauth).not.toHaveProperty('clientSecret');
    expect(details!.onDelete).toBeTypeOf('function');
    expect(details!.onUpdate).toBeUndefined();
    expect(details!.onRegenerateSecret).toBeUndefined();
  });

  it('loads the application and saves an edit as a full update', async () => {
    const fetcher: FetcherMock = createApplicationFetcher();

    renderWithProviders(<ApplicationDetails applicationId="app-1" editable />, {fetcher});

    fireEvent.click(await screen.findByRole('button', {name: 'Edit'}));
    expect(paths(fetcher)).toEqual(['GET /applications/app-1']);
    fireEvent.change(document.querySelector('input[name="name"]')!, {target: {value: 'Portal 2'}});
    fireEvent.click(screen.getByRole('button', {name: 'Save changes'}));

    await waitFor(() => expect(paths(fetcher)).toContain('PUT /applications/app-1'));
    const [, init] = fetcher.mock.calls.find(([, request]: [string, RequestInit]) => request?.method === 'PUT')!;
    const {id, ...rest} = application;
    void id;
    expect(JSON.parse(init.body as string)).toEqual({...rest, name: 'Portal 2'});
    // The application refetches after the update.
    await waitFor(() => expect(paths(fetcher).filter((path) => path === 'GET /applications/app-1')).toHaveLength(2));
  });

  it('regenerates the client secret and shows the new one', async () => {
    const fetcher: FetcherMock = createApplicationFetcher();

    renderWithProviders(<ApplicationDetails applicationId="app-1" secretRegenerable />, {fetcher});

    fireEvent.click(await screen.findByRole('button', {name: 'Regenerate client secret'}));
    fireEvent.click(screen.getByRole('button', {name: 'Confirm'}));

    const put: [string, RequestInit] = await waitFor(() => {
      const call = fetcher.mock.calls.find(([, request]: [string, RequestInit]) => request?.method === 'PUT');
      expect(call).toBeTruthy();

      return call!;
    });
    expect(put[0]).toBe(`${baseUrl}/applications/app-1`);
    const saved: Application = JSON.parse(put[1].body as string) as Application;
    const secret: string = saved.inboundAuthConfig![0].config.clientSecret!;
    expect(secret).not.toBe('stored-secret');
    expect(await screen.findByDisplayValue(secret)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', {name: 'Done'}));
    expect(screen.queryByDisplayValue(secret)).toBeNull();
  });

  it('deletes the application and refreshes application lists', async () => {
    const fetcher: FetcherMock = createApplicationFetcher();
    const onDeleted: Mock = vi.fn();

    renderWithProviders(
      <>
        <ApplicationDetails applicationId="app-1" deletable onDeleted={onDeleted} />
        <ApplicationList />
      </>,
      {fetcher},
    );

    fireEvent.click(await screen.findByRole('button', {name: 'Delete application'}));
    await within(screen.getByRole('table', {name: 'Applications'})).findByText('portal-client');
    fetcher.mockClear();
    fireEvent.click(screen.getByRole('button', {name: 'Confirm'}));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
    expect(fetcher.mock.calls[0]).toEqual([
      `${baseUrl}/applications/app-1`,
      expect.objectContaining({method: 'DELETE'}),
    ]);
    await waitFor(() => expect(paths(fetcher)).toContain('GET /applications?limit=20&offset=0'));
  });

  it('shows a translated message instead of the server text when the server refuses', async () => {
    const fetcher: FetcherMock = vi
      .fn<ApiFetcher>()
      .mockResolvedValue(respond({code: 'APP-1', message: 'raw server detail'}, 403));

    renderWithProviders(<ApplicationDetails applicationId="app-1" />, {fetcher});

    expect((await screen.findByRole('alert')).textContent).not.toContain('raw server detail');
  });
});

describe('administration flows', () => {
  interface FlowServer {
    /**
     * The `flow` server-config section, as configured handle by key.
     */
    configured?: Record<string, string>;
    /**
     * The response of every other request, by path.
     */
    resources?: Record<string, unknown>;
  }

  /**
   * A fetcher that answers like the server: the flow configuration, the administration flow listing (one
   * flow per configured handle, with the id `id-<handle>`), flow execution, and the given resources.
   */
  const createFlowServer = ({configured = {}, resources = {}}: FlowServer = {}): FetcherMock =>
    vi.fn<ApiFetcher>().mockImplementation((url: string) => {
      const {pathname} = new URL(url);

      if (pathname === '/server-config/flow') {
        return Promise.resolve(
          respond({
            merged: Object.fromEntries(
              Object.entries(configured).map(([key, handle]: [string, string]) => [key, {defaultHandle: handle}]),
            ),
          }),
        );
      }
      if (pathname === '/flows') {
        return Promise.resolve(
          respond({
            flows: Object.values(configured).map((handle: string) => ({
              flowType: 'ADMINISTRATION',
              handle,
              id: `id-${handle}`,
            })),
          }),
        );
      }
      if (pathname === '/flow/execute') {
        return Promise.resolve(respond({data: {additionalData: {}}, flowStatus: 'COMPLETE'}));
      }
      if (pathname.endsWith('/groups') || pathname.endsWith('/roles')) {
        return Promise.resolve(respond({count: 0, groups: [], roles: [], startIndex: 1, totalResults: 0}));
      }

      return Promise.resolve(respond(resources[pathname] ?? {}));
    });

  const executions = (fetcher: FetcherMock): unknown[] =>
    fetcher.mock.calls
      .filter(([url]: [string, RequestInit]) => url === `${baseUrl}/flow/execute`)
      .map(([, init]: [string, RequestInit]) => JSON.parse(init.body as string) as unknown);

  const lockedUser: ManagedUser = {...users[0], status: {value: 'LOCKED'}};

  describe('BaseUserDetails', () => {
    it('shows the translated access status', () => {
      renderWithProviders(<BaseUserDetails user={lockedUser} />);

      expect(screen.getByText('Locked')).toBeTruthy();
    });

    it('offers no lifecycle actions without a handler', () => {
      renderWithProviders(<BaseUserDetails user={lockedUser} lifecycleActions={['unlock', 'suspend']} />);

      expect(screen.queryByRole('button', {name: 'Unlock'})).toBeNull();
      expect(screen.queryByRole('button', {name: 'Suspend'})).toBeNull();
    });

    it('unlocks straight away, and asks for confirmation and an optional note before suspending', () => {
      const onLifecycleAction: Mock = vi.fn();

      renderWithProviders(
        <BaseUserDetails
          user={lockedUser}
          lifecycleActions={['unlock', 'suspend']}
          onLifecycleAction={onLifecycleAction}
        />,
      );

      fireEvent.click(screen.getByRole('button', {name: 'Unlock'}));
      expect(onLifecycleAction).toHaveBeenLastCalledWith('unlock');

      fireEvent.click(screen.getByRole('button', {name: 'Suspend'}));
      expect(onLifecycleAction).toHaveBeenCalledOnce();
      const confirmation: HTMLElement = screen.getByRole('group', {name: /^Suspend Aiko Tanaka\?/});
      fireEvent.change(within(confirmation).getByLabelText('Note (optional)'), {target: {value: ' Ticket 4521 '}});
      fireEvent.click(within(confirmation).getByRole('button', {name: 'Suspend'}));

      expect(onLifecycleAction).toHaveBeenLastCalledWith('suspend', 'Ticket 4521');
    });

    it('hands custom details the lifecycle actions, for read-only users too', () => {
      const onLifecycleAction: Mock = vi.fn();
      const seen: {actions?: string[]; run?: unknown} = {};

      renderWithProviders(
        <BaseUserDetails
          user={{...lockedUser, isReadOnly: true}}
          lifecycleActions={['unlock']}
          onLifecycleAction={onLifecycleAction}
        >
          {({lifecycleActions, onLifecycleAction: run}): ReactNode => {
            seen.actions = lifecycleActions;
            seen.run = run;

            return null;
          }}
        </BaseUserDetails>,
      );

      expect(seen.actions).toEqual(['unlock']);
      expect(seen.run).toBe(onLifecycleAction);
    });
  });

  describe('UserDetails', () => {
    it('reads no flow configuration unless lifecycle actions are on', async () => {
      const fetcher: FetcherMock = createFlowServer({resources: {'/users/u-1': lockedUser}});

      renderWithProviders(<UserDetails userId="u-1" />, {fetcher});

      await screen.findByRole('heading', {name: 'Aiko Tanaka'});
      expect(fetcher.mock.calls.some(([url]: [string, RequestInit]) => url.includes('/server-config/'))).toBe(false);
    });

    it('says the account actions could not be loaded when the flow configuration cannot be read', async () => {
      const server: FetcherMock = createFlowServer({resources: {'/users/u-1': lockedUser}});
      const fetcher: FetcherMock = vi
        .fn<ApiFetcher>()
        .mockImplementation((url: string, init?: RequestInit) =>
          url.includes('/server-config/') ? Promise.resolve(respond({}, 500)) : server(url, init),
        );

      renderWithProviders(<UserDetails userId="u-1" lifecycleActions />, {fetcher});

      expect((await screen.findByRole('alert')).textContent).toBe('The account actions could not be loaded.');
      expect(screen.queryByRole('button', {name: 'Unlock'})).toBeNull();
    });

    it('offers only the actions whose flow is configured, and runs one through its flow', async () => {
      const fetcher: FetcherMock = createFlowServer({
        configured: {userUnlockFlow: 'unlock-user'},
        resources: {'/users/u-1': lockedUser},
      });

      renderWithProviders(<UserDetails userId="u-1" lifecycleActions />, {fetcher});

      fireEvent.click(await screen.findByRole('button', {name: 'Unlock'}));
      expect(screen.queryByRole('button', {name: 'Suspend'})).toBeNull();

      await waitFor(() => expect(executions(fetcher)).toEqual([{flowId: 'id-unlock-user', inputs: {subject: 'u-1'}}]));
    });

    it('deletes through the user deletion flow in flow mode', async () => {
      const fetcher: FetcherMock = createFlowServer({
        configured: {userDeletionFlow: 'delete-user'},
        resources: {'/users/u-1': users[0]},
      });
      const onDeleted: Mock = vi.fn();

      renderWithProviders(<UserDetails userId="u-1" deletable administrationMode="flow" onDeleted={onDeleted} />, {
        fetcher,
      });

      fireEvent.click(await screen.findByRole('button', {name: 'Delete user'}));
      fireEvent.click(screen.getByRole('button', {name: 'Confirm'}));

      await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
      expect(executions(fetcher)).toEqual([{flowId: 'id-delete-user', inputs: {subject: 'u-1'}}]);
      expect(fetcher.mock.calls.some(([, init]: [string, RequestInit]) => init?.method === 'DELETE')).toBe(false);
    });
  });

  it('removes a group member through the membership removal flow in flow mode', async () => {
    const fetcher: FetcherMock = createFlowServer({
      configured: {groupMembershipRemovalFlow: 'remove-member'},
      resources: {
        '/groups/g-1/members': {
          count: 1,
          members: [{display: 'Aiko Tanaka', id: 'u-1', type: 'user'}],
          startIndex: 1,
          totalResults: 1,
        },
      },
    });

    renderWithProviders(<GroupMembers groupId="g-1" editable administrationMode="flow" />, {fetcher});

    fireEvent.click(await screen.findByRole('button', {name: 'Remove Aiko Tanaka from the group'}));

    await waitFor(() => expect(executions(fetcher)).toHaveLength(1));
    expect(fetcher.mock.calls.some(([url]: [string, RequestInit]) => url.endsWith('/members/remove'))).toBe(false);
  });

  it('unsuspends an agent through its flow', async () => {
    const fetcher: FetcherMock = createFlowServer({
      configured: {agentSuspendFlow: 'suspend-agent', agentUnsuspendFlow: 'unsuspend-agent'},
      resources: {
        '/agents/a-1': {
          attributes: {name: 'Billing bot'},
          id: 'a-1',
          ouId: 'ou-1',
          status: {value: 'SUSPENDED'},
          type: 'bot',
        },
      },
    });

    renderWithProviders(<AgentDetails agentId="a-1" lifecycleActions />, {fetcher});

    expect(await screen.findByText('Suspended')).toBeTruthy();
    fireEvent.click(await screen.findByRole('button', {name: 'Unsuspend'}));
    expect(screen.queryByRole('button', {name: 'Suspend'})).toBeNull();
    fireEvent.click(
      within(screen.getByRole('group', {name: /^Unsuspend Billing bot\?/})).getByRole('button', {name: 'Unsuspend'}),
    );

    await waitFor(() =>
      expect(executions(fetcher)).toEqual([{flowId: 'id-unsuspend-agent', inputs: {subject: 'a-1'}}]),
    );
  });

  it('suspends an application without asking for an operator note', async () => {
    const fetcher: FetcherMock = createFlowServer({
      configured: {applicationSuspendFlow: 'suspend-app'},
      resources: {'/applications/app-1': {id: 'app-1', name: 'Portal', status: {value: 'ACTIVE'}}},
    });

    renderWithProviders(<ApplicationDetails applicationId="app-1" lifecycleActions />, {fetcher});

    fireEvent.click(await screen.findByRole('button', {name: 'Suspend'}));
    const confirmation: HTMLElement = screen.getByRole('group', {name: /^Suspend Portal\?/});
    expect(within(confirmation).queryByLabelText('Note (optional)')).toBeNull();
    fireEvent.click(within(confirmation).getByRole('button', {name: 'Suspend'}));

    await waitFor(() => expect(executions(fetcher)).toEqual([{flowId: 'id-suspend-app', inputs: {subject: 'app-1'}}]));
  });
});

describe('group and role details', () => {
  const page = {count: 0, startIndex: 1, totalResults: 0};
  const group = {description: 'First-line support', id: 'g-1', name: 'Support', ouHandle: 'engineering', ouId: 'ou-1'};
  const role = {
    description: 'Reads users',
    id: 'r-1',
    name: 'Viewer',
    ouId: 'ou-1',
    permissions: [{permissions: ['system:user:view'], resourceServerId: 'rs-1'}],
  };

  const createFetcher = (): FetcherMock =>
    vi.fn<ApiFetcher>().mockImplementation((url: string, init?: RequestInit) => {
      const {pathname} = new URL(url);

      if (init?.method === 'DELETE') {
        return Promise.resolve(respond(null, 204));
      }
      if (pathname === '/groups/g-1') {
        return Promise.resolve(respond(group));
      }
      if (pathname === '/roles/r-1') {
        return Promise.resolve(respond(role));
      }
      if (pathname === '/groups/g-1/members') {
        return Promise.resolve(
          respond({...page, count: 1, members: [{display: 'Aiko Tanaka', id: 'u-1', type: 'user'}]}),
        );
      }
      if (pathname === '/roles/r-1/assignments') {
        return Promise.resolve(respond({...page, assignments: [{display: 'Deploy bot', id: 'ag-1', type: 'agent'}]}));
      }
      if (pathname === '/groups/missing' || pathname === '/roles/missing') {
        return Promise.resolve(respond({code: 'NOT_FOUND'}, 404));
      }

      return Promise.resolve(respond({...page, agents: [], users: []}));
    });

  const paths = (fetcher: FetcherMock): string[] =>
    fetcher.mock.calls.map(([url]: [string, RequestInit]) => new URL(url).pathname);

  it('shows a group with its organization unit and members, and deletes it after confirmation', () => {
    const onDelete: Mock = vi.fn();

    renderWithProviders(<BaseGroupDetails group={group} members={<p>member list</p>} onDelete={onDelete} />);

    expect(screen.getByRole('heading', {level: 2, name: 'Support'})).toBeTruthy();
    expect(screen.getByText('First-line support')).toBeTruthy();
    expect(screen.getByText('engineering')).toBeTruthy();
    expect(screen.getByText('member list')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', {name: 'Delete group'}));
    fireEvent.click(
      within(screen.getByRole('group', {name: 'Delete Support?'})).getByRole('button', {name: 'Confirm'}),
    );
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('never offers to delete a read-only role', () => {
    const onDelete: Mock = vi.fn();
    const render: Mock = vi.fn().mockReturnValue(null);

    renderWithProviders(<BaseRoleDetails role={{...role, isReadOnly: true}} onDelete={onDelete} />);
    expect(screen.getByRole('heading', {level: 2, name: 'Viewer'})).toBeTruthy();
    expect(screen.queryByRole('button', {name: 'Delete role'})).toBeNull();

    cleanup();
    renderWithProviders(
      <BaseRoleDetails role={{...role, isReadOnly: true}} onDelete={onDelete}>
        {render}
      </BaseRoleDetails>,
    );
    const renderProps: BaseRoleDetailsRenderProps = render.mock.calls[0][0] as BaseRoleDetailsRenderProps;

    expect(renderProps.role?.name).toBe('Viewer');
    expect(renderProps.onDelete).toBeUndefined();
  });

  it('hands the group and its actions to a custom render', async () => {
    const fetcher: FetcherMock = createFetcher();
    const onDeleted: Mock = vi.fn();

    renderWithProviders(
      <GroupDetails groupId="g-1" deletable onDeleted={onDeleted}>
        {({group: loaded, onDelete}: BaseGroupDetailsRenderProps) => (
          <button type="button" onClick={onDelete}>
            Remove {loaded?.name}
          </button>
        )}
      </GroupDetails>,
      {fetcher},
    );

    fireEvent.click(await screen.findByRole('button', {name: 'Remove Support'}));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
    expect(fetcher).toHaveBeenCalledWith(`${baseUrl}/groups/g-1`, expect.objectContaining({method: 'DELETE'}));
    // A custom render replaces the members view too.
    expect(paths(fetcher)).not.toContain('/groups/g-1/members');
  });

  it('hands the role and its actions to a custom render', async () => {
    const fetcher: FetcherMock = createFetcher();

    renderWithProviders(
      <RoleDetails roleId="r-1">
        {({onDelete, role: loaded}: BaseRoleDetailsRenderProps) => (
          <p>
            {loaded?.name}: {onDelete ? 'deletable' : 'kept'}
          </p>
        )}
      </RoleDetails>,
      {fetcher},
    );

    expect(await screen.findByText('Viewer: kept')).toBeTruthy();
  });

  it('loads a group, then lists its members', async () => {
    const fetcher: FetcherMock = createFetcher();

    renderWithProviders(<GroupDetails groupId="g-1" />, {fetcher});

    expect(await screen.findByRole('heading', {level: 2, name: 'Support'})).toBeTruthy();
    expect(await screen.findByText('Aiko Tanaka')).toBeTruthy();
    expect(screen.queryByRole('button', {name: 'Delete group'})).toBeNull();
    expect(screen.queryByRole('button', {name: 'Add member'})).toBeNull();
  });

  it("lists candidates for a new member from the group's organization unit", async () => {
    const fetcher: FetcherMock = createFetcher();

    renderWithProviders(<GroupDetails groupId="g-1" editable />, {fetcher});

    await waitFor(() =>
      expect(
        fetcher.mock.calls.some(([url]: [string, RequestInit]) => {
          const {pathname, searchParams} = new URL(url);

          return pathname === '/users' && searchParams.get('filter') === 'ouId eq "ou-1"';
        }),
      ).toBe(true),
    );
  });

  it('loads a role once for its overview and permissions, and lists its assignments', async () => {
    const fetcher: FetcherMock = createFetcher();

    renderWithProviders(<RoleDetails roleId="r-1" deletable />, {fetcher});

    expect(await screen.findByRole('heading', {level: 2, name: 'Viewer'})).toBeTruthy();
    expect((await screen.findByRole('list', {name: 'rs-1'})).textContent).toContain('system:user:view');
    expect(await screen.findByText('Deploy bot')).toBeTruthy();
    expect(screen.getByRole('button', {name: 'Delete role'})).toBeTruthy();
    expect(paths(fetcher).filter((path: string) => path === '/roles/r-1')).toHaveLength(1);
  });

  it('says when the group or role cannot be loaded', async () => {
    const fetcher: FetcherMock = createFetcher();

    renderWithProviders(
      <>
        <GroupDetails groupId="missing" />
        <RoleDetails roleId="missing" />
      </>,
      {fetcher},
    );

    expect(await screen.findAllByRole('alert')).toHaveLength(2);
  });
});

describe('administrator-initiated email verification', () => {
  const person: ManagedUser = {
    attributes: {email: 'jane@example.com', given_name: 'Jane', mobile: '+94770000001'},
    display: 'Jane Doe',
    id: 'u-7',
    ouId: 'ou-1',
    type: 'Person',
    verifiedAttributes: {},
  };
  const verifiedPerson: ManagedUser = {...person, verifiedAttributes: {email: {verifiedAt: '2026-11-03T10:00:00Z'}}};
  const linkSent: unknown = {
    data: {additionalData: {channel: 'email', emailSent: 'true', maskedDestination: 'j***@example.com'}},
    flowStatus: 'INCOMPLETE',
    type: 'VIEW',
  };

  /**
   * Serves the user, an empty group list, the given answer to a flow start, and the `flow` server config
   * naming the verification flow (`null` leaves it unset).
   */
  const createServer = (
    user: ManagedUser,
    start: Response = respond(linkSent),
    configuredHandle: string | null = 'admin-verify',
  ): FetcherMock =>
    vi.fn<ApiFetcher>().mockImplementation((url: string) => {
      const {pathname} = new URL(url);
      if (pathname === '/server-config/flow') {
        return Promise.resolve(
          respond({
            merged: configuredHandle ? {adminAttributeVerificationFlow: {defaultHandle: configuredHandle}} : {},
          }),
        );
      }
      if (pathname === '/user-types') {
        return Promise.resolve(respond({count: 1, totalResults: 1, types: [{handle: user.type, id: 'type-1'}]}));
      }
      if (pathname === '/user-types/type-1') {
        return Promise.resolve(
          respond({
            handle: user.type,
            schema: {
              email: {type: 'email'},
              mobile: {type: 'mobile'},
              mobile_number: {type: 'mobile'},
              workEmail: {type: 'email'},
            },
          }),
        );
      }
      if (url === `${baseUrl}/flow/execute`) {
        return Promise.resolve(start);
      }

      return Promise.resolve(
        respond(url.includes('/groups') ? {count: 0, groups: [], startIndex: 1, totalResults: 0} : user),
      );
    });

  const configReads = (fetcher: FetcherMock): number =>
    fetcher.mock.calls.filter(([url]: [string, RequestInit]) => url.endsWith('/server-config/flow')).length;

  const flowStarts = (fetcher: FetcherMock): unknown[] =>
    fetcher.mock.calls
      .filter(([url]: [string, RequestInit]) => url === `${baseUrl}/flow/execute`)
      .map(([, init]: [string, RequestInit]) => JSON.parse(init.body as string) as unknown);

  describe('BaseUserDetails', () => {
    it('shows the email as not verified and sends a link for it', () => {
      const onSendVerification: Mock = vi.fn();

      renderWithProviders(<BaseUserDetails user={person} onSendVerification={onSendVerification} />);

      expect(screen.getByText('Unverified').previousElementSibling?.textContent).toBe('jane@example.com');
      fireEvent.click(screen.getByRole('button', {name: /^Verify /}));

      expect(onSendVerification).toHaveBeenCalledWith('email');
      // Only the email gets a status: the administrator flow sends email only.
      expect(screen.getAllByRole('button', {name: /^Verify /})).toHaveLength(1);
      expect(screen.queryByText('Verified')).toBeNull();
    });

    it('names the attribute in each send action for assistive technology', () => {
      const user: ManagedUser = {...person, attributes: {email: 'jane@example.com', workEmail: 'work@example.com'}};

      renderWithProviders(
        <BaseUserDetails
          user={user}
          userSchema={{email: {type: 'email'}, workEmail: {type: 'email'}}}
          onSendVerification={vi.fn()}
        />,
      );

      expect(screen.getByRole('button', {name: 'Verify email'}).textContent).toBe('Verify');
      expect(screen.getByRole('button', {name: 'Verify workEmail'})).toBeTruthy();
    });

    it('shows the spinner only on the row being sent', () => {
      const user: ManagedUser = {...person, attributes: {email: 'jane@example.com', workEmail: 'work@example.com'}};
      const userSchema: EntityTypeSchema = {email: {type: 'email'}, workEmail: {type: 'email'}};
      const {rerender} = renderWithProviders(
        <BaseUserDetails user={user} userSchema={userSchema} onSendVerification={vi.fn()} />,
      );

      fireEvent.click(screen.getByRole('button', {name: 'Verify workEmail'}));
      rerender(
        <BaseUserDetails user={user} userSchema={userSchema} onSendVerification={vi.fn()} isSendingVerification />,
      );

      expect(screen.getByRole('button', {name: 'Verify workEmail'}).className).toMatch(/button__loading/);
      expect(screen.getByRole('button', {name: 'Verify email'}).className).not.toMatch(/button__loading/);
      expect(screen.getByRole('button', {name: 'Verify email'})).toHaveProperty('disabled', true);
    });

    it('shows a verified email as verified, with nothing to send', () => {
      renderWithProviders(<BaseUserDetails user={verifiedPerson} onSendVerification={vi.fn()} />);

      expect(screen.getByText('Verified').previousElementSibling?.textContent).toBe('jane@example.com');
      expect(screen.queryByRole('button', {name: /^Verify /})).toBeNull();
    });

    it.each<[string, ManagedUser, (() => void) | undefined]>([
      ['the app has not turned it on', person, undefined],
      ['the user is read-only', {...person, isReadOnly: true}, vi.fn()],
    ])('offers no send when %s, but still shows the status', (_label, user, onSendVerification) => {
      renderWithProviders(<BaseUserDetails user={user} onSendVerification={onSendVerification} />);

      expect(screen.getByText('Unverified')).toBeTruthy();
      expect(screen.queryByRole('button', {name: /^Verify /})).toBeNull();
    });

    it('shows no status when the server does not report verification', () => {
      renderWithProviders(
        <BaseUserDetails user={{...person, verifiedAttributes: undefined}} onSendVerification={vi.fn()} />,
      );

      expect(screen.queryByText('Unverified')).toBeNull();
      expect(screen.queryByRole('button', {name: /^Verify /})).toBeNull();
    });

    it.each<[string, Record<string, unknown>, string]>([
      [
        'the masked destination',
        {channel: 'email', maskedDestination: 'j***@example.com'},
        'Verification link sent to j***@example.com.',
      ],
      ['no destination', {channel: 'email'}, 'Verification link sent.'],
    ])('confirms a sent link with %s', (_label, sentVerification, message) => {
      renderWithProviders(
        <BaseUserDetails
          user={person}
          onSendVerification={vi.fn()}
          sentVerification={sentVerification as BaseUserDetailsRenderProps['sentVerification']}
        />,
      );

      expect(screen.getByRole('status').textContent).toBe(message);
    });

    it.each([{isSendingVerification: true}, {isUpdating: true}])('disables send while busy (%j)', (busy) => {
      renderWithProviders(<BaseUserDetails user={person} onSendVerification={vi.fn()} {...busy} />);

      expect(screen.getByRole('button', {name: /^Verify /})).toHaveProperty('disabled', true);
    });

    it('hands a custom render the verification state and the send action', () => {
      const onSendVerification: Mock = vi.fn();
      const sentVerification: BaseUserDetailsRenderProps['sentVerification'] = {
        channel: 'email',
        maskedDestination: 'j***@example.com',
      };
      let seen: BaseUserDetailsRenderProps | undefined;

      renderWithProviders(
        <BaseUserDetails
          user={person}
          onSendVerification={onSendVerification}
          isSendingVerification
          sentVerification={sentVerification}
        >
          {(props: BaseUserDetailsRenderProps): ReactNode => {
            seen = props;

            return <button onClick={(): void => props.onSendVerification?.('email')}>Verify custom</button>;
          }}
        </BaseUserDetails>,
      );
      fireEvent.click(screen.getByRole('button', {name: 'Verify custom'}));

      expect(seen).toMatchObject({
        isSendingVerification: true,
        sentVerification,
        verifiableAttributes: ['email'],
        verifiedAttributes: {},
      });
      expect(onSendVerification).toHaveBeenCalledWith('email');
    });

    it('withholds the send from a custom render for a read-only user', () => {
      let seen: BaseUserDetailsRenderProps | undefined;

      renderWithProviders(
        <BaseUserDetails user={{...verifiedPerson, isReadOnly: true}} onSendVerification={vi.fn()}>
          {(props: BaseUserDetailsRenderProps): ReactNode => {
            seen = props;

            return null;
          }}
        </BaseUserDetails>,
      );

      expect(seen?.onSendVerification).toBeUndefined();
      expect(seen?.verifiedAttributes).toEqual({email: {verifiedAt: '2026-11-03T10:00:00Z'}});
    });
  });

  describe('UserDetails', () => {
    it('offers no send unless attribute verification is on', async () => {
      const fetcher: FetcherMock = createServer(person);

      renderWithProviders(<UserDetails userId="u-7" />, {fetcher});

      await screen.findByText('Unverified');
      expect(screen.queryByRole('button', {name: /^Verify /})).toBeNull();
    });

    it('starts the administrator-initiated flow and shows where the link went', async () => {
      const fetcher: FetcherMock = createServer(person);

      renderWithProviders(<UserDetails userId="u-7" attributeVerification />, {fetcher});
      fireEvent.click(await screen.findByRole('button', {name: /^Verify /}));

      expect(await screen.findByText('Verification link sent to j***@example.com.')).toBeTruthy();
      expect(flowStarts(fetcher)).toEqual([
        {
          flowType: 'ADMIN_INITIATED',
          handle: 'admin-verify',
          inputs: {attribute: 'email', subject: 'u-7'},
          verbose: true,
        },
      ]);
      expect(configReads(fetcher)).toBe(1);
    });

    it('offers no send when the server names no verification flow', async () => {
      const fetcher: FetcherMock = createServer(person, undefined, null);

      renderWithProviders(<UserDetails userId="u-7" attributeVerification />, {fetcher});

      await screen.findByText('Unverified');
      await waitFor(() => expect(configReads(fetcher)).toBe(1));
      await act(async () => {
        await Promise.all(fetcher.mock.results.map((result) => result.value as Promise<Response>));
      });
      expect(screen.queryByRole('button', {name: /^Verify /})).toBeNull();
      expect(flowStarts(fetcher)).toEqual([]);
    });

    it('offers no send, and says verification could not be loaded, when the server configuration cannot be read', async () => {
      const fetcher: FetcherMock = createServer(person);
      const server = fetcher.getMockImplementation()!;
      fetcher.mockImplementation((url: string, init?: RequestInit) =>
        url.endsWith('/server-config/flow') ? Promise.resolve(new Response('{}', {status: 500})) : server(url, init),
      );

      renderWithProviders(<UserDetails userId="u-7" attributeVerification />, {fetcher});

      await screen.findByText('Unverified');
      await waitFor(() => expect(configReads(fetcher)).toBeGreaterThan(0));
      await act(async () => {
        await Promise.allSettled(fetcher.mock.results.map((result) => result.value as Promise<Response>));
      });
      expect(await screen.findByText('The verification settings could not be loaded.')).toBeTruthy();
      expect(screen.queryByRole('button', {name: /^Verify /})).toBeNull();
    });

    it('reads no server configuration or user types unless attribute verification is on', async () => {
      const fetcher: FetcherMock = createServer(person);

      renderWithProviders(<UserDetails userId="u-7" />, {fetcher});

      await screen.findByText('Unverified');
      await act(async () => {
        await Promise.all(fetcher.mock.results.map((result) => result.value as Promise<Response>));
      });
      expect(
        fetcher.mock.calls.some(
          ([url]: [string, RequestInit]) => url.includes('/server-config/') || url.includes('/user-types'),
        ),
      ).toBe(false);
    });

    it('offers no send, and says verification could not be loaded, when the user type cannot be read', async () => {
      const fetcher: FetcherMock = createServer(person);
      const server = fetcher.getMockImplementation()!;
      fetcher.mockImplementation((url: string, init?: RequestInit) =>
        new URL(url).pathname === '/user-types'
          ? Promise.resolve(new Response('{}', {status: 500}))
          : server(url, init),
      );

      renderWithProviders(<UserDetails userId="u-7" attributeVerification />, {fetcher});

      expect(await screen.findByText('The verification settings could not be loaded.')).toBeTruthy();
      expect(screen.queryByRole('button', {name: /^Verify /})).toBeNull();
    });

    it('sends to a schema-defined work email and shows a verified mobile number', async () => {
      const user = {
        ...person,
        attributes: {mobile_number: '+94770000001', workEmail: 'work@example.com'},
        verifiedAttributes: {mobile_number: {verifiedAt: '2026-11-06T10:00:00Z'}},
      };
      const fetcher: FetcherMock = createServer(user);
      renderWithProviders(<UserDetails userId={user.id} attributeVerification />, {fetcher});

      const send = await screen.findByRole('button', {name: /^Verify /});
      expect(screen.getByText('Verified', {exact: true}).previousElementSibling?.textContent).toBe('+94770000001');
      fireEvent.click(send);

      await screen.findByText(/Verification link sent/);
      expect(flowStarts(fetcher)).toEqual([
        expect.objectContaining({inputs: {attribute: 'workEmail', subject: user.id}}),
      ]);
    });

    it('clears the delivery result when the displayed user changes', async () => {
      const fetcher: FetcherMock = createServer(person);
      const server = fetcher.getMockImplementation()!;
      fetcher.mockImplementation((url: string, init?: RequestInit) =>
        new URL(url).pathname.endsWith('/u-8')
          ? Promise.resolve(respond({...person, display: 'Another user', id: 'u-8'}))
          : server(url, init),
      );
      const {rerender} = renderWithProviders(<UserDetails userId="u-7" attributeVerification />, {fetcher});

      fireEvent.click(await screen.findByRole('button', {name: /^Verify /}));
      expect(await screen.findByText(/Verification link sent/)).toBeTruthy();

      rerender(<UserDetails userId="u-8" attributeVerification />);
      await screen.findByRole('heading', {name: 'Another user'});
      expect(screen.queryByText(/Verification link sent/)).toBeNull();
    });

    it.each<[string, Response, string]>([
      [
        'a refused step',
        respond({error: {code: 'FET-1114', message: {defaultValue: 'Suspended'}}, flowStatus: 'ERROR'}),
        'Could not send the verification link. Please try again.',
      ],
      [
        'an email that was not sent',
        respond({data: {additionalData: {channel: 'email', emailSent: 'false'}}, flowStatus: 'INCOMPLETE'}),
        'Could not send the verification link. Please try again.',
      ],
      ['a token without the permission', respond({code: 'FES-1019'}, 403), 'You do not have permission to do this.'],
    ])('shows a translated message for %s', async (_label, start, message) => {
      const fetcher: FetcherMock = createServer(person, start);

      renderWithProviders(<UserDetails userId="u-7" attributeVerification />, {fetcher});
      fireEvent.click(await screen.findByRole('button', {name: /^Verify /}));

      expect((await screen.findByRole('alert')).textContent).toBe(message);
      expect(screen.queryByText(/Verification link sent/)).toBeNull();
    });
  });
});
