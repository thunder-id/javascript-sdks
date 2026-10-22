// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {
  Agent,
  BasicAgent,
  DataTableColumn,
  Group,
  GroupMember,
  ManagedUser,
  MembershipGroup,
  RoleAssignment,
  RoleResourcePermissions,
  RoleSummary,
} from '@thunderid/react';

/* Sample data for the Base* stories. Shapes follow the management API models. */

export const OU = {ouHandle: 'engineering', ouId: 'ou-eng'};

export const SAMPLE_USERS: ManagedUser[] = [
  ['usr-1', 'Liam Chen', 'liam.chen@acme.io'],
  ['usr-2', 'Aiko Tanaka', 'aiko.tanaka@acme.io'],
  ['usr-3', 'Priya Raman', 'priya.raman@acme.io'],
  ['usr-4', 'Mateo Silva', 'mateo.silva@acme.io'],
  ['usr-5', 'Noor Haddad', 'noor.haddad@acme.io'],
].map(([id, display, email]: string[]) => ({
  ...OU,
  attributes: {
    email,
    family_name: display.split(' ')[1],
    given_name: display.split(' ')[0],
    username: email.split('@')[0],
  },
  display,
  id,
  type: 'person',
}));

export const SAMPLE_GROUPS: Group[] = [
  {...OU, description: 'Everyone who ships the platform', id: 'grp-1', name: 'Engineering'},
  {...OU, description: 'Production on-call rotation', id: 'grp-2', name: 'On-call'},
  {...OU, description: 'Read-only auditors', id: 'grp-3', name: 'Auditors'},
  {...OU, description: 'Design and research', id: 'grp-4', name: 'Design'},
];

export const SAMPLE_ROLES: RoleSummary[] = [
  {...OU, description: 'Full access to the console', id: 'rol-1', isReadOnly: true, name: 'Administrator'},
  {...OU, description: 'Manages users and groups', id: 'rol-2', name: 'User manager'},
  {...OU, description: 'Views everything, changes nothing', id: 'rol-3', name: 'Viewer'},
];

export const SAMPLE_AGENTS: BasicAgent[] = [
  {
    ...OU,
    clientId: 'agt_concierge',
    description: 'Books travel for employees',
    id: 'agt-1',
    name: 'Concierge',
    type: 'assistant',
  },
  {
    ...OU,
    clientId: 'agt_triage',
    description: 'Routes support tickets',
    id: 'agt-2',
    name: 'Ticket triage',
    type: 'worker',
  },
  {...OU, clientId: 'agt_reporter', id: 'agt-3', name: 'Nightly reporter', type: 'worker'},
];

export const SAMPLE_AGENT: Agent = {...SAMPLE_AGENTS[0], owner: 'usr-1'};

export const SAMPLE_MEMBERSHIPS: MembershipGroup[] = SAMPLE_GROUPS.slice(0, 2).map(({id, name, ouId}: Group) => ({
  id,
  name,
  ouId,
}));

export const SAMPLE_MEMBERS: GroupMember[] = [
  {display: 'Liam Chen', id: 'usr-1', type: 'user'},
  {display: 'Aiko Tanaka', id: 'usr-2', type: 'user'},
  {display: 'Concierge', id: 'agt-1', type: 'agent'},
];

export const SAMPLE_ASSIGNMENTS: RoleAssignment[] = [
  {display: 'Liam Chen', id: 'usr-1', type: 'user'},
  {display: 'On-call', id: 'grp-2', type: 'group'},
];

export const SAMPLE_PERMISSIONS: RoleResourcePermissions[] = [
  {permissions: ['system:user:view', 'system:group:view', 'system:role:view'], resourceServerId: 'rs-system'},
  {permissions: ['orders:read', 'orders:refund'], resourceServerId: 'rs-orders'},
];

export const RESOURCE_SERVER_NAMES: Record<string, string> = {
  'rs-orders': 'Orders API',
  'rs-system': 'ThunderID system',
};

export const CANDIDATES = {
  agent: SAMPLE_AGENTS.map((agent: BasicAgent) => ({id: agent.id, label: agent.name})),
  group: SAMPLE_GROUPS.map((group: Group) => ({id: group.id, label: group.name})),
  user: SAMPLE_USERS.map((user: ManagedUser) => ({id: user.id, label: user.display ?? user.id})),
};

export const TYPE_OPTIONS = {
  agent: [
    {label: 'Assistant', value: 'assistant'},
    {label: 'Worker', value: 'worker'},
  ],
  user: [
    {label: 'Person', value: 'person'},
    {label: 'Contractor', value: 'contractor'},
  ],
};

/* DataTable sample rows. */

export interface SessionRow {
  device: string;
  id: string;
  lastSeen: string;
  location: string;
}

export const SESSION_ROWS: SessionRow[] = [
  {device: 'MacBook Pro · Safari', id: 's-1', lastSeen: 'now', location: 'Auckland, NZ'},
  {device: 'iPhone 16 · ThunderID app', id: 's-2', lastSeen: '2 h ago', location: 'Auckland, NZ'},
  {device: 'Pixel 9 · Chrome', id: 's-3', lastSeen: 'yesterday', location: 'Sydney, AU'},
  {device: 'Windows · Edge', id: 's-4', lastSeen: '3 days ago', location: 'Singapore, SG'},
  {device: 'iPad · Safari', id: 's-5', lastSeen: 'last week', location: 'Tokyo, JP'},
];

export const SESSION_COLUMNS: DataTableColumn<SessionRow>[] = [
  {header: 'Device', id: 'device', render: (row: SessionRow) => row.device},
  {header: 'Location', id: 'location', render: (row: SessionRow) => row.location},
  {header: 'Last seen', id: 'lastSeen', render: (row: SessionRow) => row.lastSeen},
];
