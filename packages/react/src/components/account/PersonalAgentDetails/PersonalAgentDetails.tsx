// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  Agent,
  AgentQueryKeys,
  ResourceQueryKey,
  UpdateMeAgentRequest,
  resolveResourceEndpoint,
  toManagementErrorMessage,
} from '@thunderid/browser';
import {FC, ReactElement, useState} from 'react';
import BasePersonalAgentDetails, {BasePersonalAgentDetailsProps} from './BasePersonalAgentDetails';
import deleteMeAgent from '../../../api/account/deleteMeAgent';
import getMeAgent from '../../../api/account/getMeAgent';
import suspendMeAgent from '../../../api/account/suspendMeAgent';
import unsuspendMeAgent from '../../../api/account/unsuspendMeAgent';
import updateMeAgent from '../../../api/account/updateMeAgent';
import useThunderID from '../../../contexts/ThunderID/useThunderID';
import useResourceMutation, {ResourceMutationResult} from '../../../hooks/management/useResourceMutation';
import useResourceQuery, {ResourceQueryResult} from '../../../hooks/management/useResourceQuery';
import useTranslation from '../../../hooks/useTranslation';

export type PersonalAgentDetailsProps = Omit<
  BasePersonalAgentDetailsProps,
  | 'agent'
  | 'error'
  | 'isChangingSuspension'
  | 'isDeleting'
  | 'isLoading'
  | 'isUpdating'
  | 'onDelete'
  | 'onSuspend'
  | 'onUnsuspend'
  | 'onUpdate'
> & {
  agentId: string;
  /**
   * Whether the agent can be deleted from this view.
   * @default false
   */
  deletable?: boolean;
  /**
   * Whether the agent can be edited from this view.
   * @default false
   */
  editable?: boolean;
  /**
   * Called after the agent has been deleted.
   */
  onDeleted?: () => void;
  /**
   * Whether the user can suspend the agent, and lift their own suspension, from this view.
   * @default false
   */
  suspendable?: boolean;
};

/**
 * Shows one of the signed-in user's personal agents, and, when the app allows it, lets the user edit, delete
 * and suspend it.
 *
 * @example
 * ```tsx
 * <PersonalAgentDetails agentId={agentId} editable deletable suspendable onDeleted={() => setAgentId(null)} />
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
  const {t} = useTranslation(preferences?.i18n);
  const {baseUrl, endpoints, instanceId} = useThunderID();
  const url: string | undefined = resolveResourceEndpoint('usersMeAgents', {endpoints});
  // Built from the agent a request targeted, which may no longer be the one shown when the request completes.
  const changed = (id: string): ResourceQueryKey[] => [[AgentQueryKeys.ME_AGENT, id], [AgentQueryKeys.ME_AGENTS]];

  // These are the user's own requests, so they go through the SDK's transport for this instance, like the other
  // `users/me` operations, and never the management `http.fetcher` the hooks would otherwise hand them.
  const agent: ResourceQueryResult<Agent> = useResourceQuery(
    [AgentQueryKeys.ME_AGENT, agentId],
    () => getMeAgent({agentId, baseUrl, instanceId, url}),
    {enabled: Boolean(agentId)},
  );
  const update: ResourceMutationResult<Agent, {id: string; payload: UpdateMeAgentRequest}> = useResourceMutation(
    ({id, payload}: {id: string; payload: UpdateMeAgentRequest}) =>
      updateMeAgent({agentId: id, baseUrl, instanceId, payload, url}),
    ({id}: {id: string}) => changed(id),
  );
  // The agent this component deleted, shown as gone from then on rather than as the last record read.
  const [deletedId, setDeletedId] = useState<string | null>(null);
  const deletion: ResourceMutationResult<void, string> = useResourceMutation(
    (id: string) => deleteMeAgent({agentId: id, baseUrl, instanceId, url}),
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
      (action === 'suspend' ? suspendMeAgent : unsuspendMeAgent)({agentId: id, baseUrl, instanceId, url}),
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
      preferences={preferences}
      {...rest}
    />
  );
};

export default PersonalAgentDetails;
