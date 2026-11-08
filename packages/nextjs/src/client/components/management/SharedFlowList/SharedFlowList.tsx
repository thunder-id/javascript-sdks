// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {SharedFlowList as ReactSharedFlowList, SharedFlowListProps as ReactSharedFlowListProps} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type SharedFlowListProps = ReactSharedFlowListProps;

/**
 * Lists the flows shared with an organization unit, or the ones it owns, or both, a page at a time. Choosing a
 * flow reports it through `onSelect`, so the application decides what to open, for example `FlowVariablesForm`.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <SharedFlowList ouId={ouId} onSelect={(flow) => setSelectedFlowId(flow.id)} />
 * ```
 */
const SharedFlowList: FC<SharedFlowListProps> = (props: SharedFlowListProps): ReactElement => (
  <ReactSharedFlowList {...props} />
);

SharedFlowList.displayName = 'SharedFlowList';

export default SharedFlowList;
