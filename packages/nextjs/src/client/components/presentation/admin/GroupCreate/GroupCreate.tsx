// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {GroupCreate as ReactGroupCreate, GroupCreateProps as ReactGroupCreateProps} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type GroupCreateProps = ReactGroupCreateProps;

/**
 * Creates a group.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <GroupCreate onCreated={(group) => router.push(`/admin/groups/${group.id}`)} />
 * ```
 */
const GroupCreate: FC<GroupCreateProps> = (props: GroupCreateProps): ReactElement => <ReactGroupCreate {...props} />;

GroupCreate.displayName = 'GroupCreate';

export default GroupCreate;
