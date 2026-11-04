// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {
  OrganizationUnitDetails as ReactOrganizationUnitDetails,
  OrganizationUnitDetailsProps as ReactOrganizationUnitDetailsProps,
} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type OrganizationUnitDetailsProps = ReactOrganizationUnitDetailsProps;

/**
 * Shows an organization unit with its child units and the users, groups and roles in it, and lets the signed-in user edit and delete it.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <OrganizationUnitDetails organizationUnitId={unitId} editable deletable />
 * ```
 */
const OrganizationUnitDetails: FC<OrganizationUnitDetailsProps> = (
  props: OrganizationUnitDetailsProps,
): ReactElement => <ReactOrganizationUnitDetails {...props} />;

OrganizationUnitDetails.displayName = 'OrganizationUnitDetails';

export default OrganizationUnitDetails;
