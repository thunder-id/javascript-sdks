// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {GroupMembers as ReactGroupMembers, GroupMembersProps as ReactGroupMembersProps} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type GroupMembersProps = ReactGroupMembersProps;

/**
 * Lists a group's members and adds or removes them.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <GroupMembers groupId={id} />
 * ```
 */
const GroupMembers: FC<GroupMembersProps> = (props: GroupMembersProps): ReactElement => <ReactGroupMembers {...props} />;

GroupMembers.displayName = 'GroupMembers';

export default GroupMembers;
