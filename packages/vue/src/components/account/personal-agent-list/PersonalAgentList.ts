// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  type AgentListResponse,
  AgentQueryKeys,
  PERSONAL_AGENT_KIND,
  type Preferences,
  type SuspendAllMeAgentsResponse,
  resolveResourceEndpoint,
  toManagementErrorMessage,
} from '@thunderid/browser';
import {type Component, type PropType, type Ref, type SetupContext, type VNode, defineComponent, h, ref} from 'vue';
import BasePersonalAgentList from './BasePersonalAgentList';
import getMeAgents from '../../../api/account/getMeAgents';
import suspendAllMeAgents from '../../../api/account/suspendAllMeAgents';
import useResourceMutation, {type ResourceMutationResult} from '../../../composables/management/useResourceMutation';
import useResourceQuery, {type ResourceQueryResult} from '../../../composables/management/useResourceQuery';
import useThunderID from '../../../composables/useThunderID';
import type {ThunderIDContext} from '../../../models/contexts';
import useAdminTranslation, {type AdminTranslate} from '../../management/shared/useAdminTranslation';

type PersonalAgentListProps = Readonly<{
  className: string;
  description: string | undefined;
  limit: number;
  onSelect: ((agent: unknown) => void) | undefined;
  preferences: Preferences | undefined;
  selectedAgentId: string | undefined;
  suspendable: boolean;
  title: string | undefined;
}>;

/**
 * Lists the signed-in user's personal agents, a page at a time, and, when the app allows it, lets the user suspend
 * them all.
 *
 * Props: `suspendable` (default `false`), `limit`, `selectedAgentId`, `onSelect` (`@select`), `title`,
 * `description`, `className`, `preferences`. Slots: `actions`; `default`, a scoped slot that replaces the table with
 * custom UI and receives `BasePersonalAgentListRenderProps`.
 *
 * @example
 * ```vue
 * <PersonalAgentList suspendable @select="(agent) => (agentId = agent.id)" />
 * ```
 */
const PersonalAgentList: Component = defineComponent({
  name: 'PersonalAgentList',
  props: {
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** Text shown under the title. */
    description: {default: undefined, type: String},
    /** Page size. */
    limit: {default: 20, type: Number},
    /** Called when an agent is chosen. Rows are selectable only when set. Also available as `@select`. */
    onSelect: {default: undefined, type: Function as PropType<(agent: unknown) => void>},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    selectedAgentId: {default: undefined, type: String},
    /** Whether the user can suspend all their personal agents from this view. */
    suspendable: {default: false, type: Boolean},
    /** Heading of the list. Pass an empty string to hide it. */
    title: {default: undefined, type: String},
  },
  setup(props: PersonalAgentListProps, {slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const {baseUrl, endpoints, instanceId}: ThunderIDContext = useThunderID();
    const url: string | undefined = resolveResourceEndpoint('usersMeAgents', {endpoints});
    const offset: Ref<number> = ref(0);
    const suspendedCount: Ref<number | null> = ref(null);

    // These are the user's own requests, so they go through the SDK's transport for this instance, like the other
    // `users/me` operations, and never the management `http.fetcher` the composables would otherwise hand them.
    const list: ResourceQueryResult<AgentListResponse> = useResourceQuery(
      () => [AgentQueryKeys.ME_AGENTS, {limit: props.limit, offset: offset.value}],
      () =>
        getMeAgents({baseUrl, instanceId, kind: PERSONAL_AGENT_KIND, limit: props.limit, offset: offset.value, url}),
    );
    const suspendAll: ResourceMutationResult<SuspendAllMeAgentsResponse, void> = useResourceMutation(
      () => suspendAllMeAgents({baseUrl, instanceId, url}),
      () => [[AgentQueryKeys.ME_AGENT], [AgentQueryKeys.ME_AGENTS]],
      {
        onSuccess: (result: SuspendAllMeAgentsResponse): void => {
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
