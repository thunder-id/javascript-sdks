// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import type {Agent, BasicAgent, SuspensionAppliedBy, UpdateMeAgentRequest} from '@thunderid/browser';
import {BasePersonalAgentDetails, BasePersonalAgentList} from '@thunderid/react';
import {ReactElement, useState} from 'react';
import {bool, str} from './helpers';
import type {Action, Args} from './types';

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
export const SamplePersonalAgentList = ({action, args}: {action: Action; args: Args}): ReactElement => {
  const [agents, setAgents] = useState<Agent[]>(SAMPLE_PERSONAL_AGENTS);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [suspendedCount, setSuspendedCount] = useState<number | null>(null);

  return (
    <BasePersonalAgentList
      agents={bool(args, 'empty') ? [] : agents}
      title={str(args, 'title') || undefined}
      selectedAgentId={selectedId}
      suspendedCount={suspendedCount}
      onSelect={(agent: BasicAgent): void => {
        action('onSelect', agent.id);
        setSelectedId(agent.id);
      }}
      onSuspendAll={
        bool(args, 'suspendable')
          ? (): void => {
              const count: number = agents.filter(
                (agent: Agent) => !agent.status?.details?.appliedBy?.includes('owner'),
              ).length;
              action('onSuspendAll', String(count));
              setAgents((current: Agent[]) =>
                current.map((agent: Agent) => ({...agent, status: suspendedByOwner(agent)})),
              );
              setSuspendedCount(count);
            }
          : undefined
      }
    />
  );
};

/** The Base details with one sample agent, edited and suspended locally. */
export const SamplePersonalAgentDetails = ({action, args}: {action: Action; args: Args}): ReactElement => {
  const initial: Agent =
    SAMPLE_PERSONAL_AGENTS.find((agent: Agent) => agent.id === str(args, 'sample')) ?? SAMPLE_PERSONAL_AGENTS[0];
  const [agent, setAgent] = useState<Agent | undefined>(initial);
  const change = (next: (current: Agent) => Agent): void =>
    setAgent((current: Agent | undefined) => current && next(current));

  return (
    <BasePersonalAgentDetails
      agent={agent}
      isLoading={bool(args, 'isLoading')}
      error={str(args, 'error') || null}
      onUpdate={
        bool(args, 'editable')
          ? (changes: UpdateMeAgentRequest): void => {
              action('onUpdate', JSON.stringify(changes));
              change((current: Agent) => ({
                ...current,
                attributes: changes.attributes,
                description: changes.description,
                inboundAuthConfig: oauth(changes.grantTypes, changes.redirectUris),
              }));
            }
          : undefined
      }
      onDelete={
        bool(args, 'deletable')
          ? (): void => {
              action('onDelete', initial.id);
              setAgent(undefined);
            }
          : undefined
      }
      onSuspend={
        bool(args, 'suspendable')
          ? (): void => {
              action('onSuspend', initial.id);
              change((current: Agent) => ({...current, status: suspendedByOwner(current)}));
            }
          : undefined
      }
      onUnsuspend={
        bool(args, 'suspendable')
          ? (): void => {
              action('onUnsuspend', initial.id);
              change((current: Agent) => ({...current, status: liftedByOwner(current)}));
            }
          : undefined
      }
    />
  );
};
