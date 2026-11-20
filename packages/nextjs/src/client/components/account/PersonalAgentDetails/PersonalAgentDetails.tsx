// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {Agent, AgentQueryKeys, ResourceQueryKey, UpdateMeAgentRequest, toManagementErrorMessage} from '@thunderid/node';
import {
  BasePersonalAgentDetails,
  PersonalAgentDetailsProps as ReactPersonalAgentDetailsProps,
  ResourceMutationResult,
  ResourceQueryResult,
  useResourceMutation,
  useResourceQuery,
  useTranslation,
} from '@thunderid/react';
import {FC, ReactElement, useMemo, useState} from 'react';
import deleteMeAgentAction from '../../../../server/actions/account/deleteMeAgentAction';
import getMeAgentAction from '../../../../server/actions/account/getMeAgentAction';
import suspendMeAgentAction from '../../../../server/actions/account/suspendMeAgentAction';
import unsuspendMeAgentAction from '../../../../server/actions/account/unsuspendMeAgentAction';
import updateMeAgentAction from '../../../../server/actions/account/updateMeAgentAction';
import useThunderID from '../../../contexts/ThunderID/useThunderID';
import loadMeAgentFromAction from '../../../loadMeAgentFromAction';

/**
 * Props for the PersonalAgentDetails component. Mirrors `@thunderid/react`'s `PersonalAgentDetailsProps`, so a
 * consumer moving between the React and Next.js SDKs calls it the same way.
 */
export type PersonalAgentDetailsProps = ReactPersonalAgentDetailsProps;

/**
 * Shows one of the signed-in user's personal agents, and, when the app allows it, lets the user edit, delete and
 * suspend it.
 *
 * This is the Next.js implementation: it renders `BasePersonalAgentDetails` from `@thunderid/react` and reads and
 * changes the agent through server actions, so the access token stays on the server.
 *
 * @example
 * ```tsx
 * <PersonalAgentDetails agentId={agentId} editable deletable suspendable onDeleted={() => router.back()} />
 * ```
 */
const PersonalAgentDetails: FC<PersonalAgentDetailsProps> = ({
  agentId,
  deletable = false,
  editable = false,
  onDeleted,
  preferences,
  suspendable = false,
  ...rest
}: PersonalAgentDetailsProps): ReactElement => {
  const {preferences: contextPreferences} = useThunderID();
  const resolvedPreferences = useMemo(
    () => ({...contextPreferences, ...preferences}),
    [contextPreferences, preferences],
  );
  const {t} = useTranslation(resolvedPreferences?.i18n);
  // Built from the agent a request targeted, which may no longer be the one shown when the request completes.
  const changed = (id: string): ResourceQueryKey[] => [[AgentQueryKeys.ME_AGENT, id], [AgentQueryKeys.ME_AGENTS]];

  const agent: ResourceQueryResult<Agent> = useResourceQuery(
    [AgentQueryKeys.ME_AGENT, agentId],
    () => loadMeAgentFromAction(getMeAgentAction(agentId)),
    {enabled: Boolean(agentId)},
  );
  const update: ResourceMutationResult<Agent, {id: string; payload: UpdateMeAgentRequest}> = useResourceMutation(
    ({id, payload}: {id: string; payload: UpdateMeAgentRequest}) =>
      loadMeAgentFromAction(updateMeAgentAction(id, payload)),
    ({id}: {id: string}) => changed(id),
  );
  // The agent this component deleted, shown as gone from then on rather than as the last record read.
  const [deletedId, setDeletedId] = useState<string | null>(null);
  const deletion: ResourceMutationResult<void, string> = useResourceMutation(
    (id: string) => loadMeAgentFromAction(deleteMeAgentAction(id)),
    () => [[AgentQueryKeys.ME_AGENTS]],
    {
      onSuccess: (_: void, id: string): void => {
        setDeletedId(id);
        // A delete that completes after another agent was selected must not close that agent.
        if (id === agentId) {
          onDeleted?.();
        }
      },
    },
  );
  const suspension: ResourceMutationResult<void, {action: 'suspend' | 'unsuspend'; id: string}> = useResourceMutation(
    ({action, id}: {action: 'suspend' | 'unsuspend'; id: string}) =>
      loadMeAgentFromAction(action === 'suspend' ? suspendMeAgentAction(id) : unsuspendMeAgentAction(id)),
    ({id}: {id: string}) => changed(id),
  );

  // The query keeps the previous agent's record while the next one loads, and the actions already target the new
  // ID, so only a record for this ID is shown.
  const isDeleted: boolean = deletedId === agentId;
  const current: Agent | undefined = !isDeleted && agent.data?.id === agentId ? agent.data : undefined;

  return (
    <BasePersonalAgentDetails
      agent={current}
      isLoading={!isDeleted && (agent.isLoading || (Boolean(agentId) && !current && !agent.error))}
      error={
        toManagementErrorMessage(t, agent.error, 'user.agents.details.error') ??
        toManagementErrorMessage(t, update.error ?? deletion.error ?? suspension.error, 'user.agents.action.error')
      }
      isUpdating={update.isLoading}
      isDeleting={deletion.isLoading}
      isChangingSuspension={suspension.isLoading}
      onUpdate={
        editable
          ? (payload: UpdateMeAgentRequest): Promise<boolean> =>
              update.mutate({id: agentId, payload}).then((saved: Agent | undefined) => saved !== undefined)
          : undefined
      }
      onDelete={deletable ? (): void => void deletion.mutate(agentId) : undefined}
      onSuspend={suspendable ? (): void => void suspension.mutate({action: 'suspend', id: agentId}) : undefined}
      onUnsuspend={suspendable ? (): void => void suspension.mutate({action: 'unsuspend', id: agentId}) : undefined}
      preferences={resolvedPreferences}
      {...rest}
    />
  );
};

PersonalAgentDetails.displayName = 'PersonalAgentDetails';

export default PersonalAgentDetails;
