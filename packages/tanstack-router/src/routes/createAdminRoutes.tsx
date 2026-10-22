// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AnyRoute, createRoute} from '@tanstack/react-router';
import type {UserListProps} from '@thunderid/react';
import {ReactElement} from 'react';
import AdminPage, {AdminPageKind} from './AdminPage';
import ProtectedRoute, {ProtectedRouteProps} from '../components/ProtectedRoute';

/**
 * An admin section that {@link createAdminRoutes} can mount.
 */
export type AdminSection = 'agents' | 'groups' | 'roles' | 'users';

/**
 * Options for {@link createAdminRoutes}.
 */
export interface AdminRoutesOptions {
  /**
   * Shows the delete action on the user and agent details pages.
   * @default false
   */
  deletable?: boolean;
  /**
   * Allows editing on the details pages: user attributes, group members and role assignments. When
   * unset, each component keeps its own default.
   */
  editable?: boolean;
  /**
   * Passed to every admin component.
   */
  preferences?: UserListProps['preferences'];
  /**
   * Wraps every admin page in {@link ProtectedRoute} with these props. The management API still
   * checks every request, so this only decides what an unauthenticated visitor sees.
   */
  protect?: Omit<ProtectedRouteProps, 'children'>;
  /**
   * The sections to mount.
   * @default ['users', 'groups', 'roles', 'agents']
   */
  sections?: AdminSection[];
}

const DEFAULT_SECTIONS: AdminSection[] = ['users', 'groups', 'roles', 'agents'];

/**
 * Builds TanStack Router routes that mount the admin (management) sections of `@thunderid/react`
 * under `parentRoute`: for each section a list at `<section>`, a create form at `<section>/new`, and
 * a details page at `<section>/$id`. Selecting, creating and deleting navigate between them.
 *
 * The routes are built with `createRoute`, so they carry no route-tree types of their own; navigate
 * to them with string paths.
 *
 * @param parentRoute - The route to mount the sections under, such as the root route or an `/admin` route.
 * @param options - Which sections to mount and how to render them.
 * @returns One route per section, each with its pages as children, for `parentRoute.addChildren`.
 *
 * @example
 * ```tsx
 * const adminRoute = createRoute({getParentRoute: () => rootRoute, path: '/admin'});
 *
 * const routeTree = rootRoute.addChildren([
 *   indexRoute,
 *   adminRoute.addChildren(createAdminRoutes(adminRoute, {protect: {redirectTo: '/signin'}})),
 * ]);
 * ```
 */
const createAdminRoutes = (parentRoute: AnyRoute, options: AdminRoutesOptions = {}): AnyRoute[] => {
  const {protect, sections = DEFAULT_SECTIONS} = options;

  return sections.map((section: AdminSection): AnyRoute => {
    const sectionRoute: AnyRoute = createRoute({getParentRoute: () => parentRoute, path: section});

    const page = (kind: AdminPageKind): (() => ReactElement) => {
      const Page = (): ReactElement => {
        const element: ReactElement = (
          <AdminPage
            getSectionPath={(): string => sectionRoute.fullPath as string}
            kind={kind}
            options={options}
            section={section}
          />
        );

        return protect ? <ProtectedRoute {...protect}>{element}</ProtectedRoute> : element;
      };

      Page.displayName = `Admin(${section}/${kind})`;

      return Page;
    };

    return sectionRoute.addChildren([
      createRoute({component: page('list'), getParentRoute: () => sectionRoute, path: '/'}),
      createRoute({component: page('create'), getParentRoute: () => sectionRoute, path: 'new'}),
      createRoute({component: page('details'), getParentRoute: () => sectionRoute, path: '$id'}),
    ]) as AnyRoute;
  });
};

export default createAdminRoutes;
