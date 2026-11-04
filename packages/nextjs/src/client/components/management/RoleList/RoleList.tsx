// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {RoleList as ReactRoleList, RoleListProps as ReactRoleListProps} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type RoleListProps = ReactRoleListProps;

/**
 * Lists roles, a page at a time.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <RoleList onSelect={(role) => router.push(`/admin/roles/${role.id}`)} />
 * ```
 */
const RoleList: FC<RoleListProps> = (props: RoleListProps): ReactElement => <ReactRoleList {...props} />;

RoleList.displayName = 'RoleList';

export default RoleList;
