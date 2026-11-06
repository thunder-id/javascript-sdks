// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {GroupList as ReactGroupList, GroupListProps as ReactGroupListProps} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type GroupListProps = ReactGroupListProps;

/**
 * Lists groups, a page at a time.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <GroupList onSelect={(group) => router.push(`/admin/groups/${group.id}`)} />
 * ```
 */
const GroupList: FC<GroupListProps> = (props: GroupListProps): ReactElement => <ReactGroupList {...props} />;

GroupList.displayName = 'GroupList';

export default GroupList;
