// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {
  ApplicationList as ReactApplicationList,
  ApplicationListProps as ReactApplicationListProps,
} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type ApplicationListProps = ReactApplicationListProps;

/**
 * Lists applications, a page at a time.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <ApplicationList onSelect={(application) => router.push(`/admin/applications/${application.id}`)} />
 * ```
 */
const ApplicationList: FC<ApplicationListProps> = (props: ApplicationListProps): ReactElement => (
  <ReactApplicationList {...props} />
);

ApplicationList.displayName = 'ApplicationList';

export default ApplicationList;
