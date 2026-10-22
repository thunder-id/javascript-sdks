// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  type AgentListResponse,
  type Group,
  type Role,
  useAddGroupMembers,
  useAddRoleAssignments,
  useCreateGroup,
  useCreateRole,
  useDeleteGroup,
  useDeleteRole,
  useGetAgentGroups,
  useGetAgentRoles,
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
  useUser,
} from '@thunderid/react';
import {ChangeEvent, ReactElement, useState} from 'react';
import {HookCard, QueryCard} from '../components/HookCard';
import {describeError, track} from '../lib/events';
import {PERMISSION_PROBES} from '../lib/management';
import {asText} from '../lib/sdk';

interface IdFieldProps {
  label: string;
  onChange: (value: string) => void;
  /** Fills the field, for example from the first item of a list hook. */
  onFill?: () => void;
  fillLabel?: string;
  value: string;
}

const IdField = ({fillLabel = 'Use first', label, onChange, onFill = undefined, value}: IdFieldProps): ReactElement => (
  <div className="pg-row" style={{padding: '0 18px 12px', alignItems: 'center'}}>
    <input
      className="pg-input"
      aria-label={label}
      placeholder={label}
      value={value}
      style={{flex: 1}}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value.trim())}
    />
    {onFill && (
      <button type="button" className="pg-btn" data-size="sm" style={{flex: 'none'}} onClick={onFill}>
        {fillLabel}
      </button>
    )}
  </div>
);

const ID_SIGNATURE = '(id, {limit}, {enabled}) => {data, error, isLoading, refetch}';

const mutationState = (mutation: {data: unknown; error: Error | null; isLoading: boolean}): unknown => ({
  data: mutation.data,
  error: mutation.error?.message ?? null,
  isLoading: mutation.isLoading,
});

/**
 * The group, role, type, and membership hooks, plus useGrantedPermissions. Reads start disabled and
 * run from Fetch; writes only run from their buttons and act on a scratch group or role.
 */
