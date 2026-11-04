// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {RoleDetails as ReactRoleDetails, RoleDetailsProps as ReactRoleDetailsProps} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type RoleDetailsProps = ReactRoleDetailsProps;

/**
 * Shows a role with its permissions and assignments, and optionally manages the assignments and deletes the role.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <RoleDetails roleId={id} editable deletable onDeleted={() => router.push('/admin/roles')} />
 * ```
 */
const RoleDetails: FC<RoleDetailsProps> = (props: RoleDetailsProps): ReactElement => <ReactRoleDetails {...props} />;

RoleDetails.displayName = 'RoleDetails';

export default RoleDetails;
