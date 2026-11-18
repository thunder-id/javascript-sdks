// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import MuiAlert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  type Agent,
  type BasePersonalAgentDetailsRenderProps,
  type BasePersonalAgentListRenderProps,
  type BasicAgent,
  BasePersonalAgentDetails,
  BasePersonalAgentList,
  getAgentName,
  isPersonalAgentFormValid,
  type PersonalAgentFormValues,
  toPersonalAgentFormValues,
  toUpdateMeAgentRequest,
  type UpdateMeAgentRequest,
} from '@thunderid/react';
import {ChangeEvent, ReactElement, useState} from 'react';
import {ChipRow, DetailsCard, Mui} from './CustomRenderWidgets';
import {bool, str} from './storyHelpers';
import type {Action, Args} from './types';

const oauth = (grantTypes: string[], redirectUris: string[]): Agent['inboundAuthConfig'] => [
  {
    config: {grantTypes, redirectUris, responseTypes: grantTypes.includes('authorization_code') ? ['code'] : []},
    type: 'oauth2',
  },
];

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

const suspendedByOwner = (agent: Agent): Agent['status'] => {
  const others: ('cascade' | 'organization' | 'owner')[] = (agent.status?.details?.appliedBy ?? []).filter(
    (holder: string) => holder !== 'owner',
  );

  return {details: {appliedBy: [...others, 'owner']}, value: 'SUSPENDED'};
};

const liftedByOwner = (agent: Agent): Agent['status'] => {
  const others: ('cascade' | 'organization' | 'owner')[] = (agent.status?.details?.appliedBy ?? []).filter(
    (holder: string) => holder !== 'owner',
  );

  return others.length ? {details: {appliedBy: others}, value: 'SUSPENDED'} : {value: 'ACTIVE'};
};

/**
 * The personal agent list drawn with MUI through the children render function. A custom render owns the
 * confirmation suspend-all needs, so it asks before calling `onSuspendAll`.
 */
export const MuiPersonalAgentList = ({
  actionError,
  agents,
  error,
  limit,
  offset,
  onPageChange,
  onSelect,
  onSuspendAll,
  suspendedCount,
  totalResults,
}: BasePersonalAgentListRenderProps): ReactElement => {
  const [confirming, setConfirming] = useState<boolean>(false);

  return (
    <Mui>
      <Stack spacing={1}>
        {error && <MuiAlert severity="error">{error}</MuiAlert>}
        {actionError && <MuiAlert severity="error">{actionError}</MuiAlert>}
        {suspendedCount !== null && <MuiAlert severity="success">{`Agents suspended: ${suspendedCount}`}</MuiAlert>}
        {onSuspendAll &&
          (confirming ? (
            <Stack direction="row" spacing={1} sx={{alignItems: 'center', alignSelf: 'flex-end'}}>
              <Typography variant="body2">Suspend every agent?</Typography>
              <Button onClick={(): void => setConfirming(false)}>Cancel</Button>
              <Button
                color="error"
                variant="contained"
                onClick={(): void => {
                  setConfirming(false);
                  onSuspendAll();
                }}
              >
                Suspend all
              </Button>
            </Stack>
          ) : (
            <Button
              color="error"
              variant="outlined"
              sx={{alignSelf: 'flex-end'}}
              onClick={(): void => setConfirming(true)}
            >
              Suspend all
            </Button>
          ))}
        <List dense>
          {agents.map((agent: BasicAgent) => (
            <ListItemButton key={agent.id} onClick={(): void => onSelect?.(agent)}>
              <ListItemText primary={getAgentName(agent)} secondary={agent.status?.value ?? 'ACTIVE'} />
            </ListItemButton>
          ))}
        </List>
        {onPageChange && totalResults > limit && (
          <Stack direction="row" spacing={1} sx={{justifyContent: 'flex-end'}}>
            <Button disabled={offset === 0} onClick={(): void => onPageChange(Math.max(0, offset - limit))}>
              Previous
            </Button>
            <Button disabled={offset + limit >= totalResults} onClick={(): void => onPageChange(offset + limit)}>
              Next
            </Button>
          </Stack>
        )}
      </Stack>
    </Mui>
  );
};

/**
 * The personal agent's editable fields drawn with MUI, saved through `onUpdate`.
 */
const MuiPersonalAgentForm = ({
  agent,
  isUpdating,
  onCancel,
  onSave,
}: {
  agent: Agent;
  isUpdating: boolean;
  onCancel: () => void;
  onSave: (changes: UpdateMeAgentRequest) => void;
}): ReactElement => {
  const [values, setValues] = useState<PersonalAgentFormValues>(() => toPersonalAgentFormValues(agent));
  const set =
    (field: 'description' | 'name' | 'redirectUris') =>
    (event: ChangeEvent<HTMLInputElement>): void =>
      setValues((current: PersonalAgentFormValues) => ({...current, [field]: event.target.value}));

  return (
    <Stack spacing={2}>
      <TextField size="small" label="Name" required value={values.name} onChange={set('name')} />
      <TextField size="small" label="Description" value={values.description} onChange={set('description')} />
      <TextField
        size="small"
        label="Redirect URIs"
        helperText="Separate URIs with whitespace."
        value={values.redirectUris}
        onChange={set('redirectUris')}
      />
      <Stack direction="row" spacing={1} justifyContent="flex-end">
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          variant="contained"
          loading={isUpdating}
          disabled={!isPersonalAgentFormValid(values)}
          onClick={(): void => onSave(toUpdateMeAgentRequest(agent, values))}
        >
          Save
        </Button>
      </Stack>
    </Stack>
  );
};

