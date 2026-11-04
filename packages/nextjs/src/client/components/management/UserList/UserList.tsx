// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {UserList as ReactUserList, UserListProps as ReactUserListProps} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type UserListProps = ReactUserListProps;

/**
 * Lists the users the signed-in user is allowed to see, a page at a time.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <UserList onSelect={(user) => router.push(`/admin/users/${user.id}`)} />
 * ```
 */
const UserList: FC<UserListProps> = (props: UserListProps): ReactElement => <ReactUserList {...props} />;

UserList.displayName = 'UserList';

export default UserList;
