// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {RoleCreate as ReactRoleCreate, RoleCreateProps as ReactRoleCreateProps} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type RoleCreateProps = ReactRoleCreateProps;

/**
 * Creates a role.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <RoleCreate onCreated={(role) => router.push(`/admin/roles/${role.id}`)} />
 * ```
 */
const RoleCreate: FC<RoleCreateProps> = (props: RoleCreateProps): ReactElement => <ReactRoleCreate {...props} />;

RoleCreate.displayName = 'RoleCreate';

export default RoleCreate;
