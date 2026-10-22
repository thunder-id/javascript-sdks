// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {ReactElement, ReactNode} from 'react';
import {RouterProvider, createMemoryRouter} from 'react-router';
import {afterEach, describe, expect, it, vi} from 'vitest';
import createAdminRoutes, {AdminRoutesOptions} from '../createAdminRoutes';

interface StubProps {
  actions?: ReactNode;
  agentId?: string;
  deletable?: boolean;
  editable?: boolean;
  groupId?: string;
  onCreated?: (resource: {id: string}) => void;
  onDeleted?: () => void;
  onSelect?: (resource: {id: string}) => void;
  roleId?: string;
  userId?: string;
}

const mocks: {isSignedIn: boolean} = vi.hoisted(() => ({isSignedIn: true}));

vi.mock('@thunderid/browser', () => ({
  createPackageComponentLogger: () => ({error: (): void => undefined}),
}));

vi.mock('@thunderid/react', () => {
  // Each admin component becomes a stub that shows what it was given and exposes its callbacks as buttons.
  const stub =
    (name: string) =>
    // eslint-disable-next-line react/display-name, react/require-default-props
    ({actions, onCreated, onDeleted, onSelect, ...rest}: StubProps): ReactElement => (
      <div data-testid={name} data-props={JSON.stringify(rest)}>
        {actions}
        {onSelect && <button onClick={(): void => onSelect({id: 'id/1'})}>select</button>}
        {onCreated && <button onClick={(): void => onCreated({id: 'new-1'})}>created</button>}
        {onDeleted && <button onClick={(): void => onDeleted()}>deleted</button>}
      </div>
    );

  return {
    AgentCreate: stub('AgentCreate'),
    AgentDetails: stub('AgentDetails'),
    AgentList: stub('AgentList'),
    Button: ({children, onClick}: {children: ReactNode; onClick: () => void}): ReactElement => (
      <button onClick={onClick}>{children}</button>
    ),
    GroupCreate: stub('GroupCreate'),
    GroupList: stub('GroupList'),
    GroupMembers: stub('GroupMembers'),
    RoleAssignments: stub('RoleAssignments'),
    RoleCreate: stub('RoleCreate'),
    RoleList: stub('RoleList'),
    RolePermissions: stub('RolePermissions'),
    ThunderIDRuntimeError: class extends Error {},
    UserCreate: stub('UserCreate'),
    UserDetails: stub('UserDetails'),
    UserList: stub('UserList'),
    navigate: (): void => undefined,
    useThunderID: () => ({isLoading: false, isSignedIn: mocks.isSignedIn, signIn: () => Promise.resolve()}),
    useTranslation: () => ({t: (key: string): string => key}),
  };
});

const renderAdmin = (initialPath: string, options?: AdminRoutesOptions): ReturnType<typeof createMemoryRouter> => {
  const router: ReturnType<typeof createMemoryRouter> = createMemoryRouter(
    [
      {element: <div data-testid="signin" />, path: '/signin'},
      {children: createAdminRoutes(options), path: '/admin'},
    ],
    {initialEntries: [initialPath]},
  );

  render(<RouterProvider router={router} />);

  return router;
};

const propsOf = (testId: string): Record<string, unknown> =>
  JSON.parse(screen.getByTestId(testId).getAttribute('data-props') ?? '{}') as Record<string, unknown>;

describe('createAdminRoutes', () => {
  afterEach(() => {
    cleanup();
    mocks.isSignedIn = true;
  });

  it('mounts a list, create and details route for every section by default', () => {
    const routes = createAdminRoutes();

    expect(routes.map((route) => route.path)).toEqual(['users', 'groups', 'roles', 'agents']);
    expect(routes[0].children?.map((route) => route.path ?? 'index')).toEqual(['index', 'new', ':id']);
  });

  it('mounts only the requested sections', () => {
    expect(createAdminRoutes({sections: ['roles']}).map((route) => route.path)).toEqual(['roles']);
  });

  it('opens the details page when a list row is selected, keeping the identifier encoded', async () => {
    const router = renderAdmin('/admin/users');

    fireEvent.click(screen.getByText('select'));

    expect(await screen.findByTestId('UserDetails')).toBeDefined();
    expect(router.state.location.pathname).toBe('/admin/users/id%2F1');
    expect(propsOf('UserDetails')).toMatchObject({userId: 'id/1'});
  });

  it('opens the create form from the list action', async () => {
    const router = renderAdmin('/admin/groups');

    fireEvent.click(screen.getByText('admin.groups.create.title'));

    expect(await screen.findByTestId('GroupCreate')).toBeDefined();
    expect(router.state.location.pathname).toBe('/admin/groups/new');
  });

  it('opens the new resource after it is created', async () => {
    const router = renderAdmin('/admin/agents/new');

    fireEvent.click(screen.getByText('created'));

    expect(await screen.findByTestId('AgentDetails')).toBeDefined();
    expect(router.state.location.pathname).toBe('/admin/agents/new-1');
  });

  it('returns to the list after a delete', async () => {
    const router = renderAdmin('/admin/users/u-1', {deletable: true});

    expect(propsOf('UserDetails')).toMatchObject({deletable: true, userId: 'u-1'});

    fireEvent.click(screen.getByText('deleted'));

    expect(await screen.findByTestId('UserList')).toBeDefined();
    expect(router.state.location.pathname).toBe('/admin/users');
  });

  it("renders a role's permissions and assignments on its details page", () => {
    renderAdmin('/admin/roles/r-1', {editable: false});

    expect(propsOf('RolePermissions')).toMatchObject({roleId: 'r-1'});
    expect(propsOf('RoleAssignments')).toMatchObject({editable: false, roleId: 'r-1'});
  });

  it('renders the group members on the group details page', () => {
    renderAdmin('/admin/groups/g-1');

    expect(propsOf('GroupMembers')).toMatchObject({groupId: 'g-1'});
  });

  it('guards every page with ProtectedRoute when asked to', async () => {
    mocks.isSignedIn = false;

    const router = renderAdmin('/admin/users', {protect: {redirectTo: '/signin'}});

    expect(await screen.findByTestId('signin')).toBeDefined();
    expect(router.state.location.pathname).toBe('/signin');
    expect(screen.queryByTestId('UserList')).toBeNull();
  });
});
