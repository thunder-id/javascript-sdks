// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {
  Agent,
  Application,
  BasicApplication,
  BasicAgent,
  DataTableColumn,
  Group,
  GroupMember,
  ManagedUser,
  MembershipGroup,
  ResourceServerPermission,
  RoleAssignment,
  RolePermissionResourceServer,
  RoleResourcePermissions,
  RoleSummary,
} from '@thunderid/react';
import {getAgentName} from '@thunderid/react';

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
    attributes: {name: 'Concierge'},
    clientId: 'agt_concierge',
    description: 'Books travel for employees',
    display: 'Concierge',
    id: 'agt-1',
    type: 'assistant',
  },
  {
    ...OU,
    attributes: {name: 'Ticket triage'},
    clientId: 'agt_triage',
    description: 'Routes support tickets',
    display: 'Ticket triage',
    id: 'agt-2',
    type: 'worker',
  },
  {
    ...OU,
    attributes: {name: 'Nightly reporter'},
    clientId: 'agt_reporter',
    display: 'Nightly reporter',
    id: 'agt-3',
    type: 'worker',
  },
];

export const SAMPLE_AGENT: Agent = {...SAMPLE_AGENTS[0], owner: {id: 'usr-1'}};

export const SAMPLE_APPLICATIONS: BasicApplication[] = [
  {clientId: 'portal_spa', description: 'Customer portal', id: 'app-1', name: 'Customer portal', template: 'browser'},
  {clientId: 'billing_api', id: 'app-2', name: 'Billing service', template: 'm2m'},
  {clientId: 'field_app', id: 'app-3', name: 'Field app', template: 'mobile'},
  {clientId: 'ops_console', id: 'app-4', name: 'Ops console', template: 'fullstack'},
];

export const SAMPLE_APPLICATION: Application = {
  description: 'Customer portal',
  id: 'app-1',
  inboundAuthConfig: [
    {
      config: {
        clientId: 'portal_spa',
        grantTypes: ['authorization_code', 'refresh_token'],
        redirectUris: ['https://portal.example.com/callback'],
        responseTypes: ['code'],
      },
      type: 'oauth2',
    },
  ],
  name: 'Customer portal',
  ouId: OU.ouId,
  template: 'browser',
  url: 'https://portal.example.com',
};

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

/** The resource servers an editable permissions story offers, with the permissions of each. */
export const SAMPLE_RESOURCE_SERVERS: RolePermissionResourceServer[] = [
  {id: 'rs-orders', name: 'Orders API'},
  {id: 'rs-system', name: 'ThunderID system'},
];

export const SAMPLE_AVAILABLE_PERMISSIONS: Record<string, ResourceServerPermission[]> = {
  'rs-orders': [
    {name: 'Read', permission: 'orders:read'},
    {name: 'Refund', permission: 'orders:refund'},
    {name: 'Cancel', permission: 'orders:cancel', resourceName: 'Orders'},
  ],
  'rs-system': [
    {name: 'View users', permission: 'system:user:view'},
    {name: 'View groups', permission: 'system:group:view'},
    {name: 'View roles', permission: 'system:role:view'},
    {name: 'Manage users', permission: 'system:user'},
  ],
};

export const CANDIDATES = {
  agent: SAMPLE_AGENTS.map((agent: BasicAgent) => ({id: agent.id, label: getAgentName(agent)})),
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
