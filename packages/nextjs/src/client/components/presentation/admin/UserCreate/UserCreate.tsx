// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {UserCreate as ReactUserCreate, UserCreateProps as ReactUserCreateProps} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type UserCreateProps = ReactUserCreateProps;

/**
 * Creates a user, or invites one with `mode="invite"`.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <UserCreate onCreated={(user) => router.push(`/admin/users/${user.id}`)} />
 * ```
 */
const UserCreate: FC<UserCreateProps> = (props: UserCreateProps): ReactElement => <ReactUserCreate {...props} />;

UserCreate.displayName = 'UserCreate';

export default UserCreate;
