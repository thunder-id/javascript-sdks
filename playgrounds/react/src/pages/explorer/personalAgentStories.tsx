// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {PersonalAgentDetails, PersonalAgentList} from '@thunderid/react';
import {RequiresId} from './AdminStoryWidgets';
import {SamplePersonalAgentDetails, SamplePersonalAgentList} from './PersonalAgentStoryWidgets';
import {bool, jsx, str} from './storyHelpers';
import {Narrow} from './StoryWidgets';
import type {Action, Args, ComponentDef, PropControl} from './types';

const pick = (args: Args, ...keys: string[]): Args =>
  Object.fromEntries(Object.entries(args).filter(([key]: [string, unknown]) => keys.includes(key)));

const SOURCE: PropControl = {
  control: ['base', 'live', 'custom'],
  description:
    "base renders the Base component with sample agents; live manages the signed-in user's personal agents; custom draws the sample agents with MUI through the children render function.",
  name: 'source',
  type: "'base' | 'live' | 'custom' (playground only)",
};

const SUSPENDABLE: PropControl = {
  control: 'bool',
  description: 'Lets the user suspend agents and lift their own suspension.',
  name: 'suspendable',
  type: 'boolean',
};

export const PERSONAL_AGENT_LIST_STORY: ComponentDef = {
  code: (args: Args) => {
    if (str(args, 'source') === 'custom') {
      return {
        imports: ['PersonalAgentList', 'getAgentName'],
        jsx: `<PersonalAgentList suspendable onSelect={(agent) => setAgentId(agent.id)}>
  {({actionError, agents, error, limit, offset, onPageChange, onSelect, onSuspendAll, totalResults}) => (
    <List dense>
      {error && <Alert severity="error">{error}</Alert>}
      {actionError && <Alert severity="error">{actionError}</Alert>}
      {onSuspendAll && (
        <Button color="error" onClick={() => window.confirm('Suspend every agent?') && onSuspendAll()}>
          Suspend all
        </Button>
      )}
      {agents.map((agent) => (
        <ListItemButton key={agent.id} onClick={() => onSelect?.(agent)}>
          <ListItemText primary={getAgentName(agent)} secondary={agent.status?.value} />
        </ListItemButton>
      ))}
      {offset > 0 && <Button onClick={() => onPageChange?.(offset - limit)}>Previous</Button>}
      {offset + limit < totalResults && <Button onClick={() => onPageChange?.(offset + limit)}>Next</Button>}
    </List>
  )}
</PersonalAgentList>`,
        otherImports: ["import {Alert, Button, List, ListItemButton, ListItemText} from '@mui/material';"],
      };
    }

    return str(args, 'source') === 'live'
      ? {
          imports: ['PersonalAgentList'],
          jsx: jsx('PersonalAgentList', pick(args, 'suspendable', 'title'), {
            extra: ['onSelect={(agent) => setAgentId(agent.id)}'],
          }),
        }
      : {
          imports: ['BasePersonalAgentList'],
          jsx: jsx('BasePersonalAgentList', pick(args, 'title'), {
            extra: [
              'agents={agents}',
              'onSelect={select}',
              ...(bool(args, 'suspendable') ? ['onSuspendAll={suspendAll}'] : []),
            ],
          }),
        };
  },
  controls: [
    SOURCE,
    SUSPENDABLE,
    {
      control: 'bool',
      description: 'Shows the empty list (base only).',
      name: 'empty',
      type: 'boolean (playground only)',
    },
    {control: 'text', description: 'Heading. Pass an empty string for the default.', name: 'title', type: 'string'},
  ],
  defaults: {empty: false, source: 'base', suspendable: false, title: ''},
  group: 'User',
  id: 'personalagentlist',
  live: true,
  name: 'PersonalAgentList',
  render: (args: Args, action: Action) => (
    <Narrow width={640}>
      {str(args, 'source') === 'live' ? (
        <PersonalAgentList
          suspendable={bool(args, 'suspendable')}
          title={str(args, 'title') || undefined}
          onSelect={(agent) => action('onSelect', agent.id)}
        />
      ) : (
        <SamplePersonalAgentList args={args} action={action} />
      )}
    </Narrow>
  ),
  stories: [
    {args: {suspendable: true}, id: 'base', name: 'Sample agents'},
    {args: {empty: true}, id: 'empty', name: 'No agents'},
    {args: {source: 'custom', suspendable: true}, id: 'custom', name: 'Custom rendering'},
    {args: {source: 'live', suspendable: true}, id: 'live', name: 'Signed-in user'},
  ],
};

export const PERSONAL_AGENT_DETAILS_STORY: ComponentDef = {
  code: (args: Args) => {
    if (str(args, 'source') === 'custom') {
      return {
        imports: ['PersonalAgentDetails', 'getAgentName'],
        jsx: `<PersonalAgentDetails agentId={agentId} suspendable>
  {({agent, onSuspend, onUnsuspend, error}) => (
    <Stack spacing={1}>
      {error && <Alert severity="error">{error}</Alert>}
      {agent && <Typography variant="h6">{getAgentName(agent)}</Typography>}
      {onSuspend && <Button color="error" onClick={onSuspend}>Suspend</Button>}
      {onUnsuspend && <Button onClick={onUnsuspend}>Unsuspend</Button>}
    </Stack>
  )}
</PersonalAgentDetails>`,
        otherImports: ["import {Alert, Button, Stack, Typography} from '@mui/material';"],
      };
    }

    return str(args, 'source') === 'live'
      ? {
          imports: ['PersonalAgentDetails'],
          jsx: jsx('PersonalAgentDetails', pick(args, 'agentId', 'editable', 'deletable', 'suspendable'), {
            extra: ['onDeleted={backToList}'],
          }),
        }
      : {
          imports: ['BasePersonalAgentDetails'],
          jsx: jsx('BasePersonalAgentDetails', pick(args, 'isLoading', 'error'), {
            extra: [
              'agent={agent}',
              ...(bool(args, 'editable') ? ['onUpdate={update}'] : []),
              ...(bool(args, 'deletable') ? ['onDelete={remove}'] : []),
              ...(bool(args, 'suspendable') ? ['onSuspend={suspend}', 'onUnsuspend={unsuspend}'] : []),
            ],
          }),
        };
  },
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
    if (str(args, 'source') === 'live') {
      if (!str(args, 'agentId')) return <RequiresId name="agentId" />;

      return (
        <Narrow width={640}>
          <PersonalAgentDetails
            agentId={str(args, 'agentId')}
            editable={bool(args, 'editable')}
            deletable={bool(args, 'deletable')}
            suspendable={bool(args, 'suspendable')}
            onDeleted={() => action('onDeleted')}
          />
        </Narrow>
      );
    }

    return (
      <Narrow width={640}>
        <SamplePersonalAgentDetails key={str(args, 'sample')} args={args} action={action} />
      </Narrow>
    );
  },
  stories: [
    {args: {deletable: true, editable: true, suspendable: true}, id: 'base', name: 'Sample agent'},
    {args: {sample: 'pa-2', suspendable: true}, id: 'owner-suspended', name: 'Suspended by its owner'},
    {args: {sample: 'pa-3', suspendable: true}, id: 'org-suspended', name: 'Suspended by the organization'},
    {args: {source: 'custom', suspendable: true}, id: 'custom', name: 'Custom rendering'},
    {args: {source: 'live', suspendable: true}, id: 'live', name: 'Signed-in user (needs agentId)'},
  ],
};
