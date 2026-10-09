// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {BaseUserSelect, BaseUserSelectProps} from '@thunderid/react';
import {FC} from 'react';
import fetchUsersFromServer from '../../../fetchUsersFromServer';

export type UserSelectProps = Omit<BaseUserSelectProps, 'fetchUsers'>;

/**
 * Single-user picker for signed-in screens. Users load through a server action that uses the
 * signed-in user's server-held session, so the access token never reaches the browser. It takes no
 * data source; for a custom one use `PagedSelect`.
 */
const UserSelect: FC<UserSelectProps> = (props: UserSelectProps) => (
  <BaseUserSelect {...props} fetchUsers={fetchUsersFromServer} />
);

export default UserSelect;
