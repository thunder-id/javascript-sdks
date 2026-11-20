// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AccountLifecycleFlowConfigKey} from '../constants/AdministrationConstants';
import {AccessStatusValue, SuspensionAppliedBy} from '../models/access-status';
import {AccountLifecycleAction, AccountLifecycleSubjectKind} from '../models/administration';

/**
 * The actions each status offers, most expected first. A suspended identity offers no unlock, since a
 * read does not show a lock beneath the suspension: once unsuspended, a remaining lock shows as `LOCKED`.
 */
const ACTIONS_BY_STATUS: Record<AccessStatusValue, AccountLifecycleAction[]> = {
  ACTIVE: ['suspend'],
  LOCKED: ['unlock', 'suspend'],
  SUSPENDED: ['unsuspend'],
};

/**
 * The account lifecycle actions to offer for an identity: those its status allows, that apply to its
 * kind, and whose administration flow is configured. These actions run only through their flows, so one
 * with no flow is never offered.
 *
 * @param kind - The kind of identity.
 * @param status - Its effective access status. An identity with none reads as `ACTIVE`.
 * @param configuredFlows - The flows the server configures, keyed by `flow` server-config key, as
 * `resolveAdministrationFlows` returns them.
 * @param appliedBy - Who holds a suspension, from `status.details.appliedBy`. The organization lifts only its
 * own suspension: a suspension held only by others, such as an agent's owner, offers the organization's
 * own suspension instead of an unsuspend. Absent or empty reads as the organization's.
 * @returns The actions to offer, most expected first.
 *
 * @example
 * ```typescript
 * const flows = await resolveAdministrationFlows(config, Object.values(AccountLifecycleFlowConfigKey.user));
 * getAccountLifecycleActions('user', user.status?.value, flows); // ['unlock', 'suspend'] for a locked user
 * ```
 */
const getAccountLifecycleActions = (
  kind: AccountLifecycleSubjectKind,
  status: AccessStatusValue | undefined,
  configuredFlows: Record<string, string>,
  appliedBy?: SuspensionAppliedBy[],
): AccountLifecycleAction[] => {
  const configKeys: Partial<Record<AccountLifecycleAction, string>> = AccountLifecycleFlowConfigKey[kind];
  const heldByOthersOnly: boolean =
    status === 'SUSPENDED' && Boolean(appliedBy?.length) && !appliedBy?.includes('organization');
  const candidates: AccountLifecycleAction[] = heldByOthersOnly
    ? ['suspend']
    : (ACTIONS_BY_STATUS[status ?? 'ACTIVE'] ?? []);

  return candidates.filter((action: AccountLifecycleAction) => {
    const configKey: string | undefined = configKeys[action];

    return configKey !== undefined && Boolean(configuredFlows[configKey]);
  });
};

export default getAccountLifecycleActions;
