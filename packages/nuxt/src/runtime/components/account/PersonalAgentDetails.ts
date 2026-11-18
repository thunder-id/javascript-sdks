// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  type Agent,
  AgentQueryKeys,
  type Preferences,
  type ResourceQueryKey,
  type UpdateMeAgentRequest,
  toManagementErrorMessage,
} from '@thunderid/browser';
import {
  BasePersonalAgentDetails,
  type ResourceMutationResult,
  type ResourceQueryResult,
  useI18n,
  useResourceMutation,
  useResourceQuery,
} from '@thunderid/vue';
import {type Component, type PropType, type Ref, type SetupContext, type VNode, defineComponent, h, ref} from 'vue';
import NuxtAPIRoutes from '../../constants/NuxtAPIRoutes';
import loadMeAgentFromRoute from '../../utils/loadMeAgentFromRoute';

type PersonalAgentDetailsProps = Readonly<{
  agentId: string;
  className: string;
  deletable: boolean;
  editable: boolean;
  preferences: Preferences | undefined;
  suspendable: boolean;
}>;

/**
 * Nuxt-specific PersonalAgentDetails container.
 *
 * Reads and changes one of the signed-in user's personal agents through `/api/auth/user/agents/{id}`
 * (`NuxtAPIRoutes.USER_AGENTS`) with the server-held session, so the access token never reaches the browser. Emits
 * `deleted` after the agent has been deleted.
 *
 * Renders `BasePersonalAgentDetails` from `@thunderid/vue`, with the same props, events and slots as the Vue SDK's
 * `PersonalAgentDetails`.
 */
const PersonalAgentDetails: Component = defineComponent({
  name: 'PersonalAgentDetails',
  props: {
    agentId: {required: true, type: String},
    className: {default: '', type: String},
    deletable: {default: false, type: Boolean},
    editable: {default: false, type: Boolean},
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    suspendable: {default: false, type: Boolean},
  },
  emits: ['deleted'],
  setup(props: PersonalAgentDetailsProps, {emit, slots}: SetupContext): () => VNode {
    const {t} = useI18n();
    const agentUrl = (id: string): string => `${NuxtAPIRoutes.USER_AGENTS}/${encodeURIComponent(id)}`;
    // Built from the agent a request targeted, which may no longer be the one shown when the request completes.
    const changed = (id: string): ResourceQueryKey[] => [[AgentQueryKeys.ME_AGENT, id], [AgentQueryKeys.ME_AGENTS]];

    const agent: ResourceQueryResult<Agent> = useResourceQuery(
      () => [AgentQueryKeys.ME_AGENT, props.agentId],
      () => loadMeAgentFromRoute($fetch<Agent>(agentUrl(props.agentId))),
      {enabled: () => Boolean(props.agentId)},
    );
    const update: ResourceMutationResult<Agent, {id: string; payload: UpdateMeAgentRequest}> = useResourceMutation(
      ({id, payload}: {id: string; payload: UpdateMeAgentRequest}) =>
        loadMeAgentFromRoute($fetch<Agent>(agentUrl(id), {body: payload, method: 'PUT'})),
      ({id}: {id: string}) => changed(id),
    );
    // The agent this component deleted, shown as gone from then on rather than as the last record read.
    const deletedId: Ref<string | null> = ref(null);
    const deletion: ResourceMutationResult<unknown, string> = useResourceMutation(
      (id: string) => loadMeAgentFromRoute($fetch(agentUrl(id), {method: 'DELETE'})),
      (id: string) => changed(id),
      {
        onSuccess: (_: unknown, id: string): void => {
          deletedId.value = id;
          // A delete that completes after another agent was selected must not close that agent.
          if (id === props.agentId) {
            emit('deleted');
          }
        },
      },
    );
    const suspension: ResourceMutationResult<unknown, {action: 'suspend' | 'unsuspend'; id: string}> =
      useResourceMutation(
        ({action, id}: {action: 'suspend' | 'unsuspend'; id: string}) =>
          loadMeAgentFromRoute($fetch(`${agentUrl(id)}/${action}`, {method: 'POST'})),
        ({id}: {id: string}) => changed(id),
      );

    return (): VNode => {
      // The query keeps the previous agent's record while the next one loads, and the actions already target the
      // new ID, so only a record for this ID is shown.
      const isDeleted: boolean = deletedId.value === props.agentId;
      const current: Agent | undefined =
        !isDeleted && agent.data.value?.id === props.agentId ? agent.data.value : undefined;

      return h(
        BasePersonalAgentDetails,
        {
          agent: current,
          className: props.className,
          error:
            (isDeleted ? null : toManagementErrorMessage(t, agent.error.value, 'user.agents.details.error')) ??
            toManagementErrorMessage(
              t,
              update.error.value ?? deletion.error.value ?? suspension.error.value,
              'user.agents.action.error',
            ),
          isChangingSuspension: suspension.isLoading.value,
          isDeleting: deletion.isLoading.value,
          isLoading:
            !isDeleted && (agent.isLoading.value || (Boolean(props.agentId) && !current && !agent.error.value)),
          isUpdating: update.isLoading.value,
          onDelete: props.deletable ? (): void => void deletion.mutate(props.agentId) : undefined,
          onSuspend: props.suspendable
            ? (): void => void suspension.mutate({action: 'suspend', id: props.agentId})
            : undefined,
          onUnsuspend: props.suspendable
            ? (): void => void suspension.mutate({action: 'unsuspend', id: props.agentId})
            : undefined,
          onUpdate: props.editable
            ? (payload: UpdateMeAgentRequest): Promise<boolean> =>
                update.mutate({id: props.agentId, payload}).then((saved: Agent | undefined) => saved !== undefined)
            : undefined,
          preferences: props.preferences,
        },
        {...slots},
      );
    };
  },
});

export default PersonalAgentDetails;
