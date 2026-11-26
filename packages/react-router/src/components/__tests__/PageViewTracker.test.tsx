// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, render, waitFor} from '@testing-library/react';
import {ReactElement} from 'react';
import {MemoryRouter, Outlet, Route, RouterProvider, Routes, createMemoryRouter, useNavigate} from 'react-router';
import {Mock, afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import PageViewTracker from '../PageViewTracker';

interface Mocks {
  isInitialized: boolean;
  telemetry: {trackPageView: (pattern: string) => void};
  trackPageView: Mock<(pattern: string) => void>;
}

const mocks: Mocks = vi.hoisted(() => ({}) as Mocks);

vi.mock('@thunderid/react', () => ({
  useThunderID: (): {isInitialized: boolean; telemetry: {trackPageView: (pattern: string) => void}} => ({
    isInitialized: mocks.isInitialized,
    telemetry: mocks.telemetry,
  }),
}));

const Layout = (): ReactElement => (
  <>
    <PageViewTracker />
    <Outlet />
  </>
);

const GoToApp = (): ReactElement => {
  const navigate: ReturnType<typeof useNavigate> = useNavigate();
  return (
    <button type="button" onClick={(): void => void navigate('/organizations/acme/applications/a1')}>
      go
    </button>
  );
};

describe('PageViewTracker', () => {
  beforeEach(() => {
    mocks.isInitialized = true;
    mocks.trackPageView = vi.fn();
    // One provider's telemetry, the same on every render.
    mocks.telemetry = {trackPageView: (pattern: string): void => mocks.trackPageView(pattern)};
  });

  afterEach(() => {
    cleanup();
  });

  it('reports the full pattern of the page from a layout, with a data router, once per navigation', async () => {
    const router: ReturnType<typeof createMemoryRouter> = createMemoryRouter(
      [
        {
          children: [
            {element: <GoToApp />, path: 'applications'},
            {
              element: (
                <>
                  <PageViewTracker />
                  <span>app</span>
                </>
              ),
              path: 'applications/:id',
            },
          ],
          element: <Layout />,
          path: '/organizations/:org',
        },
      ],
      {initialEntries: ['/organizations/acme/applications']},
    );
    const {getByRole} = render(<RouterProvider router={router} />);

    await waitFor(() => expect(mocks.trackPageView).toHaveBeenCalledWith('/organizations/:org/applications'));
    getByRole('button').click();
    await waitFor(() => expect(mocks.trackPageView).toHaveBeenLastCalledWith('/organizations/:org/applications/:id'));
    expect(mocks.trackPageView).toHaveBeenCalledTimes(2);
  });

  it('reports the nested page from a tracker in a layout, with <Routes>', async () => {
    const LayoutWithTracker = (): ReactElement => (
      <>
        <PageViewTracker />
        <Outlet />
      </>
    );
    render(
      <MemoryRouter initialEntries={['/groups/g1']}>
        <Routes>
          <Route path="/" element={<LayoutWithTracker />}>
            <Route path="groups" element={<span>groups</span>} />
            <Route path="groups/:groupId" element={<span>group</span>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(mocks.trackPageView).toHaveBeenCalledWith('/groups/:groupId'));
    expect(mocks.trackPageView).toHaveBeenCalledTimes(1);
  });

  it('reports the pattern of the route it is rendered in, with <Routes>', async () => {
    render(
      <MemoryRouter initialEntries={['/organizations/acme/users/u1']}>
        <Routes>
          <Route path="/organizations/:org">
            <Route
              path="users/:id"
              element={
                <>
                  <PageViewTracker />
                  <span>user</span>
                </>
              }
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(mocks.trackPageView).toHaveBeenCalledWith('/organizations/:org/users/:id'));
  });
  it('reports the first page once the provider is initialized', async () => {
    mocks.isInitialized = false;
    const view = (): ReactElement => (
      <MemoryRouter initialEntries={['/groups']}>
        <Routes>
          <Route
            path="/groups"
            element={
              <>
                <PageViewTracker />
                <span>groups</span>
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    );
    const {rerender} = render(view());
    expect(mocks.trackPageView).not.toHaveBeenCalled();
    mocks.isInitialized = true;
    rerender(view());
    await waitFor(() => expect(mocks.trackPageView).toHaveBeenCalledWith('/groups'));
    expect(mocks.trackPageView).toHaveBeenCalledTimes(1);
  });
  it('reports a page again when coming back to it through a route without a tracker', async () => {
    const router: ReturnType<typeof createMemoryRouter> = createMemoryRouter(
      [
        {
          element: (
            <>
              <PageViewTracker />
              <span>applications</span>
            </>
          ),
          path: '/applications',
        },
        {element: <span>public</span>, path: '/public'},
      ],
      {initialEntries: ['/applications']},
    );
    render(<RouterProvider router={router} />);
    await waitFor(() => expect(mocks.trackPageView).toHaveBeenCalledTimes(1));
    await router.navigate('/public');
    await waitFor(() => expect(document.body.textContent).toContain('public'));
    await router.navigate(-1);
    await waitFor(() => expect(mocks.trackPageView).toHaveBeenCalledTimes(2));
    expect(mocks.trackPageView).toHaveBeenLastCalledWith('/applications');
  });
});
