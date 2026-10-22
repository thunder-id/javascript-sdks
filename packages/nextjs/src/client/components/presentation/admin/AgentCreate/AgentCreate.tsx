// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {AgentCreate as ReactAgentCreate, AgentCreateProps as ReactAgentCreateProps} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type AgentCreateProps = ReactAgentCreateProps;

/**
 * Creates an agent.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <AgentCreate onCreated={(agent) => router.push(`/admin/agents/${agent.id}`)} />
 * ```
 */
const AgentCreate: FC<AgentCreateProps> = (props: AgentCreateProps): ReactElement => <ReactAgentCreate {...props} />;

AgentCreate.displayName = 'AgentCreate';

export default AgentCreate;
