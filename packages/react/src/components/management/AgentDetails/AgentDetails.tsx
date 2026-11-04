// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  Agent,
  AgentQueryKeys,
  AgentRoleListResponse,
  GroupQueryKeys,
  MembershipGroupListResponse,
  RoleQueryKeys,
  deleteAgent,
  getAgent,
  getAgentGroups,
  getAgentRoles,
  toManagementErrorMessage,
} from '@thunderid/browser';
import {FC, ReactElement} from 'react';
import BaseAgentDetails, {BaseAgentDetailsProps} from './BaseAgentDetails';
import useAccountLifecycle, {AccountLifecycleState} from '../../../hooks/management/useAccountLifecycle';
import useManagementEndpoint, {ManagementEndpoint} from '../../../hooks/management/useManagementEndpoint';
import useResourceMutation, {ResourceMutationResult} from '../../../hooks/management/useResourceMutation';
import useResourceQuery, {ResourceQueryResult} from '../../../hooks/management/useResourceQuery';
import useTranslation from '../../../hooks/useTranslation';

export type AgentDetailsProps = Omit<
  BaseAgentDetailsProps,
  | 'agent'
  | 'error'
  | 'groups'
  | 'isDeleting'
  | 'isLoading'
  | 'isRunningLifecycleAction'
  | 'lifecycleActions'
  | 'onDelete'
  | 'onLifecycleAction'
  | 'roles'
> & {
  agentId: string;
  /**
   * Whether the agent can be deleted from this view.
   * @default false
   */
  deletable?: boolean;
  /**
   * Whether the agent can be suspended, unsuspended and unlocked from this view. Each action runs through its
   * administration flow and is offered only when the server configures that flow. Reading the configured
   * flows needs a token that may read the server configuration.
   * @default false
   */
  lifecycleActions?: boolean;
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
  lifecycleActions = false,
  onDeleted,
  preferences,
  ...rest
}: AgentDetailsProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const endpoint: ManagementEndpoint = useManagementEndpoint('agents');
  const agent: ResourceQueryResult<Agent> = useResourceQuery(
    [AgentQueryKeys.AGENT, agentId],
    (fetcher) => getAgent({...endpoint, agentId, fetcher}),
    {enabled: Boolean(agentId)},
  );
  const groups: ResourceQueryResult<MembershipGroupListResponse> = useResourceQuery(
    [GroupQueryKeys.MEMBERSHIPS, 'agent', agentId, {limit: 100}],
    (fetcher) => getAgentGroups({...endpoint, agentId, fetcher, limit: 100}),
    {enabled: Boolean(agentId)},
  );
  const roles: ResourceQueryResult<AgentRoleListResponse> = useResourceQuery(
    [RoleQueryKeys.ROLE_ASSIGNMENTS, 'agent', agentId, {limit: 100}],
    (fetcher) => getAgentRoles({...endpoint, agentId, fetcher, limit: 100}),
    {enabled: Boolean(agentId)},
  );
  const deletion: ResourceMutationResult<void, string> = useResourceMutation(
    (id: string, fetcher) => deleteAgent({...endpoint, agentId: id, fetcher}),
    () => [[AgentQueryKeys.AGENTS]],
    {onSuccess: onDeleted},
  );

  const lifecycle: AccountLifecycleState = useAccountLifecycle({
    enabled: lifecycleActions,
    invalidatedKeys: [[AgentQueryKeys.AGENT, agentId], [AgentQueryKeys.AGENTS]],
    kind: 'agent',
    status: agent.data?.status?.value,
    subject: agentId,
  });

  return (
    <BaseAgentDetails
      agent={agent.data}
      groups={groups.data?.groups}
      roles={roles.data?.roles}
      isLoading={agent.isLoading}
      error={
        toManagementErrorMessage(t, agent.error, 'admin.agents.details.error') ??
        toManagementErrorMessage(t, deletion.error, 'admin.agents.details.delete.error') ??
        toManagementErrorMessage(t, lifecycle.error, 'admin.common.lifecycle.error') ??
        toManagementErrorMessage(t, lifecycle.loadError, 'admin.common.lifecycle.load_error')
      }
      isDeleting={deletion.isLoading}
      onDelete={deletable ? (): void => void deletion.mutate(agentId) : undefined}
      lifecycleActions={lifecycle.actions}
      isRunningLifecycleAction={lifecycle.isRunning}
      onLifecycleAction={lifecycleActions ? lifecycle.run : undefined}
      preferences={preferences}
      {...rest}
    />
  );
};

export default AgentDetails;
