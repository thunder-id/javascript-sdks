// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {RolePermissions as ReactRolePermissions, RolePermissionsProps as ReactRolePermissionsProps} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type RolePermissionsProps = ReactRolePermissionsProps;

/**
 * Shows the permissions a role grants.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <RolePermissions roleId={id} />
 * ```
 */
const RolePermissions: FC<RolePermissionsProps> = (props: RolePermissionsProps): ReactElement => <ReactRolePermissions {...props} />;

RolePermissions.displayName = 'RolePermissions';

export default RolePermissions;
