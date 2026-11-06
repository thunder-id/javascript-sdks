// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {ProjectCreate as ReactProjectCreate, ProjectCreateProps as ReactProjectCreateProps} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type ProjectCreateProps = ReactProjectCreateProps;

/**
 * Creates a project.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <ProjectCreate onCreated={(project) => router.push(`/admin/projects/${project.id}`)} />
 * ```
 */
const ProjectCreate: FC<ProjectCreateProps> = (props: ProjectCreateProps): ReactElement => (
  <ReactProjectCreate {...props} />
);

ProjectCreate.displayName = 'ProjectCreate';

export default ProjectCreate;
