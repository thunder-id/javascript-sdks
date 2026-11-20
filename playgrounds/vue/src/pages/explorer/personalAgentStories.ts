// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {resolveResourceEndpoint} from '@thunderid/browser';
import type {Agent, AgentListResponse, BasicAgent, SuspensionAppliedBy, UpdateMeAgentRequest} from '@thunderid/browser';
import {
  BasePersonalAgentDetails,
  BasePersonalAgentList,
  PERSONAL_AGENT_KIND,
  PersonalAgentDetails,
  PersonalAgentList,
  getMeAgents,
  useThunderID,
} from '@thunderid/vue';
import {Component, defineComponent, h, PropType, Ref, ref, VNode} from 'vue';
import FirstResource from './FirstResource';
import {bool, handler, omit, quoted, SOURCE_CONTROL, str, tpl} from './storyKit';
import type {Action, Args, ComponentDef, PropControl, Snippet} from './types';
import {narrow} from './widgets';
import useApiQuery from '../../lib/useApiQuery';

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
const SamplePersonalAgentList: Component = defineComponent({
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
          props.action('select', quoted(agent.id));
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
const SamplePersonalAgentDetails: Component = defineComponent({
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
              props.action('delete', quoted(initial.id));
              agent.value = undefined;
            }
          : undefined,
        onSuspend: props.suspendable
          ? (): void => {
              props.action('suspend', quoted(initial.id));
              change((current: Agent) => ({...current, status: suspendedByOwner(current)}));
            }
          : undefined,
        onUnsuspend: props.suspendable
          ? (): void => {
              props.action('unsuspend', quoted(initial.id));
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

const isLive = (args: Args): boolean => str(args, 'source') === 'live';

const SUSPENDABLE: PropControl = {
  control: 'bool',
  description: 'Lets the user suspend agents and lift their own suspension.',
  name: 'suspendable',
  type: 'boolean',
};

export const PERSONAL_AGENT_COMPONENTS: ComponentDef[] = [
  {
    code: (args: Args): Snippet =>
      isLive(args)
        ? {
            imports: ['BasicAgent', 'PersonalAgentList'],
            script: ['const handleSelect = (agent: BasicAgent): void => {};'],
            template: tpl('PersonalAgentList', omit(args, 'source', 'empty'), {extra: ['@select="handleSelect"']}),
          }
        : {
            imports: ['BasePersonalAgentList', 'BasicAgent'],
            script: [
              'const agents = ref<BasicAgent[]>([]);',
              'const handleSelect = (agent: BasicAgent): void => {};',
              ...(bool(args, 'suspendable') ? handler('handleSuspendAll') : []),
            ],
            template: tpl('BasePersonalAgentList', omit(args, 'source', 'empty', 'suspendable'), {
              extra: [
                ':agents="agents"',
                '@select="handleSelect"',
                ...(bool(args, 'suspendable') ? ['@suspend-all="handleSuspendAll"'] : []),
              ],
            }),
            vueImports: ['ref'],
          },
    controls: [
      SOURCE_CONTROL,
      SUSPENDABLE,
      {
        control: 'bool',
        description: 'Base only: shows the empty list.',
        name: 'empty',
        type: 'boolean (playground only)',
      },
      {control: 'text', description: 'Heading. Leave empty for the default.', name: 'title', type: 'string'},
    ],
    defaults: {empty: false, source: 'base', suspendable: false, title: ''},
    group: 'User',
    id: 'personalagentlist',
    live: true,
    name: 'PersonalAgentList',
    render: (args: Args, action: Action): VNode =>
      narrow(
        640,
        isLive(args)
          ? h(PersonalAgentList, {
              onSelect: (agent: BasicAgent) => action('select', quoted(agent.id)),
              suspendable: bool(args, 'suspendable'),
              title: str(args, 'title') || undefined,
            })
          : h(SamplePersonalAgentList, {
              action,
              empty: bool(args, 'empty'),
              suspendable: bool(args, 'suspendable'),
              title: str(args, 'title') || undefined,
            }),
      ),
    stories: [
      {args: {suspendable: true}, id: 'base', name: 'Sample agents'},
      {args: {empty: true}, id: 'empty', name: 'No agents'},
      {args: {source: 'live', suspendable: true}, id: 'live', name: 'Signed-in user'},
    ],
  },
  {
    code: (args: Args): Snippet =>
      isLive(args)
        ? {
            imports: ['PersonalAgentDetails'],
            script: handler('handleDeleted'),
            template: tpl('PersonalAgentDetails', omit(args, 'source', 'sample', 'isLoading', 'error', 'agentId'), {
              extra: [
                str(args, 'agentId') ? `agent-id="${str(args, 'agentId')}"` : ':agent-id="agentId"',
                '@deleted="handleDeleted"',
              ],
            }),
          }
        : {
            imports: ['Agent', 'BasePersonalAgentDetails', 'UpdateMeAgentRequest'],
            script: [
              'const agent = ref<Agent>();',
              ...(bool(args, 'editable') ? ['const handleUpdate = (changes: UpdateMeAgentRequest): void => {};'] : []),
              ...(bool(args, 'deletable') ? handler('handleDelete') : []),
              ...(bool(args, 'suspendable') ? [...handler('handleSuspend'), ...handler('handleUnsuspend')] : []),
            ],
            template: tpl(
              'BasePersonalAgentDetails',
              {},
              {
                extra: [
                  ':agent="agent"',
                  ...(bool(args, 'editable') ? ['@update="handleUpdate"'] : []),
                  ...(bool(args, 'deletable') ? ['@delete="handleDelete"'] : []),
                  ...(bool(args, 'suspendable') ? ['@suspend="handleSuspend"', '@unsuspend="handleUnsuspend"'] : []),
                ],
              },
            ),
            vueImports: ['ref'],
          },
    controls: [
      SOURCE_CONTROL,
      {
        control: 'text',
        description: 'Live only: the ID of one of your personal agents. Empty uses your first one.',
        name: 'agentId',
        type: 'string',
      },
      {
        control: ['pa-1', 'pa-2', 'pa-3'],
        description: 'Base only: pa-1 is active, pa-2 is suspended by its owner, pa-3 by the organization.',
        name: 'sample',
        type: 'string (playground only)',
      },
      {control: 'bool', description: 'Lets the user edit the agent.', name: 'editable', type: 'boolean'},
      {control: 'bool', description: 'Lets the user delete the agent.', name: 'deletable', type: 'boolean'},
      SUSPENDABLE,
      {control: 'bool', description: 'Base only: shows the loading state.', name: 'isLoading', type: 'boolean'},
      {control: 'text', description: 'Base only: an error message to show.', name: 'error', type: 'string'},
    ],
    defaults: {
      agentId: '',
      deletable: false,
      editable: false,
      error: '',
      isLoading: false,
      sample: 'pa-1',
      source: 'base',
      suspendable: false,
    },
    group: 'User',
    id: 'personalagentdetails',
    live: true,
    name: 'PersonalAgentDetails',
    render: (args: Args, action: Action): VNode =>
      narrow(
        640,
        isLive(args)
          ? h(FirstResource, {
              explicit: str(args, 'agentId'),
              noun: 'personal agent',
              pick: (data: unknown): string | undefined => (data as AgentListResponse | undefined)?.agents?.[0]?.id,
              query: () => {
                const {baseUrl, endpoints, instanceId} = useThunderID();
                const url: string | undefined = resolveResourceEndpoint('usersMeAgents', {endpoints});

                return useApiQuery(() => getMeAgents({baseUrl, instanceId, kind: PERSONAL_AGENT_KIND, limit: 1, url}));
              },
              render: (agentId: string): VNode =>
                h(PersonalAgentDetails, {
                  agentId,
                  deletable: bool(args, 'deletable'),
                  editable: bool(args, 'editable'),
                  key: agentId,
                  onDeleted: () => action('deleted', quoted(agentId)),
                  suspendable: bool(args, 'suspendable'),
                }),
            })
          : h(SamplePersonalAgentDetails, {
              action,
              deletable: bool(args, 'deletable'),
              editable: bool(args, 'editable'),
              error: str(args, 'error') || null,
              isLoading: bool(args, 'isLoading'),
              key: str(args, 'sample'),
              sample: str(args, 'sample'),
              suspendable: bool(args, 'suspendable'),
            }),
      ),
    stories: [
      {args: {deletable: true, editable: true, suspendable: true}, id: 'base', name: 'Sample agent'},
      {args: {sample: 'pa-2', suspendable: true}, id: 'owner-suspended', name: 'Suspended by its owner'},
      {args: {sample: 'pa-3', suspendable: true}, id: 'org-suspended', name: 'Suspended by the organization'},
      {args: {source: 'live', suspendable: true}, id: 'live', name: 'Signed-in user (first agent)'},
    ],
  },
];
