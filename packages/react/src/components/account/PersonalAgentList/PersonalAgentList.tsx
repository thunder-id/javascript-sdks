// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AgentListResponse,
  AgentQueryKeys,
  PERSONAL_AGENT_KIND,
  SuspendAllMeAgentsResponse,
  resolveResourceEndpoint,
  toManagementErrorMessage,
} from '@thunderid/browser';
import {FC, ReactElement, useState} from 'react';
import BasePersonalAgentList, {BasePersonalAgentListProps} from './BasePersonalAgentList';
import getMeAgents from '../../../api/account/getMeAgents';
import suspendAllMeAgents from '../../../api/account/suspendAllMeAgents';
import useThunderID from '../../../contexts/ThunderID/useThunderID';
import useResourceMutation, {ResourceMutationResult} from '../../../hooks/management/useResourceMutation';
import useResourceQuery, {ResourceQueryResult} from '../../../hooks/management/useResourceQuery';
import useTranslation from '../../../hooks/useTranslation';

export type PersonalAgentListProps = Omit<
  BasePersonalAgentListProps,
  | 'actionError'
  | 'agents'
  | 'error'
  | 'isLoading'
  | 'isSuspendingAll'
  | 'offset'
  | 'onPageChange'
  | 'onSuspendAll'
  | 'suspendedCount'
  | 'totalResults'
> & {
  /**
   * Whether the user can suspend all their personal agents from this view.
   * @default false
   */
  suspendable?: boolean;
};

/**
 * Lists the signed-in user's personal agents, a page at a time. Pair it with `PersonalAgentDetails` to show
 * the agent the user chooses.
 *
 * @example
 * ```tsx
 * <PersonalAgentList suspendable onSelect={(agent) => setAgentId(agent.id)} />
 * ```
 */
const PersonalAgentList: FC<PersonalAgentListProps> = ({
  limit = 20,
  preferences,
  suspendable = false,
  ...rest
}: PersonalAgentListProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const {baseUrl, endpoints, instanceId} = useThunderID();
  const url: string | undefined = resolveResourceEndpoint('usersMeAgents', {endpoints});
  const [offset, setOffset] = useState<number>(0);
  const [suspendedCount, setSuspendedCount] = useState<number | null>(null);

  // These are the user's own requests, so they go through the SDK's transport for this instance, like the other
  // `users/me` operations, and never the management `http.fetcher` the hooks would otherwise hand them.
  const {data, error, isLoading}: ResourceQueryResult<AgentListResponse> = useResourceQuery(
    [AgentQueryKeys.ME_AGENTS, {limit, offset}],
    () => getMeAgents({baseUrl, instanceId, kind: PERSONAL_AGENT_KIND, limit, offset, url}),
  );
  const suspendAll: ResourceMutationResult<SuspendAllMeAgentsResponse, void> = useResourceMutation(
    () => suspendAllMeAgents({baseUrl, instanceId, url}),
    () => [[AgentQueryKeys.ME_AGENT], [AgentQueryKeys.ME_AGENTS]],
    {onSuccess: (result: SuspendAllMeAgentsResponse): void => setSuspendedCount(result.suspendedCount)},
  );

  return (
    <BasePersonalAgentList
      agents={data?.agents ?? []}
      totalResults={data?.totalResults}
      isLoading={isLoading}
      error={toManagementErrorMessage(t, error, 'user.agents.list.error')}
      limit={limit}
      offset={offset}
      onPageChange={(next: number): void => {
        setOffset(next);
        setSuspendedCount(null);
      }}
      actionError={toManagementErrorMessage(t, suspendAll.error, 'user.agents.action.error')}
      isSuspendingAll={suspendAll.isLoading}
      onSuspendAll={suspendable ? (): void => void suspendAll.mutate(undefined) : undefined}
      suspendedCount={suspendedCount}
      preferences={preferences}
      {...rest}
    />
  );
};

export default PersonalAgentList;
