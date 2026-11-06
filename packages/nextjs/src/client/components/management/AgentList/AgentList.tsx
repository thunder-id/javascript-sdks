// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {AgentList as ReactAgentList, AgentListProps as ReactAgentListProps} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type AgentListProps = ReactAgentListProps;

/**
 * Lists agents, a page at a time.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <AgentList onSelect={(agent) => router.push(`/admin/agents/${agent.id}`)} />
 * ```
 */
const AgentList: FC<AgentListProps> = (props: AgentListProps): ReactElement => <ReactAgentList {...props} />;

AgentList.displayName = 'AgentList';

export default AgentList;
