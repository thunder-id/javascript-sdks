// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import type {BasicAgent} from '@thunderid/browser';
import {PersonalAgentDetails, PersonalAgentList} from '@thunderid/nextjs';
import {NeedsId} from './AdminParts';
import {bool, fromReact, isLive, jsx, omit, str} from './helpers';
import Narrow from './Narrow';
import {SamplePersonalAgentDetails, SamplePersonalAgentList} from './PersonalAgentStoryWidgets';
import type {Action, Args, ComponentDef, PropControl} from './types';

const SOURCE: PropControl = {
  control: ['base', 'live'],
  description:
    "base renders the Base component from @thunderid/react with sample agents; live manages the signed-in user's personal agents through server actions.",
  name: 'source',
  type: "'base' | 'live' (playground only)",
};

const SUSPENDABLE: PropControl = {
  control: 'bool',
  description: 'Lets the user suspend agents and lift their own suspension.',
  name: 'suspendable',
  type: 'boolean',
};

export const PERSONAL_AGENT_LIST_STORY: ComponentDef = {
  code: (args: Args) =>
    isLive(args)
      ? {
          imports: ['PersonalAgentList'],
          jsx: jsx('PersonalAgentList', omit(args, 'source', 'empty'), {
            extra: ['onSelect={(agent) => setAgentId(agent.id)}'],
          }),
        }
      : fromReact({
          imports: ['BasePersonalAgentList'],
          jsx: jsx('BasePersonalAgentList', omit(args, 'source', 'empty', 'suspendable'), {
            extra: [
              'agents={agents}',
              'onSelect={select}',
              ...(bool(args, 'suspendable') ? ['onSuspendAll={suspendAll}'] : []),
            ],
          }),
        }),
  controls: [
    SOURCE,
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
  render: (args: Args, action: Action) => (
    <Narrow width={640}>
      {isLive(args) ? (
        <PersonalAgentList
          suspendable={bool(args, 'suspendable')}
          title={str(args, 'title') || undefined}
          onSelect={(agent: BasicAgent) => action('onSelect', agent.id)}
        />
      ) : (
        <SamplePersonalAgentList args={args} action={action} />
      )}
    </Narrow>
  ),
  stories: [
    {args: {suspendable: true}, id: 'base', name: 'Sample agents'},
    {args: {empty: true}, id: 'empty', name: 'No agents'},
    {args: {source: 'live', suspendable: true}, id: 'live', name: 'Signed-in user'},
  ],
};

export const PERSONAL_AGENT_DETAILS_STORY: ComponentDef = {
  code: (args: Args) =>
    isLive(args)
      ? {
          imports: ['PersonalAgentDetails'],
          jsx: jsx('PersonalAgentDetails', omit(args, 'source', 'sample', 'isLoading', 'error'), {
            extra: ['onDeleted={backToList}'],
          }),
        }
      : fromReact({
          imports: ['BasePersonalAgentDetails'],
          jsx: jsx(
            'BasePersonalAgentDetails',
            {},
            {
              extra: [
                'agent={agent}',
                ...(bool(args, 'editable') ? ['onUpdate={update}'] : []),
                ...(bool(args, 'deletable') ? ['onDelete={remove}'] : []),
                ...(bool(args, 'suspendable') ? ['onSuspend={suspend}', 'onUnsuspend={unsuspend}'] : []),
              ],
            },
          ),
        }),
  controls: [
    SOURCE,
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
      return <NeedsId name="agentId" from="PersonalAgentList" />;
    }

    return (
      <Narrow width={640}>
        {isLive(args) ? (
          <PersonalAgentDetails
            agentId={str(args, 'agentId')}
            editable={bool(args, 'editable')}
            deletable={bool(args, 'deletable')}
            suspendable={bool(args, 'suspendable')}
            onDeleted={() => action('onDeleted')}
          />
        ) : (
          <SamplePersonalAgentDetails key={str(args, 'sample')} args={args} action={action} />
        )}
      </Narrow>
    );
  },
  stories: [
    {args: {deletable: true, editable: true, suspendable: true}, id: 'base', name: 'Sample agent'},
    {args: {sample: 'pa-2', suspendable: true}, id: 'owner-suspended', name: 'Suspended by its owner'},
    {args: {sample: 'pa-3', suspendable: true}, id: 'org-suspended', name: 'Suspended by the organization'},
    {args: {source: 'live', suspendable: true}, id: 'live', name: 'Signed-in user (needs agentId)'},
  ],
};
