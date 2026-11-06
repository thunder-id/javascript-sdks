// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {
  ProjectSwitcher as ReactProjectSwitcher,
  ProjectSwitcherProps as ReactProjectSwitcherProps,
} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type ProjectSwitcherProps = ReactProjectSwitcherProps;

/**
 * Lets the user choose the current project. The choice is client-side context kept in the browser, not a sign-in: `useThunderID()` exposes it as `currentProject`.
 * `ApplicationList` and `AgentList` list the current project, and `ApplicationCreate` and `AgentCreate` place new
 * resources in it when no organization unit is given.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <ProjectSwitcher onSelect={(project) => router.refresh()} />
 * ```
 */
const ProjectSwitcher: FC<ProjectSwitcherProps> = (props: ProjectSwitcherProps): ReactElement => (
  <ReactProjectSwitcher {...props} />
);

ProjectSwitcher.displayName = 'ProjectSwitcher';

export default ProjectSwitcher;
