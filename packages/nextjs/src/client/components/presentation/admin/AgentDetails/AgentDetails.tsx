// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {AgentDetails as ReactAgentDetails, AgentDetailsProps as ReactAgentDetailsProps} from '@thunderid/react';
import {FC, ReactElement} from 'react';

export type AgentDetailsProps = ReactAgentDetailsProps;

/**
 * Shows an agent's details, groups and roles, and optionally deletes the agent.
 *
 * Management requests go through a server action with the signed-in user's server-held session, so
 * the access token never reaches the browser. Whether a request succeeds is the server's decision.
 *
 * @example
 * ```tsx
 * <AgentDetails agentId={id} deletable onDeleted={() => router.push('/admin/agents')} />
 * ```
 */
const AgentDetails: FC<AgentDetailsProps> = (props: AgentDetailsProps): ReactElement => <ReactAgentDetails {...props} />;

AgentDetails.displayName = 'AgentDetails';

export default AgentDetails;
