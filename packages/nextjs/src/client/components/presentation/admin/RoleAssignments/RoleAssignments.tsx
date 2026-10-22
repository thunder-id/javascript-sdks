// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {RoleAssignments as ReactRoleAssignments, RoleAssignmentsProps as ReactRoleAssignmentsProps} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type RoleAssignmentsProps = ReactRoleAssignmentsProps;

/**
 * Lists a role's assignments and assigns or unassigns users, groups and agents.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <RoleAssignments roleId={id} />
 * ```
 */
const RoleAssignments: FC<RoleAssignmentsProps> = (props: RoleAssignmentsProps): ReactElement => <ReactRoleAssignments {...props} />;

RoleAssignments.displayName = 'RoleAssignments';

export default RoleAssignments;