const ManagementHooks = ({agents}: {agents: AgentListResponse | undefined}): ReactElement => {
  const sdk = useThunderID();
  const {flattenedProfile} = useUser();
  const granted = useGrantedPermissions();
  const [probe, setProbe] = useState<string>('system:group:view');
  const [groupId, setGroupId] = useState<string>('');
  const [roleId, setRoleId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [agentId, setAgentId] = useState<string>('');
  const [ouId, setOuId] = useState<string>(() =>
    asText((flattenedProfile as Record<string, unknown> | null)?.['ouId']),
  );
  const [scratchGroup, setScratchGroup] = useState<Group | null>(null);
  const [scratchRole, setScratchRole] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groups = useGetGroups({limit: 5}, {enabled: false});
  const roles = useGetRoles({limit: 5}, {enabled: false});
  const userTypes = useGetUserTypes({limit: 10}, {enabled: false});
  const agentTypes = useGetAgentTypes({limit: 10}, {enabled: false});
  const group = useGetGroup(groupId || undefined, {enabled: false});
  const groupMembers = useGetGroupMembers(groupId || undefined, {limit: 10}, {enabled: false});
  const role = useGetRole(roleId || undefined, {enabled: false});
  const roleAssignments = useGetRoleAssignments(roleId || undefined, {limit: 10}, {enabled: false});
  const userGroups = useGetUserGroups(userId || undefined, {limit: 10}, {enabled: false});
  const agentGroups = useGetAgentGroups(agentId || undefined, {limit: 10}, {enabled: false});
  const agentRoles = useGetAgentRoles(agentId || undefined, {limit: 10}, {enabled: false});

  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const addGroupMembers = useAddGroupMembers();
  const removeGroupMembers = useRemoveGroupMembers();
  const deleteGroup = useDeleteGroup();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const addRoleAssignments = useAddRoleAssignments();
  const removeRoleAssignments = useRemoveRoleAssignments();
  const deleteRole = useDeleteRole();

  const run = (label: string, call: () => Promise<unknown>): void => {
    setError(null);
    track(label, call).catch((caught: unknown) => setError(`${label}: ${describeError(caught)}`));
  };

  const fillMe = (): void =>
    run('getDecodedIdToken', async () => {
      setUserId(asText(((await sdk.getDecodedIdToken()) as Record<string, unknown>)['sub']));
    });

  // The scratch identity added to the scratch group and role is the signed-in user.
  const me = async (): Promise<string> => asText(((await sdk.getDecodedIdToken()) as Record<string, unknown>)['sub']);
  const scratchName = (kind: string): string => `playground-${kind}-${Date.now().toString(36)}`;
  const needsOu: boolean = !sdk.isSignedIn || !ouId;

  return (
    <>
      {error && (
        <div className="pg-warning" role="alert" style={{gridColumn: '1 / -1'}}>
          {error}
        </div>
      )}

      <HookCard
        name="useGrantedPermissions()"
        signature="() => {permissions, isLoading, can(required)}"
        value={{
          [`can('${probe}')`]: granted.can(probe),
          isLoading: granted.isLoading,
          permissions: granted.permissions,
          probes: Object.fromEntries(PERMISSION_PROBES.map((item: string) => [item, granted.can(item)])),
        }}
      >
        <IdField label="Permission to check with can()" value={probe} onChange={setProbe} />
        {!sdk.isSignedIn && <p className="pg-empty">Sign in: permissions come from the access token scope claim.</p>}
      </HookCard>

      <QueryCard name="useGetGroups()" query={groups} />
      <QueryCard name="useGetRoles()" query={roles} />
      <QueryCard name="useGetUserTypes()" query={userTypes} />
      <QueryCard name="useGetAgentTypes()" query={agentTypes} />

      <QueryCard name="useGetGroup()" query={group} signature="(groupId, {enabled}) => {data, …}" disabled={!groupId}>
        <IdField
          label="groupId"
          value={groupId}
          onChange={setGroupId}
          onFill={groups.data?.groups[0] ? () => setGroupId(groups.data?.groups[0]?.id ?? '') : undefined}
        />
      </QueryCard>
      <QueryCard name="useGetGroupMembers()" query={groupMembers} signature={ID_SIGNATURE} disabled={!groupId}>
        <p className="pg-empty">Uses the groupId above{groupId ? `: ${groupId}` : '. Fetch useGetGroups() first.'}</p>
      </QueryCard>
      <QueryCard name="useGetRole()" query={role} signature="(roleId, {enabled}) => {data, …}" disabled={!roleId}>
        <IdField
          label="roleId"
          value={roleId}
          onChange={setRoleId}
          onFill={roles.data?.roles[0] ? () => setRoleId(roles.data?.roles[0]?.id ?? '') : undefined}
        />
      </QueryCard>
      <QueryCard
        name="useGetRoleAssignments()"
        query={roleAssignments}
        signature="(roleId, {limit, type}, {enabled}) => {data, …}"
        disabled={!roleId}
      >
        <p className="pg-empty">Uses the roleId above{roleId ? `: ${roleId}` : '. Fetch useGetRoles() first.'}</p>
      </QueryCard>
      <QueryCard name="useGetUserGroups()" query={userGroups} signature={ID_SIGNATURE} disabled={!userId}>
        <IdField
          label="userId"
          value={userId}
          onChange={setUserId}
          fillLabel="Use me"
          onFill={sdk.isSignedIn ? fillMe : undefined}
        />
      </QueryCard>
      <QueryCard name="useGetAgentGroups()" query={agentGroups} signature={ID_SIGNATURE} disabled={!agentId}>
        <IdField
          label="agentId"
          value={agentId}
          onChange={setAgentId}
          onFill={agents?.agents[0] ? () => setAgentId(agents?.agents[0]?.id ?? '') : undefined}
        />
      </QueryCard>
      <QueryCard name="useGetAgentRoles()" query={agentRoles} signature={ID_SIGNATURE} disabled={!agentId}>
        <p className="pg-empty">Uses the agentId above{agentId ? `: ${agentId}` : '. Fetch useGetAgents() first.'}</p>
      </QueryCard>

      <HookCard
        name="Group mutations"
        signature="useCreateGroup · useUpdateGroup · useAddGroupMembers · useRemoveGroupMembers · useDeleteGroup"
        value={{
          addGroupMembers: mutationState(addGroupMembers),
          createGroup: mutationState(createGroup),
          deleteGroup: mutationState(deleteGroup),
          removeGroupMembers: mutationState(removeGroupMembers),
          scratchGroup,
          updateGroup: mutationState(updateGroup),
        }}
        actions={
          <>
            <button
              type="button"
              className="pg-btn"
              data-size="sm"
              disabled={needsOu || !!scratchGroup}
              onClick={() =>
                run('createGroup', async () =>
                  setScratchGroup(await createGroup.mutateAsync({name: scratchName('group'), ouId})),
                )
              }
            >
              create
            </button>
            <button
              type="button"
              className="pg-btn"
              data-size="sm"
              disabled={!scratchGroup}
              onClick={() =>
                run('updateGroup', async () => {
                  if (!scratchGroup) return;
                  setScratchGroup(
                    await updateGroup.mutateAsync({
                      data: {
                        description: 'Renamed by the playground',
                        name: `${scratchGroup.name}-renamed`,
                        ouId: scratchGroup.ouId,
                      },
                      groupId: scratchGroup.id,
                    }),
                  );
                })
              }
            >
              update
            </button>
            <button
              type="button"
              className="pg-btn"
              data-size="sm"
              disabled={!scratchGroup}
              onClick={() =>
                run('addGroupMembers', async () => {
                  if (scratchGroup)
                    await addGroupMembers.mutateAsync({
                      groupId: scratchGroup.id,
                      members: [{id: await me(), type: 'user'}],
                    });
                })
              }
            >
              add me
            </button>
            <button
              type="button"
              className="pg-btn"
              data-size="sm"
              disabled={!scratchGroup}
              onClick={() =>
                run('removeGroupMembers', async () => {
                  if (scratchGroup)
                    await removeGroupMembers.mutateAsync({
                      groupId: scratchGroup.id,
                      members: [{id: await me(), type: 'user'}],
                    });
                })
              }
            >
              remove me
            </button>
            <button
              type="button"
              className="pg-btn"
              data-size="sm"
              data-variant="danger"
              disabled={!scratchGroup}
              onClick={() =>
                run('deleteGroup', async () => {
                  if (!scratchGroup) return;
                  await deleteGroup.mutateAsync(scratchGroup.id);
                  setScratchGroup(null);
                })
              }
            >
              delete
            </button>
          </>
        }
      >
        <IdField
          label="ouId for the scratch group and role"
          value={ouId}
          onChange={setOuId}
          onFill={groups.data?.groups[0] ? () => setOuId(groups.data?.groups[0]?.ouId ?? '') : undefined}
          fillLabel="Use first group's OU"
        />
        <p className="pg-empty">
          Writes data. Creates a scratch group named playground-group-…, then acts on that group only.
          {needsOu && ' Sign in and set an ouId first.'}
        </p>
      </HookCard>

      <HookCard
        name="Role mutations"
        signature="useCreateRole · useUpdateRole · useAddRoleAssignments · useRemoveRoleAssignments · useDeleteRole"
        value={{
          addRoleAssignments: mutationState(addRoleAssignments),
          createRole: mutationState(createRole),
          deleteRole: mutationState(deleteRole),
          removeRoleAssignments: mutationState(removeRoleAssignments),
          scratchRole,
          updateRole: mutationState(updateRole),
        }}
        actions={
          <>
            <button
              type="button"
              className="pg-btn"
              data-size="sm"
              disabled={needsOu || !!scratchRole}
              onClick={() =>
                run('createRole', async () =>
                  setScratchRole(await createRole.mutateAsync({name: scratchName('role'), ouId})),
                )
              }
            >
              create
            </button>
            <button
              type="button"
              className="pg-btn"
              data-size="sm"
              disabled={!scratchRole}
              onClick={() =>
                run('updateRole', async () => {
                  if (!scratchRole) return;
                  setScratchRole(
                    await updateRole.mutateAsync({
                      data: {
                        description: 'Renamed by the playground',
                        name: `${scratchRole.name}-renamed`,
                        ouId: scratchRole.ouId,
                        permissions: scratchRole.permissions ?? [],
                      },
                      roleId: scratchRole.id,
                    }),
                  );
                })
              }
            >
              update
            </button>
            <button
              type="button"
              className="pg-btn"
              data-size="sm"
              disabled={!scratchRole}
              onClick={() =>
                run('addRoleAssignments', async () => {
                  if (scratchRole)
                    await addRoleAssignments.mutateAsync({
                      assignments: [{id: await me(), type: 'user'}],
                      roleId: scratchRole.id,
                    });
                })
              }
            >
              assign me
            </button>
            <button
              type="button"
              className="pg-btn"
              data-size="sm"
              disabled={!scratchRole}
              onClick={() =>
                run('removeRoleAssignments', async () => {
                  if (scratchRole)
                    await removeRoleAssignments.mutateAsync({
                      assignments: [{id: await me(), type: 'user'}],
                      roleId: scratchRole.id,
                    });
                })
              }
            >
              unassign me
            </button>
            <button
              type="button"
              className="pg-btn"
              data-size="sm"
              data-variant="danger"
              disabled={!scratchRole}
              onClick={() =>
                run('deleteRole', async () => {
                  if (!scratchRole) return;
                  await deleteRole.mutateAsync(scratchRole.id);
                  setScratchRole(null);
                })
              }
            >
              delete
            </button>
          </>
        }
      >
        <p className="pg-empty">
          Writes data. Creates a scratch role named playground-role-… with no permissions, in the ouId above.
          {needsOu && ' Sign in and set an ouId first.'}
        </p>
      </HookCard>
    </>
  );
};

export default ManagementHooks;
