// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AnyRoute,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {ReactElement, ReactNode} from 'react';
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

type TestRouter = ReturnType<typeof createRouter>;

const buildTree = (options?: AdminRoutesOptions): {adminRoute: AnyRoute; rootRoute: AnyRoute; routeTree: AnyRoute} => {
  const rootRoute: AnyRoute = createRootRoute();
  const signInRoute: AnyRoute = createRoute({
    component: (): ReactElement => <div data-testid="signin" />,
    getParentRoute: () => rootRoute,
    path: '/signin',
  });
  const adminRoute: AnyRoute = createRoute({getParentRoute: () => rootRoute, path: '/admin'});
  const routeTree: AnyRoute = rootRoute.addChildren([
    signInRoute,
    adminRoute.addChildren(createAdminRoutes(adminRoute, options)),
  ]);

  return {adminRoute, rootRoute, routeTree};
};

const renderAdmin = async (initialPath: string, options?: AdminRoutesOptions): Promise<TestRouter> => {
  const router: TestRouter = createRouter({
    history: createMemoryHistory({initialEntries: [initialPath]}),
    routeTree: buildTree(options).routeTree,
  });

  await router.load();
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
    const {adminRoute} = buildTree();
    const routes: AnyRoute[] = createAdminRoutes(adminRoute);

    expect(routes.map((route: AnyRoute) => route.options.path as string)).toEqual([
      'users',
      'groups',
      'roles',
      'agents',
    ]);
    expect((routes[0].children as AnyRoute[]).map((route: AnyRoute) => route.options.path as string)).toEqual([
      '/',
      'new',
      '$id',
    ]);
  });

  it('mounts only the requested sections', () => {
    const {adminRoute} = buildTree();

    expect(
      createAdminRoutes(adminRoute, {sections: ['roles']}).map((route: AnyRoute) => route.options.path as string),
    ).toEqual(['roles']);
  });

  it('opens the details page when a list row is selected, keeping the identifier encoded', async () => {
    const router = await renderAdmin('/admin/users');

    fireEvent.click(await screen.findByText('select'));

    expect(await screen.findByTestId('UserDetails')).toBeDefined();
    expect(router.state.location.pathname).toBe('/admin/users/id%2F1');
    expect(propsOf('UserDetails')).toMatchObject({userId: 'id/1'});
  });

  it('opens the create form from the list action', async () => {
    const router = await renderAdmin('/admin/groups');

    fireEvent.click(await screen.findByText('admin.groups.create.title'));

    expect(await screen.findByTestId('GroupCreate')).toBeDefined();
    expect(router.state.location.pathname).toBe('/admin/groups/new');
  });

  it('opens the new resource after it is created', async () => {
    const router = await renderAdmin('/admin/agents/new');

    fireEvent.click(await screen.findByText('created'));

    expect(await screen.findByTestId('AgentDetails')).toBeDefined();
    expect(router.state.location.pathname).toBe('/admin/agents/new-1');
  });

  it('returns to the list after a delete', async () => {
    const router = await renderAdmin('/admin/users/u-1', {deletable: true});

    await screen.findByTestId('UserDetails');

    expect(propsOf('UserDetails')).toMatchObject({deletable: true, userId: 'u-1'});

    fireEvent.click(screen.getByText('deleted'));

    expect(await screen.findByTestId('UserList')).toBeDefined();
    expect(router.state.location.pathname).toBe('/admin/users');
  });

  it("renders a role's permissions and assignments on its details page", async () => {
    await renderAdmin('/admin/roles/r-1', {editable: false});

    await screen.findByTestId('RolePermissions');

    expect(propsOf('RolePermissions')).toMatchObject({roleId: 'r-1'});
    expect(propsOf('RoleAssignments')).toMatchObject({editable: false, roleId: 'r-1'});
  });

  it('renders the group members on the group details page', async () => {
    await renderAdmin('/admin/groups/g-1');

    await screen.findByTestId('GroupMembers');

    expect(propsOf('GroupMembers')).toMatchObject({groupId: 'g-1'});
  });

  it('guards every page with ProtectedRoute when asked to', async () => {
    mocks.isSignedIn = false;

    const router = await renderAdmin('/admin/users', {protect: {redirectTo: '/signin'}});

    expect(await screen.findByTestId('signin')).toBeDefined();
    expect(router.state.location.pathname).toBe('/signin');
    expect(screen.queryByTestId('UserList')).toBeNull();
  });
});
