// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {Preferences} from '@thunderid/browser';
import {ReactElement} from 'react';
import {RouteObject} from 'react-router';
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
  preferences?: Preferences;
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
 * Builds React Router route objects that mount the admin (management) sections of
 * `@thunderid/react`: for each section a list at `<section>`, a create form at `<section>/new`, and a
 * details page at `<section>/:id`. Selecting, creating and deleting navigate between them.
 *
 * The paths are relative, so the routes can be nested under any parent route.
 *
 * @param options - Which sections to mount and how to render them.
 * @returns Route objects to use as the children of a parent route, or with `useRoutes`.
 *
 * @example
 * ```tsx
 * const router = createBrowserRouter([
 *   {path: '/', element: <Home />},
 *   {path: '/admin', children: createAdminRoutes({protect: {redirectTo: '/signin'}, deletable: true})},
 * ]);
 * ```
 *
 * @example With `<Routes>`
 * ```tsx
 * const AdminRoutes = () => useRoutes(createAdminRoutes({sections: ['users', 'groups']}));
 *
 * <Route path="/admin/*" element={<AdminRoutes />} />
 * ```
 */
const createAdminRoutes = (options: AdminRoutesOptions = {}): RouteObject[] => {
  const {protect, sections = DEFAULT_SECTIONS} = options;

  const page = (section: AdminSection, kind: AdminPageKind): ReactElement => {
    const element: ReactElement = <AdminPage kind={kind} options={options} section={section} />;

    return protect ? <ProtectedRoute {...protect}>{element}</ProtectedRoute> : element;
  };

  return sections.map(
    (section: AdminSection): RouteObject => ({
      children: [
        {element: page(section, 'list'), index: true},
        {element: page(section, 'create'), path: 'new'},
        {element: page(section, 'details'), path: ':id'},
      ],
      path: section,
    }),
  );
};

export default createAdminRoutes;
