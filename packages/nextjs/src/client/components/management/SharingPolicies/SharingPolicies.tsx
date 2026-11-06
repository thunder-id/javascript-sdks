// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {
  SharingPolicies as ReactSharingPolicies,
  SharingPoliciesProps as ReactSharingPoliciesProps,
} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type SharingPoliciesProps = ReactSharingPoliciesProps;

/**
 * Lists the sharing policies of a user, an application, a role or a flow, and lets the signed-in user manage them when `editable`.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <SharingPolicies resourceType="role" resourceId={roleId} editable />
 * ```
 */
const SharingPolicies: FC<SharingPoliciesProps> = (props: SharingPoliciesProps): ReactElement => (
  <ReactSharingPolicies {...props} />
);

SharingPolicies.displayName = 'SharingPolicies';

export default SharingPolicies;
