// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {toManagementErrorMessage} from '@thunderid/browser';
import type {Agent, AgentRoleListResponse, MembershipGroupListResponse, Preferences} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';
import BaseAgentDetails from './BaseAgentDetails';
import useDeleteAgent from '../../../../composables/agents/useDeleteAgent';
import useGetAgent from '../../../../composables/agents/useGetAgent';
import useGetAgentGroups from '../../../../composables/agents/useGetAgentGroups';
import useGetAgentRoles from '../../../../composables/agents/useGetAgentRoles';
import type {ResourceMutationResult} from '../../../../composables/useResourceMutation';
import type {ResourceQueryResult} from '../../../../composables/useResourceQuery';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

type AgentDetailsProps = Readonly<{
  agentId: string;
  className: string;
  deletable: boolean;
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
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
  },
  emits: ['deleted'],
  setup(props: AgentDetailsProps, {emit, slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const agent: ResourceQueryResult<Agent> = useGetAgent(() => props.agentId);
    const groups: ResourceQueryResult<MembershipGroupListResponse> = useGetAgentGroups(() => props.agentId, {
      limit: 100,
    });
    const roles: ResourceQueryResult<AgentRoleListResponse> = useGetAgentRoles(() => props.agentId, {limit: 100});
    const deletion: ResourceMutationResult<void, string> = useDeleteAgent({onSuccess: (): void => emit('deleted')});

    return (): VNode =>
      h(
        BaseAgentDetails,
        {
          agent: agent.data.value,
          className: props.className,
          error:
            toManagementErrorMessage(t, agent.error.value, 'admin.agents.details.error') ??
            toManagementErrorMessage(t, deletion.error.value, 'admin.agents.details.delete.error'),
          groups: groups.data.value?.groups ?? [],
          isDeleting: deletion.isLoading.value,
          isLoading: agent.isLoading.value,
          onDelete: props.deletable ? (): void => void deletion.mutate(props.agentId) : undefined,
          preferences: props.preferences,
          roles: roles.data.value?.roles ?? [],
        },
        {...slots},
      );
  },
});

export default AgentDetails;
