// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {
  ResourceMutationResult,
  ResourceQueryResult,
  useAddGroupMembers,
  useAddRoleAssignments,
  useCreateGroup,
  useCreateRole,
  useDeleteGroup,
  useDeleteRole,
  useGetAgentGroups,
  useGetAgentRoles,
  useGetAgents,
  useGetAgentTypes,
  useGetGroup,
  useGetGroupMembers,
  useGetGroups,
  useGetRole,
  useGetRoleAssignments,
  useGetRoles,
  useGetUserGroups,
  useGetUserTypes,
  useGrantedPermissions,
  useRemoveGroupMembers,
  useRemoveRoleAssignments,
  useThunderID,
  useUpdateGroup,
  useUpdateRole,
} from '@thunderid/nextjs';
import {useGrantedPermissions as useReactGrantedPermissions, useUser} from '@thunderid/react';
import {ChangeEvent, ReactElement, ReactNode, useState} from 'react';
import {describeError, logEvent} from '../lib/events';
import {useServerSession} from '../lib/session';

type Query = Pick<ResourceQueryResult<unknown>, 'data' | 'error' | 'isLoading'> & {refetch?: () => Promise<unknown>};

const stateOf = (query: Query): [string, string] => {
  if (query.isLoading) return ['Loading', ''];
  if (query.error) return ['Error', 'error'];
  if (query.data === undefined) return ['Idle', ''];

  return ['OK', 'ok'];
};

/** One hook: its call, what it returned, and a refetch button. */
const HookCard = ({
  children = null,
  name,
  query,
  signature,
  summary = '',
}: {
  children?: ReactNode;
  name: string;
  query: Query;
  signature: string;
  summary?: string;
}): ReactElement => {
  const [label, state] = stateOf(query);

  return (
    <section className="pg-card" aria-label={name}>
      <div className="pg-card-head">
        <div>
          <h2>{name}</h2>
          <div className="pg-hook-sig">{signature}</div>
        </div>
        <div className="pg-row" style={{alignItems: 'center'}}>
          <span className="pg-pill" data-state={state}>
            {label}
          </span>
          {query.refetch && (
            <button type="button" className="pg-btn" data-size="sm" onClick={() => void query.refetch?.()}>
              Refetch
            </button>
          )}
        </div>
      </div>
      {children && <div className="pg-card-body">{children}</div>}
      {query.error && <p className="pg-empty pg-hook-error">{describeError(query.error)}</p>}
      {!query.error && summary && <p className="pg-empty">{summary}</p>}
      {query.data !== undefined && <pre className="pg-json">{JSON.stringify(query.data, null, 2)}</pre>}
    </section>
  );
};

const IdInput = ({
  fallback,
  label,
  onChange,
  value,
}: {
  fallback: string | undefined;
  label: string;
  onChange: (value: string) => void;
  value: string;
}): ReactElement => (
  <label className="pg-hook-input">
    <span>{label}</span>
    <input
      className="pg-input"
      value={value}
      placeholder={fallback ? `${fallback} (first in the list)` : 'none found yet'}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value.trim())}
    />
  </label>
);

type AnyMutation = Pick<ResourceMutationResult<unknown, never>, 'error' | 'isLoading'>;

const MutationRow = ({label, mutation}: {label: string; mutation: AnyMutation}): ReactElement => (
  <>
    <dt>{label}</dt>
    <dd>{mutation.isLoading ? 'running…' : mutation.error ? describeError(mutation.error) : 'idle / ok'}</dd>
  </>
);

/**
 * The management hooks and `useGrantedPermissions` from @thunderid/nextjs. Every request goes
 * through the SDK's management server action, so each card works only with a session; without one
 * the server action answers HTTP 401 and the card shows it.
 */
