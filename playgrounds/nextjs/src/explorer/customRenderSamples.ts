// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {ManagedUser, MembershipGroup} from '@thunderid/react';

// Sample data for the Base components. Nothing here reaches a server.

const OU = 'ou_9d1e07';

export const SAMPLE_USERS: ManagedUser[] = [
  ['usr_8f2c41', 'Liam Chen', 'liam.chen'],
  ['usr_31b7e0', 'Ana Silva', 'ana.silva'],
  ['usr_5c90aa', 'Kofi Mensah', 'kofi.mensah'],
  ['usr_77de12', 'Mei Lin', 'mei.lin'],
  ['usr_a0b3f9', 'Omar Haddad', 'omar.haddad'],
].map(([id, display, username]: string[]) => ({
  attributes: {email: `${username}@acme.io`, username},
  display,
  id,
  ouHandle: 'engineering',
  ouId: OU,
  type: 'employee',
}));

export const SAMPLE_MEMBERSHIPS: MembershipGroup[] = [
  {id: 'grp_admins', name: 'Administrators', ouId: OU},
  {id: 'grp_support', name: 'Support', ouId: OU},
];
