// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {AgentListResponse, AgentQueryKeys, SuspendAllMeAgentsResponse, toManagementErrorMessage} from '@thunderid/node';
import {
  BasePersonalAgentList,
  PersonalAgentListProps as ReactPersonalAgentListProps,
  ResourceMutationResult,
  ResourceQueryResult,
  useResourceMutation,
  useResourceQuery,
  useTranslation,
} from '@thunderid/react';
import {FC, ReactElement, useMemo, useState} from 'react';
import getMeAgentsAction from '../../../../server/actions/account/getMeAgentsAction';
import suspendAllMeAgentsAction from '../../../../server/actions/account/suspendAllMeAgentsAction';
import useThunderID from '../../../contexts/ThunderID/useThunderID';
import loadMeAgentFromAction from '../../../loadMeAgentFromAction';

/**
 * Props for the PersonalAgentList component. Mirrors `@thunderid/react`'s `PersonalAgentListProps`, so a consumer
 * moving between the React and Next.js SDKs calls it the same way.
 */
export type PersonalAgentListProps = ReactPersonalAgentListProps;

/**
 * Lists the signed-in user's personal agents, a page at a time, and, when the app allows it, lets the user suspend
 * them all.
 *
 * This is the Next.js implementation: it renders `BasePersonalAgentList` from `@thunderid/react` and reads and
 * changes the agents through server actions, so the access token stays on the server.
 *
 * @example
 * ```tsx
 * <PersonalAgentList suspendable onSelect={(agent) => router.push(`/account/agents/${agent.id}`)} />
 * ```
 */
const PersonalAgentList: FC<PersonalAgentListProps> = ({
  limit = 20,
  preferences,
  suspendable = false,
  ...rest
}: PersonalAgentListProps): ReactElement => {
  const {preferences: contextPreferences} = useThunderID();
  const resolvedPreferences = useMemo(
    () => ({...contextPreferences, ...preferences}),
    [contextPreferences, preferences],
  );
  const {t} = useTranslation(resolvedPreferences?.i18n);
  const [offset, setOffset] = useState<number>(0);
  const [suspendedCount, setSuspendedCount] = useState<number | null>(null);

  const list: ResourceQueryResult<AgentListResponse> = useResourceQuery(
    [AgentQueryKeys.ME_AGENTS, {limit, offset}],
    () => loadMeAgentFromAction(getMeAgentsAction({limit, offset})),
  );
  const suspendAll: ResourceMutationResult<SuspendAllMeAgentsResponse, void> = useResourceMutation(
    () => loadMeAgentFromAction(suspendAllMeAgentsAction()),
    () => [[AgentQueryKeys.ME_AGENT], [AgentQueryKeys.ME_AGENTS]],
    {onSuccess: (result: SuspendAllMeAgentsResponse) => setSuspendedCount(result.suspendedCount)},
  );

  return (
    <BasePersonalAgentList
      agents={list.data?.agents ?? []}
      totalResults={list.data?.totalResults}
      isLoading={list.isLoading}
      error={toManagementErrorMessage(t, list.error, 'user.agents.list.error')}
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
      preferences={resolvedPreferences}
      {...rest}
    />
  );
};

PersonalAgentList.displayName = 'PersonalAgentList';

export default PersonalAgentList;
