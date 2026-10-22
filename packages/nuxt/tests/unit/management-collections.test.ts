// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/typedef */

import {describe, it, expect} from 'vitest';

import {MANAGEMENT_COMPONENTS, MANAGEMENT_COMPOSABLES} from '../../src/runtime/constants/ManagementAutoImports';
import {getManagementCollectionUrls, matchManagementUrl} from '@thunderid/node';

describe('management collections', () => {
  const collections = getManagementCollectionUrls({baseUrl: 'https://id.example.com/'});

  it.each([
    'https://id.example.com/users?limit=20',
    'https://id.example.com/groups/g-1/members',
    'https://id.example.com/o/roles/r-1/assignments/add',
    'https://id.example.com/agent-types',
  ])('allows %s', (target) => {
    expect(matchManagementUrl(target, collections)).toBeInstanceOf(URL);
  });

  it.each([
    'https://attacker.example.net/users',
    'https://id.example.com/oauth2/token',
    'https://id.example.com/usersx',
    'https://id.example.com/users/%2e%2e/oauth2',
    'https://id.example.com/users/a%2F..%2Foauth2',
  ])('refuses %s', (target) => {
    expect(matchManagementUrl(target, collections)).toBeUndefined();
  });

  it('honors an endpoints override for a collection', () => {
    const overridden = getManagementCollectionUrls({
      baseUrl: 'https://id.example.com',
      endpoints: {users: 'https://mgmt.example.com/api/users'},
    });

    expect(matchManagementUrl('https://mgmt.example.com/api/users/u-1', overridden)).toBeInstanceOf(URL);
    expect(matchManagementUrl('https://id.example.com/users/u-1', overridden)).toBeUndefined();
  });
});

describe('management auto-imports', () => {
  it('registers every admin component with its unstyled variant', () => {
    const styled = MANAGEMENT_COMPONENTS.filter((name) => !name.startsWith('Base'));

    expect(styled).toHaveLength(13);
    styled.forEach((name) => expect(MANAGEMENT_COMPONENTS).toContain(`Base${name}`));
  });

  it('registers each composable once', () => {
    expect(new Set(MANAGEMENT_COMPOSABLES).size).toBe(MANAGEMENT_COMPOSABLES.length);
    expect(MANAGEMENT_COMPOSABLES).toContain('useGrantedPermissions');
  });
});
