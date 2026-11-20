// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  type AccessStatusValue,
  type AccountLifecycleAction,
  AccountLifecycleFlowConfigKey,
  type AccountLifecycleResult,
  type AccountLifecycleSubjectKind,
  type ResourceQueryKey,
  type SuspensionAppliedBy,
  getAccountLifecycleActions,
  resolveAdministrationFlows,
  runAccountLifecycleAction,
} from '@thunderid/browser';
import {type ComputedRef, computed} from 'vue';
import useResourceMutation, {type ResourceMutationResult} from './useResourceMutation';
import useResourceQuery, {type ResourceQueryResult} from './useResourceQuery';
import type {ThunderIDContext} from '../../models/contexts';
import useThunderID from '../useThunderID';

interface AccountLifecycleVariables {
  action: AccountLifecycleAction;
  operatorNote?: string;
}

export interface AccountLifecycleOptions {
  /**
   * Who holds a suspension, from the read's `status.details.appliedBy`. The organization lifts only its own.
   */
  appliedBy?: () => SuspensionAppliedBy[] | undefined;
  /**
   * Whether to offer the actions at all. The configured flows are read only when it is on.
   */
  enabled: () => boolean;
  /**
   * Query keys to refetch after an action, such as the record and the list it appears in.
   */
  invalidatedKeys: () => ResourceQueryKey[];
  kind: AccountLifecycleSubjectKind;
  /**
   * The identity's effective access status, from the read that rendered it.
   */
  status: () => AccessStatusValue | undefined;
  /**
   * Identifier of the user, agent or application.
   */
  subject: () => string;
}

export interface AccountLifecycleState {
  /**
   * The actions to offer now: allowed by the status and backed by a configured flow.
   */
  actions: ComputedRef<AccountLifecycleAction[]>;
  /**
   * Why the last action failed.
   */
  error: ComputedRef<Error | null>;
  isRunning: ComputedRef<boolean>;
  /**
   * Why the configured flows could not be read, so no action can be offered.
   */
  loadError: ComputedRef<Error | null>;
  run: (action: AccountLifecycleAction, operatorNote?: string) => void;
}

/**
 * Offers the account lifecycle actions (suspend, unsuspend, unlock) of a user, agent or application and
 * runs them. These actions have no management API endpoint: they run only through the administration
 * flows the server configures, so an action is offered only when its flow is configured.
 *
 * @example
 * ```typescript
 * const lifecycle = useAccountLifecycle({
 *   enabled: () => props.lifecycleActions,
 *   invalidatedKeys: () => [[UserQueryKeys.USER, props.userId]],
 *   kind: 'user',
 *   status: () => user.data.value?.status?.value,
 *   subject: () => props.userId,
 * });
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
  const {baseUrl}: ThunderIDContext = useThunderID();
  const flows: ResourceQueryResult<Record<string, string>> = useResourceQuery(
    () => ['administration-flows', 'account-lifecycle', kind],
    (fetcher) => resolveAdministrationFlows({baseUrl, fetcher}, Object.values(AccountLifecycleFlowConfigKey[kind])),
    {enabled},
  );
  const execution: ResourceMutationResult<AccountLifecycleResult, AccountLifecycleVariables> = useResourceMutation(
    ({action, operatorNote}: AccountLifecycleVariables, fetcher) =>
      runAccountLifecycleAction({action, baseUrl, fetcher, kind, operatorNote, subject: subject()}),
    () => invalidatedKeys(),
  );

  return {
    actions: computed((): AccountLifecycleAction[] =>
      enabled() && flows.data.value ? getAccountLifecycleActions(kind, status(), flows.data.value, appliedBy?.()) : [],
    ),
    error: computed((): Error | null => execution.error.value),
    isRunning: computed((): boolean => execution.isLoading.value),
    loadError: computed((): Error | null => flows.error.value),
    run: (action: AccountLifecycleAction, operatorNote?: string): void => void execution.mutate({action, operatorNote}),
  };
};

export default useAccountLifecycle;