/**
 * The personal agent details drawn as an MUI card, like the admin agent details' custom render.
 */
export const MuiPersonalAgentDetails = ({
  agent,
  error,
  isChangingSuspension,
  isDeleting,
  isLoading,
  isUpdating,
  oauth: oauthConfig,
  onDelete,
  onSuspend,
  onUnsuspend,
  onUpdate,
}: BasePersonalAgentDetailsRenderProps): ReactElement => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const suspended: boolean = agent?.status?.value === 'SUSPENDED';
  const canEdit = Boolean(onUpdate && agent && !isEditing);

  return (
    <Mui>
      <DetailsCard
        title={agent ? getAgentName(agent) : undefined}
        subheader={
          agent && (
            <Stack direction="row" spacing={1} alignItems="center" component="span">
              <span>{agent.clientId}</span>
              <Chip
                size="small"
                color={suspended ? 'warning' : 'success'}
                label={
                  suspended
                    ? `Suspended by ${(agent.status?.details?.appliedBy ?? ['organization']).join(', ')}`
                    : 'Active'
                }
              />
            </Stack>
          )
        }
        isLoading={isLoading}
        isDeleting={isDeleting}
        onDelete={isEditing ? undefined : onDelete}
        actions={
          !isEditing && (canEdit || onSuspend || onUnsuspend) ? (
            <>
              {canEdit && <Button onClick={(): void => setIsEditing(true)}>Edit</Button>}
              {onUnsuspend && (
                <Button loading={isChangingSuspension} onClick={onUnsuspend}>
                  Unsuspend
                </Button>
              )}
              {onSuspend && (
                <Button color="warning" loading={isChangingSuspension} onClick={onSuspend}>
                  Suspend
                </Button>
              )}
            </>
          ) : undefined
        }
      >
        {error && <MuiAlert severity="error">{error}</MuiAlert>}
        {agent && isEditing && onUpdate ? (
          <MuiPersonalAgentForm
            agent={agent}
            isUpdating={isUpdating}
            onCancel={(): void => setIsEditing(false)}
            onSave={(changes: UpdateMeAgentRequest): void => {
              // Closes only once the update succeeds, so a failed save keeps the changes.
              void Promise.resolve(onUpdate(changes)).then((saved: boolean | void) => {
                if (saved !== false) {
                  setIsEditing(false);
                }
              });
            }}
          />
        ) : (
          <>
            {agent?.description && <Typography variant="body2">{agent.description}</Typography>}
            <Typography variant="overline">Attributes</Typography>
            <ChipRow
              items={Object.entries(agent?.attributes ?? {})
                .filter(([name]: [string, unknown]) => name !== 'name')
                .map(([name, value]: [string, unknown]) => ({id: name, label: `${name}: ${String(value)}`}))}
            />
            <Typography variant="overline">Grant types</Typography>
            <ChipRow
              items={(oauthConfig?.grantTypes ?? []).map((grantType: string) => ({id: grantType, label: grantType}))}
            />
            <Typography variant="overline">Redirect URIs</Typography>
            <ChipRow items={(oauthConfig?.redirectUris ?? []).map((uri: string) => ({id: uri, label: uri}))} />
          </>
        )}
      </DetailsCard>
    </Mui>
  );
};

/**
 * The Base list with sample agents, suspended locally.
 */
export const SamplePersonalAgentList = ({args, action}: {action: Action; args: Args}): ReactElement => {
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
    >
      {str(args, 'source') === 'custom'
        ? (props: BasePersonalAgentListRenderProps): ReactElement => <MuiPersonalAgentList {...props} />
        : undefined}
    </BasePersonalAgentList>
  );
};

/**
 * The Base details with a sample agent, edited and suspended locally.
 */
export const SamplePersonalAgentDetails = ({args, action}: {action: Action; args: Args}): ReactElement => {
  const initial: Agent =
    SAMPLE_PERSONAL_AGENTS.find((agent: Agent) => agent.id === str(args, 'sample')) ?? SAMPLE_PERSONAL_AGENTS[0];
  const [agent, setAgent] = useState<Agent | undefined>(initial);

  return (
    <BasePersonalAgentDetails
      key={initial.id}
      agent={agent}
      isLoading={bool(args, 'isLoading')}
      error={str(args, 'error') || null}
      onUpdate={
        bool(args, 'editable')
          ? (changes: UpdateMeAgentRequest): void => {
              action('onUpdate', JSON.stringify(changes));
              setAgent(
                (current: Agent | undefined) =>
                  current && {
                    ...current,
                    attributes: changes.attributes,
                    description: changes.description,
                    inboundAuthConfig: oauth(changes.grantTypes, changes.redirectUris),
                  },
              );
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
              setAgent((current: Agent | undefined) => current && {...current, status: suspendedByOwner(current)});
            }
          : undefined
      }
      onUnsuspend={
        bool(args, 'suspendable')
          ? (): void => {
              action('onUnsuspend', initial.id);
              setAgent((current: Agent | undefined) => current && {...current, status: liftedByOwner(current)});
            }
          : undefined
      }
    >
      {str(args, 'source') === 'custom'
        ? (props: BasePersonalAgentDetailsRenderProps): ReactElement => <MuiPersonalAgentDetails {...props} />
        : undefined}
    </BasePersonalAgentDetails>
  );
};
