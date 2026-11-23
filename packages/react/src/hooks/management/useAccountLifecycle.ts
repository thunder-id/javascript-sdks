// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AccessStatusValue,
  AccountLifecycleAction,
  AccountLifecycleFlowConfigKey,
  AccountLifecycleResult,
  AccountLifecycleSubjectKind,
  ResourceQueryKey,
  SuspensionAppliedBy,
  getAccountLifecycleActions,
  resolveAdministrationFlows,
  runAccountLifecycleAction,
} from '@thunderid/browser';
import {useMemo} from 'react';
import useResourceMutation, {ResourceMutationResult} from './useResourceMutation';
import useResourceQuery, {ResourceQueryResult} from './useResourceQuery';
import useThunderID from '../../contexts/ThunderID/useThunderID';

interface AccountLifecycleVariables {
  action: AccountLifecycleAction;
  operatorNote?: string;
}

export interface AccountLifecycleOptions {
  /**
   * Who holds a suspension, from the read's `status.details.appliedBy`. The organization lifts only its own.
   */
  appliedBy?: SuspensionAppliedBy[];
  /**
   * Whether to offer the actions at all. The configured flows are read only when it is on.
   */
  enabled: boolean;
  /**
   * Query keys to refetch after an action, such as the record and the list it appears in.
   */
  invalidatedKeys: ResourceQueryKey[];
  kind: AccountLifecycleSubjectKind;
  /**
   * The identity's effective access status, from the read that rendered it.
   */
  status: AccessStatusValue | undefined;
  /**
   * Identifier of the user, agent or application.
   */
  subject: string;
}

export interface AccountLifecycleState {
  /**
   * The actions to offer now: allowed by the status and backed by a configured flow.
   */
  actions: AccountLifecycleAction[];
  /**
   * Why the last action failed.
   */
  error: Error | null;
  isRunning: boolean;
  /**
   * Why the configured flows could not be read, so no action can be offered.
   */
  loadError: Error | null;
  run: (action: AccountLifecycleAction, operatorNote?: string) => void;
}

/**
 * Offers the account lifecycle actions (suspend, unsuspend, unlock) of a user, agent or application and
 * runs them. These actions have no management API endpoint: they run only through the administration
 * flows the server configures, so an action is offered only when its flow is configured.
 *
 * @example
 * ```tsx
 * const lifecycle = useAccountLifecycle({enabled: true, invalidatedKeys: [[UserQueryKeys.USER, id]], kind: 'user', status, subject: id});
 * ```
 */
const useAccountLifecycle = ({
  appliedBy,
  enabled,
  invalidatedKeys,
  kind,
  status,
  subject,
}: AccountLifecycleOptions): AccountLifecycleState => {
  const {baseUrl} = useThunderID();
  const flows: ResourceQueryResult<Record<string, string>> = useResourceQuery(
    ['administration-flows', 'account-lifecycle', kind],
    (fetcher) => resolveAdministrationFlows({baseUrl, fetcher}, Object.values(AccountLifecycleFlowConfigKey[kind])),
    {enabled},
  );
  const execution: ResourceMutationResult<AccountLifecycleResult, AccountLifecycleVariables> = useResourceMutation(
    ({action, operatorNote}: AccountLifecycleVariables, fetcher) =>
      runAccountLifecycleAction({action, baseUrl, fetcher, kind, operatorNote, subject}),
    () => invalidatedKeys,
  );

  const actions: AccountLifecycleAction[] = useMemo(
    () => (enabled && flows.data ? getAccountLifecycleActions(kind, status, flows.data, appliedBy) : []),
    [appliedBy, enabled, flows.data, kind, status],
  );

  return {
    actions,
    error: execution.error,
    isRunning: execution.isLoading,
    loadError: flows.error,
    run: (action: AccountLifecycleAction, operatorNote?: string): void => void execution.mutate({action, operatorNote}),
  };
};

export default useAccountLifecycle;
