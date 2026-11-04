// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AgentQueryKeys,
  GroupQueryKeys,
  RoleQueryKeys,
  deleteAgent,
  getAgent,
  getAgentGroups,
  getAgentRoles,
  toManagementErrorMessage,
} from '@thunderid/browser';
import type {Agent, AgentRoleListResponse, MembershipGroupListResponse, Preferences} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';
import BaseAgentDetails from './BaseAgentDetails';
import useAccountLifecycle, {type AccountLifecycleState} from '../../../composables/management/useAccountLifecycle';
import useManagementEndpoint, {type ManagementEndpoint} from '../../../composables/management/useManagementEndpoint';
import useResourceMutation, {type ResourceMutationResult} from '../../../composables/management/useResourceMutation';
import useResourceQuery, {type ResourceQueryResult} from '../../../composables/management/useResourceQuery';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

type AgentDetailsProps = Readonly<{
  agentId: string;
  className: string;
  deletable: boolean;
  lifecycleActions: boolean;
  preferences: Preferences | undefined;
}>;

/**
 * Shows an agent with the groups it belongs to and the roles it holds, and optionally lets the
 * signed-in user delete it. Emits `deleted` after the agent has been deleted.
 *
 * Slots: `actions`, rendered next to the agent's name.
 *
 * @example
 * ```vue
 * <AgentDetails :agent-id="agentId" deletable @deleted="router.push('/agents')" />
 * ```
 */
const AgentDetails: Component = defineComponent({
  name: 'AgentDetails',
  props: {
    /** Identifier of the agent to show. */
    agentId: {required: true, type: String},
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** Whether the agent can be deleted from this view. */
    deletable: {default: false, type: Boolean},
    /**
     * Whether the agent can be suspended, unsuspended and unlocked from this view. Each action runs
     * through its administration flow and is offered only when the server configures that flow. Reading
     * the configured flows needs a token that may read the server configuration.
     */
    lifecycleActions: {default: false, type: Boolean},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
  },
  emits: ['deleted'],
  setup(props: AgentDetailsProps, {emit, slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const endpoint: ManagementEndpoint = useManagementEndpoint('agents');
    const hasAgentId = (): boolean => Boolean(props.agentId);
    const agent: ResourceQueryResult<Agent> = useResourceQuery(
      () => [AgentQueryKeys.AGENT, props.agentId],
      (fetcher) => getAgent({...endpoint, agentId: props.agentId, fetcher}),
      {enabled: hasAgentId},
    );
    const groups: ResourceQueryResult<MembershipGroupListResponse> = useResourceQuery(
      () => [GroupQueryKeys.MEMBERSHIPS, 'agent', props.agentId, {limit: 100}],
      (fetcher) => getAgentGroups({...endpoint, agentId: props.agentId, fetcher, limit: 100}),
      {enabled: hasAgentId},
    );
    const roles: ResourceQueryResult<AgentRoleListResponse> = useResourceQuery(
      () => [RoleQueryKeys.ROLE_ASSIGNMENTS, 'agent', props.agentId, {limit: 100}],
      (fetcher) => getAgentRoles({...endpoint, agentId: props.agentId, fetcher, limit: 100}),
      {enabled: hasAgentId},
    );
    const deletion: ResourceMutationResult<void, string> = useResourceMutation(
      (agentId: string, fetcher) => deleteAgent({...endpoint, agentId, fetcher}),
      () => [[AgentQueryKeys.AGENTS]],
      {onSuccess: (): void => emit('deleted')},
    );
    const lifecycle: AccountLifecycleState = useAccountLifecycle({
      enabled: (): boolean => props.lifecycleActions,
      invalidatedKeys: () => [[AgentQueryKeys.AGENT, props.agentId], [AgentQueryKeys.AGENTS]],
      kind: 'agent',
      status: () => agent.data.value?.status?.value,
      subject: () => props.agentId,
    });

    return (): VNode =>
      h(
        BaseAgentDetails,
        {
          agent: agent.data.value,
          className: props.className,
          error:
            toManagementErrorMessage(t, agent.error.value, 'admin.agents.details.error') ??
            toManagementErrorMessage(t, deletion.error.value, 'admin.agents.details.delete.error') ??
            toManagementErrorMessage(t, lifecycle.error.value, 'admin.common.lifecycle.error') ??
            toManagementErrorMessage(t, lifecycle.loadError.value, 'admin.common.lifecycle.load_error'),
          groups: groups.data.value?.groups ?? [],
          isDeleting: deletion.isLoading.value,
          isLoading: agent.isLoading.value,
          isRunningLifecycleAction: lifecycle.isRunning.value,
          lifecycleActions: lifecycle.actions.value,
          onDelete: props.deletable ? (): void => void deletion.mutate(props.agentId) : undefined,
          onLifecycleAction: props.lifecycleActions ? lifecycle.run : undefined,
          preferences: props.preferences,
          roles: roles.data.value?.roles ?? [],
        },
        {...slots},
      );
  },
});

export default AgentDetails;
