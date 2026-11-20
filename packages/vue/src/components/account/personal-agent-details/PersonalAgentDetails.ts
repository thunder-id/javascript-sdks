// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  type Agent,
  AgentQueryKeys,
  type Preferences,
  type ResourceQueryKey,
  type UpdateMeAgentRequest,
  resolveResourceEndpoint,
  toManagementErrorMessage,
} from '@thunderid/browser';
import {type Component, type PropType, type Ref, type SetupContext, type VNode, defineComponent, h, ref} from 'vue';
import BasePersonalAgentDetails from './BasePersonalAgentDetails';
import deleteMeAgent from '../../../api/account/deleteMeAgent';
import getMeAgent from '../../../api/account/getMeAgent';
import suspendMeAgent from '../../../api/account/suspendMeAgent';
import unsuspendMeAgent from '../../../api/account/unsuspendMeAgent';
import updateMeAgent from '../../../api/account/updateMeAgent';
import useResourceMutation, {type ResourceMutationResult} from '../../../composables/management/useResourceMutation';
import useResourceQuery, {type ResourceQueryResult} from '../../../composables/management/useResourceQuery';
import useThunderID from '../../../composables/useThunderID';
import type {ThunderIDContext} from '../../../models/contexts';
import useAdminTranslation, {type AdminTranslate} from '../../management/shared/useAdminTranslation';

type PersonalAgentDetailsProps = Readonly<{
  agentId: string;
  className: string;
  deletable: boolean;
  editable: boolean;
  preferences: Preferences | undefined;
  suspendable: boolean;
}>;

/**
 * Shows one of the signed-in user's personal agents, and, when the app allows it, lets the user edit, delete and
 * suspend it. Emits `deleted` after the agent has been deleted.
 *
 * Slots: `actions`, rendered next to the agent's name; `default`, a scoped slot that replaces the view with custom
 * UI and receives `BasePersonalAgentDetailsRenderProps`.
 *
 * @example
 * ```vue
 * <PersonalAgentDetails :agent-id="agentId" editable deletable suspendable @deleted="agentId = null" />
 * ```
 */
const PersonalAgentDetails: Component = defineComponent({
  name: 'PersonalAgentDetails',
  props: {
    /** Identifier of the agent to show. */
    agentId: {required: true, type: String},
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** Whether the agent can be deleted from this view. */
    deletable: {default: false, type: Boolean},
    /** Whether the agent can be edited from this view. */
    editable: {default: false, type: Boolean},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    /** Whether the user can suspend the agent, and lift their own suspension, from this view. */
    suspendable: {default: false, type: Boolean},
  },
  emits: ['deleted'],
  setup(props: PersonalAgentDetailsProps, {emit, slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const {baseUrl, endpoints, instanceId}: ThunderIDContext = useThunderID();
    const url: string | undefined = resolveResourceEndpoint('usersMeAgents', {endpoints});
    // Built from the agent a request targeted, which may no longer be the one shown when the request completes.
    const changed = (id: string): ResourceQueryKey[] => [[AgentQueryKeys.ME_AGENT, id], [AgentQueryKeys.ME_AGENTS]];

    // These are the user's own requests, so they go through the SDK's transport for this instance, like the other
    // `users/me` operations, and never the management `http.fetcher` the composables would otherwise hand them.
    const agent: ResourceQueryResult<Agent> = useResourceQuery(
      () => [AgentQueryKeys.ME_AGENT, props.agentId],
      () => getMeAgent({agentId: props.agentId, baseUrl, instanceId, url}),
      {enabled: (): boolean => Boolean(props.agentId)},
    );
    const update: ResourceMutationResult<Agent, {id: string; payload: UpdateMeAgentRequest}> = useResourceMutation(
      ({id, payload}: {id: string; payload: UpdateMeAgentRequest}) =>
        updateMeAgent({agentId: id, baseUrl, instanceId, payload, url}),
      ({id}: {id: string}) => changed(id),
    );
    // The agent this component deleted, shown as gone from then on rather than as the last record read.
    const deletedId: Ref<string | null> = ref(null);
    const deletion: ResourceMutationResult<void, string> = useResourceMutation(
      (id: string) => deleteMeAgent({agentId: id, baseUrl, instanceId, url}),
      () => [[AgentQueryKeys.ME_AGENTS]],
      {
        onSuccess: (_: void, id: string): void => {
          deletedId.value = id;
          // A delete that completes after another agent was selected must not close that agent.
          if (id === props.agentId) {
            emit('deleted');
          }
        },
      },
    );
    const suspension: ResourceMutationResult<void, {action: 'suspend' | 'unsuspend'; id: string}> = useResourceMutation(
      ({action, id}: {action: 'suspend' | 'unsuspend'; id: string}) =>
        (action === 'suspend' ? suspendMeAgent : unsuspendMeAgent)({agentId: id, baseUrl, instanceId, url}),
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
            toManagementErrorMessage(t, agent.error.value, 'user.agents.details.error') ??
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
