// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {UserDetails as ReactUserDetails, UserDetailsProps as ReactUserDetailsProps} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type UserDetailsProps = ReactUserDetailsProps;

/**
 * Shows a user's attributes and groups, and optionally edits or deletes the user.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <UserDetails userId={id} editable deletable onDeleted={() => router.push('/admin/users')} />
 * ```
 */
const UserDetails: FC<UserDetailsProps> = (props: UserDetailsProps): ReactElement => <ReactUserDetails {...props} />;

UserDetails.displayName = 'UserDetails';

export default UserDetails;