const Hooks = (): ReactElement => {
  const sdk = useThunderID();
  const isSignedIn = !!sdk.isSignedIn;
  const {flattenedProfile, profile} = useUser();
  const {session} = useServerSession(isSignedIn);
  const sub: unknown = session?.claims?.['sub'];
  const ouIdValue: unknown = ((flattenedProfile ?? profile ?? {}) as Record<string, unknown>)['ouId'];
  const ouId: string | undefined = typeof ouIdValue === 'string' ? ouIdValue : undefined;

  const [groupInput, setGroupInput] = useState<string>('');
  const [roleInput, setRoleInput] = useState<string>('');
  const [agentInput, setAgentInput] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [required, setRequired] = useState<string>('system:group:view');
  const [createdGroup, setCreatedGroup] = useState<string | null>(null);
  const [createdRole, setCreatedRole] = useState<string | null>(null);

  // Lists, which also supply the default identifiers for the single-resource hooks.
  const groups = useGetGroups({limit: 5});
  const roles = useGetRoles({limit: 5});
  const agents = useGetAgents({limit: 5});
  const userTypes = useGetUserTypes({limit: 10});
  const agentTypes = useGetAgentTypes({limit: 10});

  const firstGroup: string | undefined = groups.data?.groups[0]?.id;
  const firstRole: string | undefined = roles.data?.roles[0]?.id;
  const firstAgent: string | undefined = agents.data?.agents[0]?.id;
  const groupId: string | undefined = groupInput || firstGroup;
  const roleId: string | undefined = roleInput || firstRole;
  const agentId: string | undefined = agentInput || firstAgent;
  const userId: string | undefined = userInput || (typeof sub === 'string' ? sub : undefined);

  const group = useGetGroup(groupId);
  const members = useGetGroupMembers(groupId, {limit: 5});
  const role = useGetRole(roleId);
  const assignments = useGetRoleAssignments(roleId, {limit: 5});
  const userGroups = useGetUserGroups(userId);
  const agentGroups = useGetAgentGroups(agentId);
  const agentRoles = useGetAgentRoles(agentId);

  const granted = useGrantedPermissions();
  const reactGranted = useReactGrantedPermissions();

  const onError = (name: string) => (error: Error) => logEvent(`${name}:failed`, error.message, 'error');

  const createGroup = useCreateGroup({
    onError: onError('useCreateGroup'),
    onSuccess: (created: {id: string}) => setCreatedGroup(created.id),
  });
  const updateGroup = useUpdateGroup({onError: onError('useUpdateGroup')});
  const addMembers = useAddGroupMembers({onError: onError('useAddGroupMembers')});
  const removeMembers = useRemoveGroupMembers({onError: onError('useRemoveGroupMembers')});
  const deleteGroup = useDeleteGroup({onError: onError('useDeleteGroup'), onSuccess: () => setCreatedGroup(null)});

  const createRole = useCreateRole({
    onError: onError('useCreateRole'),
    onSuccess: (created: {id: string}) => setCreatedRole(created.id),
  });
  const updateRole = useUpdateRole({onError: onError('useUpdateRole')});
  const addAssignments = useAddRoleAssignments({onError: onError('useAddRoleAssignments')});
  const removeAssignments = useRemoveRoleAssignments({onError: onError('useRemoveRoleAssignments')});
  const deleteRole = useDeleteRole({onError: onError('useDeleteRole'), onSuccess: () => setCreatedRole(null)});

  const name = (kind: string): string => `playground-${kind}-${Date.now().toString(36)}`;
  const me = (type: 'user'): {id: string; type: 'user'}[] => (userId ? [{id: userId, type}] : []);
  const writeBlocked: string | null = !isSignedIn
    ? 'sign in first'
    : !ouId
      ? 'the profile has no ouId'
      : !userId
        ? 'no user id'
        : null;

  return (
    <main className="pg-main">
      <div className="pg-heading">
        <div>
          <h1>Hooks</h1>
          <p>
            The management hooks and <span className="pg-mono">useGrantedPermissions</span> from{' '}
            <span className="pg-accent">@thunderid/nextjs</span>. Each request runs through the SDK&apos;s management
            server action with the server-held session; the access token never reaches the browser.
          </p>
        </div>
      </div>

      {!isSignedIn && (
        <div className="pg-warning" role="status">
          {sdk.isLoading
            ? 'The SDK is still loading.'
            : 'Not signed in: every management hook below fails with HTTP 401 from the server action. Sign in from the Overview page.'}
        </div>
      )}

      <div className="pg-section-label">Permissions</div>
      <div className="pg-grid-2">
        <HookCard
          name="useGrantedPermissions"
          signature="@thunderid/nextjs · getGrantedPermissionsAction (server action)"
          query={{data: granted.isLoading ? undefined : granted.permissions, error: null, isLoading: granted.isLoading}}
          summary={`${granted.permissions.length} permissions; can('${required}') = ${String(granted.can(required))}`}
        >
          <IdInput label="can()" value={required} fallback={undefined} onChange={setRequired} />
        </HookCard>
        <HookCard
          name="useGrantedPermissions (@thunderid/react)"
          signature="@thunderid/react · getAccessToken() in the browser"
          query={{
            data: reactGranted.isLoading ? undefined : reactGranted.permissions,
            error: null,
            isLoading: reactGranted.isLoading,
          }}
          summary="For comparison: under Next.js the browser holds no token, so this hook returns []. Use the @thunderid/nextjs hook."
        />
      </div>

      <div className="pg-section-label">Groups</div>
      <div className="pg-grid-2">
        <HookCard name="useGetGroups" signature="useGetGroups({limit: 5})" query={groups} />
        <HookCard name="useGetGroup" signature="useGetGroup(groupId)" query={group}>
          <IdInput label="groupId" value={groupInput} fallback={firstGroup} onChange={setGroupInput} />
        </HookCard>
        <HookCard name="useGetGroupMembers" signature="useGetGroupMembers(groupId, {limit: 5})" query={members} />
        <HookCard
          name="Group mutations"
          signature="useCreateGroup · useUpdateGroup · useAddGroupMembers · useRemoveGroupMembers · useDeleteGroup"
          query={{data: createGroup.data ?? updateGroup.data, error: null, isLoading: false}}
          summary={
            writeBlocked
              ? `Writes are disabled: ${writeBlocked}.`
              : `Works on a temporary group${createdGroup ? ` (${createdGroup})` : ''}; delete it when done.`
          }
        >
          <div className="pg-row">
            <button
              type="button"
              className="pg-btn"
              data-size="sm"
              disabled={!!writeBlocked || !!createdGroup}
              onClick={() => void createGroup.mutate({name: name('group'), ouId: ouId!})}
            >
              Create
            </button>
            <button
              type="button"
              className="pg-btn"
              data-size="sm"
              disabled={!createdGroup}
              onClick={() =>
                void updateGroup.mutate({
                  data: {description: `renamed ${new Date().toLocaleTimeString()}`, name: name('group'), ouId: ouId!},
                  groupId: createdGroup!,
                })
              }
            >
              Rename
            </button>
            <button
              type="button"
              className="pg-btn"
              data-size="sm"
              disabled={!createdGroup}
              onClick={() => void addMembers.mutate({groupId: createdGroup!, members: me('user')})}
            >
              Add me
            </button>
            <button
              type="button"
              className="pg-btn"
              data-size="sm"
              disabled={!createdGroup}
              onClick={() => void removeMembers.mutate({groupId: createdGroup!, members: me('user')})}
            >
              Remove me
            </button>
            <button
              type="button"
              className="pg-btn"
              data-size="sm"
              data-variant="danger"
              disabled={!createdGroup}
              onClick={() => void deleteGroup.mutate(createdGroup!)}
            >
              Delete
            </button>
          </div>
          <dl className="pg-dl" style={{marginTop: 12}}>
            <MutationRow label="useCreateGroup" mutation={createGroup} />
            <MutationRow label="useUpdateGroup" mutation={updateGroup} />
            <MutationRow label="useAddGroupMembers" mutation={addMembers} />
            <MutationRow label="useRemoveGroupMembers" mutation={removeMembers} />
            <MutationRow label="useDeleteGroup" mutation={deleteGroup} />
          </dl>
        </HookCard>
      </div>

      <div className="pg-section-label">Roles</div>
      <div className="pg-grid-2">
        <HookCard name="useGetRoles" signature="useGetRoles({limit: 5})" query={roles} />
        <HookCard name="useGetRole" signature="useGetRole(roleId)" query={role}>
          <IdInput label="roleId" value={roleInput} fallback={firstRole} onChange={setRoleInput} />
        </HookCard>
        <HookCard
          name="useGetRoleAssignments"
          signature="useGetRoleAssignments(roleId, {limit: 5})"
          query={assignments}
        />
        <HookCard
          name="Role mutations"
          signature="useCreateRole · useUpdateRole · useAddRoleAssignments · useRemoveRoleAssignments · useDeleteRole"
          query={{data: createRole.data ?? updateRole.data, error: null, isLoading: false}}
          summary={
            writeBlocked
              ? `Writes are disabled: ${writeBlocked}.`
              : `Works on a temporary role${createdRole ? ` (${createdRole})` : ''}; delete it when done.`
          }
        >
          <div className="pg-row">
            <button
              type="button"
              className="pg-btn"
              data-size="sm"
              disabled={!!writeBlocked || !!createdRole}
              onClick={() => void createRole.mutate({name: name('role'), ouId: ouId!})}
            >
              Create
            </button>
            <button
              type="button"
              className="pg-btn"
              data-size="sm"
              disabled={!createdRole}
              onClick={() =>
                void updateRole.mutate({
                  data: {description: 'updated', name: name('role'), ouId: ouId!, permissions: []},
                  roleId: createdRole!,
                })
              }
            >
              Update
            </button>
            <button
              type="button"
              className="pg-btn"
              data-size="sm"
              disabled={!createdRole}
              onClick={() => void addAssignments.mutate({assignments: me('user'), roleId: createdRole!})}
            >
              Assign me
            </button>
            <button
              type="button"
              className="pg-btn"
              data-size="sm"
              disabled={!createdRole}
              onClick={() => void removeAssignments.mutate({assignments: me('user'), roleId: createdRole!})}
            >
              Unassign me
            </button>
            <button
              type="button"
              className="pg-btn"
              data-size="sm"
              data-variant="danger"
              disabled={!createdRole}
              onClick={() => void deleteRole.mutate(createdRole!)}
            >
              Delete
            </button>
          </div>
          <dl className="pg-dl" style={{marginTop: 12}}>
            <MutationRow label="useCreateRole" mutation={createRole} />
            <MutationRow label="useUpdateRole" mutation={updateRole} />
            <MutationRow label="useAddRoleAssignments" mutation={addAssignments} />
            <MutationRow label="useRemoveRoleAssignments" mutation={removeAssignments} />
            <MutationRow label="useDeleteRole" mutation={deleteRole} />
          </dl>
        </HookCard>
      </div>

      <div className="pg-section-label">Users</div>
      <div className="pg-grid-2">
        <HookCard name="useGetUserGroups" signature="useGetUserGroups(userId)" query={userGroups}>
          <IdInput
            label="userId"
            value={userInput}
            fallback={typeof sub === 'string' ? `${sub} (you)` : undefined}
            onChange={setUserInput}
          />
        </HookCard>
        <HookCard name="useGetUserTypes" signature="useGetUserTypes({limit: 10})" query={userTypes} />
      </div>

      <div className="pg-section-label">Agents</div>
      <div className="pg-grid-2">
        <HookCard name="useGetAgentTypes" signature="useGetAgentTypes({limit: 10})" query={agentTypes} />
        <HookCard name="useGetAgents" signature="useGetAgents({limit: 5})" query={agents} />
        <HookCard name="useGetAgentGroups" signature="useGetAgentGroups(agentId)" query={agentGroups}>
          <IdInput label="agentId" value={agentInput} fallback={firstAgent} onChange={setAgentInput} />
        </HookCard>
        <HookCard name="useGetAgentRoles" signature="useGetAgentRoles(agentId)" query={agentRoles} />
      </div>
    </main>
  );
};

export default Hooks;
