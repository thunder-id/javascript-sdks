// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {
  ApplicationDetails as ReactApplicationDetails,
  ApplicationDetailsProps as ReactApplicationDetailsProps,
} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type ApplicationDetailsProps = ReactApplicationDetailsProps;

/**
 * Shows an application and its OAuth configuration, and optionally edits it, regenerates its client
 * secret or deletes it.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <ApplicationDetails applicationId={id} editable deletable onDeleted={() => router.push('/admin/applications')} />
 * ```
 */
const ApplicationDetails: FC<ApplicationDetailsProps> = (props: ApplicationDetailsProps): ReactElement => (
  <ReactApplicationDetails {...props} />
);

ApplicationDetails.displayName = 'ApplicationDetails';

export default ApplicationDetails;
