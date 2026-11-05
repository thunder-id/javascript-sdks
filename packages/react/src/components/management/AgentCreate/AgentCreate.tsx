// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  Agent,
  AgentOwner,
  AgentQueryKeys,
  AgentType,
  AgentTypeListResponse,
  CreateAgentRequest,
  SelectOption,
  createAgent,
  getAgentTypes,
  toManagementErrorMessage,
} from '@thunderid/browser';
import {FC, ReactElement, useMemo} from 'react';
import BaseAgentCreate, {AgentCreateSubmission, BaseAgentCreateProps} from './BaseAgentCreate';
import useManagementEndpoint, {ManagementEndpoint} from '../../../hooks/management/useManagementEndpoint';
import useResourceMutation, {ResourceMutationResult} from '../../../hooks/management/useResourceMutation';
import useResourceQuery, {ResourceQueryResult} from '../../../hooks/management/useResourceQuery';
import useTranslation from '../../../hooks/useTranslation';
import useProjectPlacement, {ProjectPlacement} from '../shared/useProjectPlacement';

export type AgentCreateProps = Omit<BaseAgentCreateProps, 'agentTypes' | 'error' | 'isSubmitting' | 'onSubmit'> & {
  /**
   * Called with the created agent.
   */
  onCreated?: (agent: Agent) => void;
  /**
   * Organization unit the agent is created in. Without it, the resource is created in the
   * current project (sent as `projectId`) when one is chosen, otherwise in the signed-in user's organization unit.
   */
  ouId?: string;
  /**
   * The person responsible for the agent. Defaults to the server's choice, usually the creator.
   */
  owner?: AgentOwner;
};

/**
 * Registers an agent through the management API.
 *
 * @example
 * ```tsx
 * <AgentCreate onCreated={(agent) => navigate(`/agents/${agent.id}`)} />
 * ```
 */
const AgentCreate: FC<AgentCreateProps> = ({
  onCreated,
  ouId,
  owner,
  preferences,
  ...rest
}: AgentCreateProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const placement: ProjectPlacement = useProjectPlacement(ouId);
  const canPlace = Boolean(placement.ouId ?? placement.projectId);
  const agentsEndpoint: ManagementEndpoint = useManagementEndpoint('agents');
  const agentTypesEndpoint: ManagementEndpoint = useManagementEndpoint('agentTypes');
  const {data: agentTypes}: ResourceQueryResult<AgentTypeListResponse> = useResourceQuery(
    [AgentQueryKeys.AGENT_TYPES, {limit: 100}],
    (fetcher) => getAgentTypes({...agentTypesEndpoint, fetcher, limit: 100}),
  );
  const {error, isLoading, mutate}: ResourceMutationResult<Agent, CreateAgentRequest> = useResourceMutation(
    (payload: CreateAgentRequest, fetcher) => createAgent({...agentsEndpoint, fetcher, payload}),
    () => [[AgentQueryKeys.AGENTS]],
    {onSuccess: onCreated},
  );

  const options: SelectOption[] = useMemo(
    () =>
      (agentTypes?.types ?? []).map((agentType: AgentType) => ({
        label: agentType.displayName,
        value: agentType.handle,
      })),
    [agentTypes],
  );

  const handleSubmit = ({description, name, type}: AgentCreateSubmission): void => {
    if (canPlace) {
      void mutate({attributes: {name}, description, owner, type, ...placement});
    }
  };

  return (
    <BaseAgentCreate
      agentTypes={options}
      onSubmit={handleSubmit}
      isSubmitting={isLoading}
      error={
        canPlace ? toManagementErrorMessage(t, error, 'admin.agents.create.error') : t('admin.common.errors.no_ou')
      }
      preferences={preferences}
      {...rest}
    />
  );
};

export default AgentCreate;
