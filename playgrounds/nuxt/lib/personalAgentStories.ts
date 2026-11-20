// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {BasicAgent} from '@thunderid/browser';
import {h, type VNode} from 'vue';
import {SamplePersonalAgentDetails, SamplePersonalAgentList} from './personalAgentSamples';
import {tag} from './storyCode';
import type {Action, Args, ArgValue, ComponentDef, PropControl} from './storyTypes';
import {narrow} from './storyWidgets';
import {PersonalAgentDetails, PersonalAgentList} from '#components';

const str = (args: Args, key: string): string => String(args[key] ?? '');
const bool = (args: Args, key: string): boolean => args[key] === true;
const isLive = (args: Args): boolean => str(args, 'source') === 'live';
const omit = (args: Args, ...keys: string[]): Args =>
  Object.fromEntries(Object.entries(args).filter(([key]: [string, ArgValue]) => !keys.includes(key)));

const SUSPENDABLE: PropControl = {
  control: 'bool',
  description: 'Lets the user suspend agents and lift their own suspension.',
  name: 'suspendable',
  type: 'boolean',
};

const notice = (message: string): VNode => h('div', {class: 'pg-warning', role: 'status'}, message);

export const PERSONAL_AGENT_COMPONENTS: ComponentDef[] = [
  {
    code: (args: Args) => ({
      imports: [],
      template: tag('PersonalAgentList', omit(args, 'source', 'empty'), {
        defaults: {suspendable: false},
        extra: ['@select="handleSelect"'],
      }),
    }),
    controls: [
      {
        control: ['base', 'live'],
        description:
          'base renders BasePersonalAgentList with sample agents; live lists through GET /api/auth/user/agents and suspends all through POST /api/auth/user/agents/suspend.',
        name: 'source',
        type: "'base' | 'live' (playground only)",
      },
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
    render: (args: Args, action: Action) =>
      narrow(
        640,
        isLive(args)
          ? h(PersonalAgentList, {
              onSelect: (agent: BasicAgent) => action('select', `"${agent.id}"`),
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
    code: (args: Args) => ({
      imports: [],
      template: tag('PersonalAgentDetails', omit(args, 'source', 'sample', 'isLoading', 'error'), {
        defaults: {deletable: false, editable: false, suspendable: false},
        extra: ['@deleted="handleDeleted"'],
      }),
    }),
    controls: [
      {
        control: ['base', 'live'],
        description:
          'base renders BasePersonalAgentDetails with a sample agent; live reads and changes the agent through /api/auth/user/agents/{id}.',
        name: 'source',
        type: "'base' | 'live' (playground only)",
      },
      {
        control: 'text',
        description: 'Live only: the ID of one of your personal agents.',
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
    render: (args: Args, action: Action) => {
      if (isLive(args) && !str(args, 'agentId')) {
        return notice(
          'Set agentId in Controls: select a row in PersonalAgentList and copy its id from the Actions panel.',
        );
      }

      return narrow(
        640,
        isLive(args)
          ? h(PersonalAgentDetails, {
              agentId: str(args, 'agentId'),
              deletable: bool(args, 'deletable'),
              editable: bool(args, 'editable'),
              key: str(args, 'agentId'),
              onDeleted: () => action('deleted', `"${str(args, 'agentId')}"`),
              suspendable: bool(args, 'suspendable'),
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
      );
    },
    stories: [
      {args: {deletable: true, editable: true, suspendable: true}, id: 'base', name: 'Sample agent'},
      {args: {sample: 'pa-2', suspendable: true}, id: 'owner-suspended', name: 'Suspended by its owner'},
      {args: {sample: 'pa-3', suspendable: true}, id: 'org-suspended', name: 'Suspended by the organization'},
      {args: {source: 'live', suspendable: true}, id: 'live', name: 'Signed-in user (needs agentId)'},
    ],
  },
];
