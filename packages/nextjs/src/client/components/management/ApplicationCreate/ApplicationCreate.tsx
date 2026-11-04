// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {
  ApplicationCreate as ReactApplicationCreate,
  ApplicationCreateProps as ReactApplicationCreateProps,
} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type ApplicationCreateProps = ReactApplicationCreateProps;

/**
 * Creates an application with an OAuth client, and shows its client secret once when the server
 * returns one.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <ApplicationCreate onCreated={(application) => router.push(`/admin/applications/${application.id}`)} />
 * ```
 */
const ApplicationCreate: FC<ApplicationCreateProps> = (props: ApplicationCreateProps): ReactElement => (
  <ReactApplicationCreate {...props} />
);

ApplicationCreate.displayName = 'ApplicationCreate';

export default ApplicationCreate;
