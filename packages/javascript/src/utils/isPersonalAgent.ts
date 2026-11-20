// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AgentKind, PERSONAL_AGENT_KIND} from '../models/agent-resource';

/**
 * Whether an agent is a personal agent: one that acts only for its owner, a user.
 *
 * @param agent - An agent, or the summary of one from a list response.
 * @returns `true` when the agent's kind is {@link PERSONAL_AGENT_KIND}.
 *
 * @example
 * ```typescript
 * isPersonalAgent({kind: 'personal-assistant'}); // true
 * ```
 */
const isPersonalAgent = (agent: {kind?: AgentKind}): boolean => agent.kind === PERSONAL_AGENT_KIND;

export default isPersonalAgent;
