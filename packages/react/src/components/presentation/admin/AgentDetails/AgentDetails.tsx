// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {toManagementErrorMessage} from '@thunderid/browser';
import {FC, ReactElement} from 'react';
import BaseAgentDetails, {BaseAgentDetailsProps} from './BaseAgentDetails';
import useDeleteAgent from '../../../../hooks/agents/useDeleteAgent';
import useGetAgent from '../../../../hooks/agents/useGetAgent';
import useGetAgentGroups from '../../../../hooks/agents/useGetAgentGroups';
import useGetAgentRoles from '../../../../hooks/agents/useGetAgentRoles';
import useTranslation from '../../../../hooks/useTranslation';

export type AgentDetailsProps = Omit<
  BaseAgentDetailsProps,
  'agent' | 'error' | 'groups' | 'isDeleting' | 'isLoading' | 'onDelete' | 'roles'
> & {
  agentId: string;
  /**
   * Whether the agent can be deleted from this view.
   * @default false
   */
  deletable?: boolean;
  /**
   * Called after the agent has been deleted.
   */
  onDeleted?: () => void;
};

/**
 * Shows an agent with the groups and roles it holds, and optionally lets the signed-in user delete
 * it.
 *
 * @example
 * ```tsx
 * <AgentDetails agentId={agentId} deletable onDeleted={() => navigate('/agents')} />
 * ```
 */
const AgentDetails: FC<AgentDetailsProps> = ({
  agentId,
  deletable = false,
  onDeleted,
  preferences,
  ...rest
}: AgentDetailsProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const agent = useGetAgent(agentId);
  const groups = useGetAgentGroups(agentId, {limit: 100});
  const roles = useGetAgentRoles(agentId, {limit: 100});
  const deletion = useDeleteAgent({onSuccess: onDeleted});

  return (
    <BaseAgentDetails
      agent={agent.data}
      groups={groups.data?.groups}
      roles={roles.data?.roles}
      isLoading={agent.isLoading}
      error={
        toManagementErrorMessage(t, agent.error, 'admin.agents.details.error') ??
        toManagementErrorMessage(t, deletion.error, 'admin.agents.details.delete.error')
      }
      isDeleting={deletion.isLoading}
      onDelete={deletable ? (): void => void deletion.mutate(agentId) : undefined}
      preferences={preferences}
      {...rest}
    />
  );
};

export default AgentDetails;
