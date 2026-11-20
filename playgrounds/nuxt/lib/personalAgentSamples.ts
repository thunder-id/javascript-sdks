// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {Agent, BasicAgent, SuspensionAppliedBy, UpdateMeAgentRequest} from '@thunderid/browser';
import {BasePersonalAgentDetails, BasePersonalAgentList} from '@thunderid/vue';
import {defineComponent, h, ref, type Component, type PropType, type Ref, type VNode} from 'vue';
import type {Action} from './storyTypes';

const oauth = (grantTypes: string[], redirectUris: string[]): Agent['inboundAuthConfig'] => [
  {
    config: {grantTypes, redirectUris, responseTypes: grantTypes.includes('authorization_code') ? ['code'] : []},
    type: 'oauth2',
  },
];

/** Sample personal agents for the Base stories. Nothing here reaches a server. */
const SAMPLE_PERSONAL_AGENTS: Agent[] = [
  {
    attributes: {name: 'Spending assistant', software: 'Budget Buddy 2.1'},
    clientId: 'pa_7f3e9c2a',
    description: 'Answers questions about my spending',
    id: 'pa-1',
    inboundAuthConfig: oauth(['authorization_code', 'refresh_token'], ['https://assistant.example.com/callback']),
    kind: 'personal-assistant',
    ouId: 'ou-1',
    status: {value: 'ACTIVE'},
    type: 'default',
  },
  {
    attributes: {name: 'Travel planner'},
    clientId: 'pa_41b0d7e5',
    id: 'pa-2',
    inboundAuthConfig: oauth(['authorization_code'], ['https://travel.example.com/callback']),
    kind: 'personal-assistant',
    ouId: 'ou-1',
    status: {details: {appliedBy: ['owner'], reason: 'OWNER_SUSPENSION'}, value: 'SUSPENDED'},
    type: 'default',
  },
  {
    attributes: {name: 'Inbox triage'},
    clientId: 'pa_9c2d11aa',
    id: 'pa-3',
    inboundAuthConfig: oauth(['authorization_code'], ['https://inbox.example.com/callback']),
    kind: 'personal-assistant',
    ouId: 'ou-1',
    status: {details: {appliedBy: ['organization'], reason: 'ADMINISTRATIVE_SUSPENSION'}, value: 'SUSPENDED'},
    type: 'default',
  },
];

const othersThan = (agent: Agent): SuspensionAppliedBy[] =>
  (agent.status?.details?.appliedBy ?? []).filter((party: SuspensionAppliedBy) => party !== 'owner');

const suspendedByOwner = (agent: Agent): Agent['status'] => ({
  details: {appliedBy: [...othersThan(agent), 'owner']},
  value: 'SUSPENDED',
});

const liftedByOwner = (agent: Agent): Agent['status'] =>
  othersThan(agent).length ? {details: {appliedBy: othersThan(agent)}, value: 'SUSPENDED'} : {value: 'ACTIVE'};

/** The Base list with the sample agents, suspended locally. */
export const SamplePersonalAgentList: Component = defineComponent({
  name: 'SamplePersonalAgentList',
  props: {
    action: {required: true, type: Function as PropType<Action>},
    empty: {default: false, type: Boolean},
    suspendable: {default: false, type: Boolean},
    title: {default: undefined, type: String},
  },
  setup(props: {action: Action; empty: boolean; suspendable: boolean; title?: string}): () => VNode {
    const agents: Ref<Agent[]> = ref(SAMPLE_PERSONAL_AGENTS);
    const selectedId: Ref<string | undefined> = ref(undefined);
    const suspendedCount: Ref<number | null> = ref(null);

    return (): VNode =>
      h(BasePersonalAgentList, {
        agents: props.empty ? [] : agents.value,
        onSelect: (agent: BasicAgent): void => {
          selectedId.value = agent.id;
          props.action('select', `"${agent.id}"`);
        },
        onSuspendAll: props.suspendable
          ? (): void => {
              const count: number = agents.value.filter(
                (agent: Agent) => !agent.status?.details?.appliedBy?.includes('owner'),
              ).length;
              agents.value = agents.value.map((agent: Agent) => ({...agent, status: suspendedByOwner(agent)}));
              suspendedCount.value = count;
              props.action('suspend-all', String(count));
            }
          : undefined,
        selectedAgentId: selectedId.value,
        suspendedCount: suspendedCount.value,
        title: props.title,
      });
  },
});

/** The Base details with one sample agent, edited and suspended locally. */
export const SamplePersonalAgentDetails: Component = defineComponent({
  name: 'SamplePersonalAgentDetails',
  props: {
    action: {required: true, type: Function as PropType<Action>},
    deletable: {default: false, type: Boolean},
    editable: {default: false, type: Boolean},
    error: {default: null, type: String as PropType<string | null>},
    isLoading: {default: false, type: Boolean},
    sample: {default: 'pa-1', type: String},
    suspendable: {default: false, type: Boolean},
  },
  setup(props: {
    action: Action;
    deletable: boolean;
    editable: boolean;
    error: string | null;
    isLoading: boolean;
    sample: string;
    suspendable: boolean;
  }): () => VNode {
    const initial: Agent =
      SAMPLE_PERSONAL_AGENTS.find((agent: Agent) => agent.id === props.sample) ?? SAMPLE_PERSONAL_AGENTS[0];
    const agent: Ref<Agent | undefined> = ref(initial);
    const change = (next: (current: Agent) => Agent): void => {
      agent.value = agent.value && next(agent.value);
    };

    return (): VNode =>
      h(BasePersonalAgentDetails, {
        agent: agent.value,
        error: props.error,
        isLoading: props.isLoading,
        onDelete: props.deletable
          ? (): void => {
              props.action('delete', `"${initial.id}"`);
              agent.value = undefined;
            }
          : undefined,
        onSuspend: props.suspendable
          ? (): void => {
              props.action('suspend', `"${initial.id}"`);
              change((current: Agent) => ({...current, status: suspendedByOwner(current)}));
            }
          : undefined,
        onUnsuspend: props.suspendable
          ? (): void => {
              props.action('unsuspend', `"${initial.id}"`);
              change((current: Agent) => ({...current, status: liftedByOwner(current)}));
            }
          : undefined,
        onUpdate: props.editable
          ? (changes: UpdateMeAgentRequest): void => {
              props.action('update', JSON.stringify(changes));
              change((current: Agent) => ({
                ...current,
                attributes: changes.attributes,
                description: changes.description,
                inboundAuthConfig: oauth(changes.grantTypes, changes.redirectUris),
              }));
            }
          : undefined,
      });
  },
});
