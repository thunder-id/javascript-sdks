// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  type AgentListResponse,
  AgentQueryKeys,
  type BasicAgent,
  type Preferences,
  type SuspendAllMeAgentsResponse,
  toManagementErrorMessage,
} from '@thunderid/browser';
import {
  BasePersonalAgentList,
  type ResourceMutationResult,
  type ResourceQueryResult,
  useI18n,
  useResourceMutation,
  useResourceQuery,
} from '@thunderid/vue';
import {type Component, type PropType, type Ref, type SetupContext, type VNode, defineComponent, h, ref} from 'vue';
import NuxtAPIRoutes from '../../constants/NuxtAPIRoutes';
import loadMeAgentFromRoute from '../../utils/loadMeAgentFromRoute';

type PersonalAgentListProps = Readonly<{
  className: string;
  description: string | undefined;
  limit: number;
  onSelect: ((agent: BasicAgent) => void) | undefined;
  preferences: Preferences | undefined;
  selectedAgentId: string | undefined;
  suspendable: boolean;
  title: string | undefined;
}>;

/**
 * Nuxt-specific PersonalAgentList container.
 *
 * Lists the signed-in user's personal agents through `GET /api/auth/user/agents` (`NuxtAPIRoutes.USER_AGENTS`), and
 * suspends them all through `POST /api/auth/user/agents/suspend`, with the server-held session, so the access token
 * never reaches the browser.
 *
 * Renders `BasePersonalAgentList` from `@thunderid/vue`, with the same props, events and slots as the Vue SDK's
 * `PersonalAgentList`.
 */
const PersonalAgentList: Component = defineComponent({
  name: 'PersonalAgentList',
  props: {
    className: {default: '', type: String},
    description: {default: undefined, type: String},
    limit: {default: 20, type: Number},
    onSelect: {default: undefined, type: Function as PropType<(agent: BasicAgent) => void>},
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    selectedAgentId: {default: undefined, type: String},
    suspendable: {default: false, type: Boolean},
    title: {default: undefined, type: String},
  },
  setup(props: PersonalAgentListProps, {slots}: SetupContext): () => VNode {
    const {t} = useI18n();
    const offset: Ref<number> = ref(0);
    const suspendedCount: Ref<number | null> = ref(null);

    const list: ResourceQueryResult<AgentListResponse> = useResourceQuery(
      () => [AgentQueryKeys.ME_AGENTS, {limit: props.limit, offset: offset.value}],
      () =>
        loadMeAgentFromRoute(
          $fetch<AgentListResponse>(NuxtAPIRoutes.USER_AGENTS, {query: {limit: props.limit, offset: offset.value}}),
        ),
    );
    const suspendAll: ResourceMutationResult<SuspendAllMeAgentsResponse, void> = useResourceMutation(
      () =>
        loadMeAgentFromRoute(
          $fetch<SuspendAllMeAgentsResponse>(`${NuxtAPIRoutes.USER_AGENTS}/suspend`, {method: 'POST'}),
        ),
      () => [[AgentQueryKeys.ME_AGENT], [AgentQueryKeys.ME_AGENTS]],
      {
        onSuccess: (result: SuspendAllMeAgentsResponse) => {
          suspendedCount.value = result.suspendedCount;
        },
      },
    );

    return (): VNode =>
      h(
        BasePersonalAgentList,
        {
          actionError: toManagementErrorMessage(t, suspendAll.error.value, 'user.agents.action.error'),
          agents: list.data.value?.agents ?? [],
          className: props.className,
          description: props.description,
          error: toManagementErrorMessage(t, list.error.value, 'user.agents.list.error'),
          isLoading: list.isLoading.value,
          isSuspendingAll: suspendAll.isLoading.value,
          limit: props.limit,
          offset: offset.value,
          onPageChange: (next: number): void => {
            offset.value = next;
            suspendedCount.value = null;
          },
          onSelect: props.onSelect,
          onSuspendAll: props.suspendable ? (): void => void suspendAll.mutate(undefined) : undefined,
          preferences: props.preferences,
          selectedAgentId: props.selectedAgentId,
          suspendedCount: suspendedCount.value,
          title: props.title,
          totalResults: list.data.value?.totalResults,
        },
        {...slots},
      );
  },
});

export default PersonalAgentList;
