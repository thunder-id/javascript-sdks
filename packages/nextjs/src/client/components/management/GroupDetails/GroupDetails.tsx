// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {GroupDetails as ReactGroupDetails, GroupDetailsProps as ReactGroupDetailsProps} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type GroupDetailsProps = ReactGroupDetailsProps;

/**
 * Shows a group with its members, and optionally manages the members and deletes the group.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <GroupDetails groupId={id} editable deletable onDeleted={() => router.push('/admin/groups')} />
 * ```
 */
const GroupDetails: FC<GroupDetailsProps> = (props: GroupDetailsProps): ReactElement => (
  <ReactGroupDetails {...props} />
);

GroupDetails.displayName = 'GroupDetails';

export default GroupDetails;
