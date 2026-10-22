// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {toManagementErrorMessage} from '@thunderid/browser';
import type {AgentType, AgentTypeListResponse, SelectOption, Agent, CreateAgentRequest} from '@thunderid/browser';
import {type Component, type ComputedRef, type SetupContext, type VNode, computed, defineComponent, h} from 'vue';
import BaseAgentCreate, {type AgentCreateSubmission} from './BaseAgentCreate';
import useCreateAgent from '../../../../composables/agents/useCreateAgent';
import useGetAgentTypes from '../../../../composables/agents/useGetAgentTypes';
import type {ResourceMutationResult} from '../../../../composables/useResourceMutation';
import type {ResourceQueryResult} from '../../../../composables/useResourceQuery';
import {type AdminFormProps, adminFormProps} from '../shared/adminFormProps';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';
import useDefaultOuId from '../shared/useDefaultOuId';

type AgentCreateProps = Omit<AdminFormProps, 'error' | 'isSubmitting'> &
  Readonly<{
    ouId: string | undefined;
    owner: string | undefined;
  }>;

/**
 * Creates a agent through the management API in the given organization unit, or the signed-in user's
 * own. Emits `created` with the created agent.
 *
 * @example
 * ```vue
 * <AgentCreate @created="(agent) => (selectedAgentId = agent.id)" />
 * ```
 */
const AgentCreate: Component = defineComponent({
  name: 'AgentCreate',
  props: {
    className: adminFormProps.className,
    description: adminFormProps.description,
    onCancel: adminFormProps.onCancel,
    /** Organization unit the agent is created in. Defaults to the signed-in user's organization unit. */
    ouId: {default: undefined, type: String},
    /** Identifier of the user who owns the agent. */
    owner: {default: undefined, type: String},
    preferences: adminFormProps.preferences,
    title: adminFormProps.title,
  },
  emits: ['created'],
  setup(props: AgentCreateProps, {emit, slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const resolvedOuId: ComputedRef<string | undefined> = useDefaultOuId(() => props.ouId);
    const agentTypes: ResourceQueryResult<AgentTypeListResponse> = useGetAgentTypes({limit: 100});
    const options: ComputedRef<SelectOption[]> = computed(() =>
      (agentTypes.data.value?.types ?? []).map((agentType: AgentType) => ({
        label: agentType.displayName,
        value: agentType.handle,
      })),
    );
    const creation: ResourceMutationResult<Agent, CreateAgentRequest> = useCreateAgent({
      onSuccess: (created: Agent): void => emit('created', created),
    });

    const handleSubmit = ({description, name, type}: AgentCreateSubmission): void => {
      if (resolvedOuId.value) {
        void creation.mutate({description, name, ouId: resolvedOuId.value, owner: props.owner, type});
      }
    };

    return (): VNode =>
      h(
        BaseAgentCreate,
        {
          agentTypes: options.value,
          className: props.className,
          description: props.description,
          error: resolvedOuId.value
            ? toManagementErrorMessage(t, creation.error.value, 'admin.agents.create.error')
            : t('admin.common.errors.no_ou'),
          isSubmitting: creation.isLoading.value,
          onCancel: props.onCancel,
          onSubmit: handleSubmit,
          preferences: props.preferences,
          title: props.title,
        },
        {...slots},
      );
  },
});

export default AgentCreate;
