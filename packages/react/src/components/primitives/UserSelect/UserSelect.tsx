// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {FC} from 'react';
import BaseUserSelect, {BaseUserSelectProps} from './BaseUserSelect';
import useFetchUsers from '../../../hooks/useFetchUsers';

export type UserSelectProps = Omit<BaseUserSelectProps, 'fetchUsers'>;

/**
 * Single-user picker for signed-in screens. It loads the user directory itself with the signed-in
 * user's access token and submits the chosen user's ID, so it takes no data source. For any other
 * data source use {@link PagedSelect}.
 */
const UserSelect: FC<UserSelectProps> = (props: UserSelectProps) => (
  <BaseUserSelect {...props} fetchUsers={useFetchUsers()} />
);

export default UserSelect;
