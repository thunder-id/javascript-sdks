// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AccessStatus} from '../models/access-status';

/**
 * The suspension action an agent's owner can take on it: `unsuspend` while the owner holds it suspended,
 * otherwise `suspend`. The owner's suspension is independent of any other party's, so an agent the
 * organization suspended, or one suspended while its owner's account is, can still take the owner's own
 * suspension, and lifting the owner's leaves the others in force.
 *
 * @param status - The agent's effective access status, from a read of the owner's agent.
 * @returns The action to offer.
 *
 * @example
 * ```typescript
 * const action = getMeAgentSuspensionAction(agent.status);
 * await (action === 'suspend' ? suspendMeAgent : unsuspendMeAgent)({agentId: agent.id, baseUrl});
 * ```
 */
const getMeAgentSuspensionAction = (status: AccessStatus | undefined): 'suspend' | 'unsuspend' =>
  status?.value === 'SUSPENDED' && status.details?.appliedBy?.includes('owner') ? 'unsuspend' : 'suspend';

export default getMeAgentSuspensionAction;
