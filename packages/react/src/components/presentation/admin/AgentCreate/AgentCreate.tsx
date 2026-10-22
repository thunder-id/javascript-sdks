// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {toManagementErrorMessage, Agent, AgentType, SelectOption} from '@thunderid/browser';
import {FC, ReactElement, useMemo} from 'react';
import BaseAgentCreate, {AgentCreateSubmission, BaseAgentCreateProps} from './BaseAgentCreate';
import useCreateAgent from '../../../../hooks/agents/useCreateAgent';
import useGetAgentTypes from '../../../../hooks/agents/useGetAgentTypes';
import useTranslation from '../../../../hooks/useTranslation';
import useDefaultOuId from '../shared/useDefaultOuId';

export type AgentCreateProps = Omit<BaseAgentCreateProps, 'agentTypes' | 'error' | 'isSubmitting' | 'onSubmit'> & {
  /**
   * Called with the created agent.
   */
  onCreated?: (agent: Agent) => void;
  /**
   * Organization unit the agent is created in. Defaults to the signed-in user's organization unit.
   */
  ouId?: string;
  /**
   * The person responsible for the agent. Defaults to the server's choice, usually the creator.
   */
  owner?: string;
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
  const resolvedOuId: string | undefined = useDefaultOuId(ouId);
  const {data: agentTypes} = useGetAgentTypes({limit: 100});
  const {error, isLoading, mutate} = useCreateAgent({onSuccess: onCreated});

  const options: SelectOption[] = useMemo(
    () =>
      (agentTypes?.types ?? []).map((agentType: AgentType) => ({
        label: agentType.displayName,
        value: agentType.handle,
      })),
    [agentTypes],
  );

  const handleSubmit = ({description, name, type}: AgentCreateSubmission): void => {
    if (resolvedOuId) {
      void mutate({description, name, ouId: resolvedOuId, owner, type});
    }
  };

  return (
    <BaseAgentCreate
      agentTypes={options}
      onSubmit={handleSubmit}
      isSubmitting={isLoading}
      error={
        resolvedOuId ? toManagementErrorMessage(t, error, 'admin.agents.create.error') : t('admin.common.errors.no_ou')
      }
      preferences={preferences}
      {...rest}
    />
  );
};

export default AgentCreate;
