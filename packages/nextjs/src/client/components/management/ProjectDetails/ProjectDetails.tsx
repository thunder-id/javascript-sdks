// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {ProjectDetails as ReactProjectDetails, ProjectDetailsProps as ReactProjectDetailsProps} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type ProjectDetailsProps = ReactProjectDetailsProps;

/**
 * Shows a project, and lets the signed-in user edit and delete it.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <ProjectDetails projectId={projectId} editable deletable onDeleted={() => router.push('/admin/projects')} />
 * ```
 */
const ProjectDetails: FC<ProjectDetailsProps> = (props: ProjectDetailsProps): ReactElement => (
  <ReactProjectDetails {...props} />
);

ProjectDetails.displayName = 'ProjectDetails';

export default ProjectDetails;
