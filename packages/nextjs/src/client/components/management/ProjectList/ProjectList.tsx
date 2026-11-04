// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {ProjectList as ReactProjectList, ProjectListProps as ReactProjectListProps} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type ProjectListProps = ReactProjectListProps;

/**
 * Lists the projects, a page at a time. Projects are served by the control plane only.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <ProjectList onSelect={(project) => router.push(`/admin/projects/${project.id}`)} />
 * ```
 */
const ProjectList: FC<ProjectListProps> = (props: ProjectListProps): ReactElement => <ReactProjectList {...props} />;

ProjectList.displayName = 'ProjectList';

export default ProjectList;
