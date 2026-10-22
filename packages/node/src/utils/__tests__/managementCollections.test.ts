// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import {getManagementCollectionUrls, matchManagementUrl} from '../managementCollections';

const baseConfig = {baseUrl: 'https://id.example.com'};

describe('getManagementCollectionUrls', () => {
  it('derives every admin collection, and its organization-scoped form, from baseUrl', () => {
    const urls: string[] = getManagementCollectionUrls(baseConfig).map((url: URL) => url.toString());

    expect(urls).toEqual(
      expect.arrayContaining([
        'https://id.example.com/users',
        'https://id.example.com/o/users',
        'https://id.example.com/groups',
        'https://id.example.com/roles',
        'https://id.example.com/agents',
        'https://id.example.com/user-types',
        'https://id.example.com/agent-types',
      ]),
    );
  });

  it('uses an endpoints override instead of baseUrl for that collection', () => {
    const urls: string[] = getManagementCollectionUrls({
      ...baseConfig,
      endpoints: {users: 'https://mgmt.example.com/api/users/'},
    }).map((url: URL) => url.toString());

    expect(urls).toContain('https://mgmt.example.com/api/users');
    expect(urls).not.toContain('https://id.example.com/users');
    expect(urls).toContain('https://id.example.com/groups');
  });

  it('returns nothing without a baseUrl or overrides', () => {
    expect(getManagementCollectionUrls(undefined)).toEqual([]);
  });
});

describe('matchManagementUrl', () => {
  const collections: URL[] = getManagementCollectionUrls(baseConfig);

  it.each([
    'https://id.example.com/users',
    'https://id.example.com/users?limit=20&offset=0',
    'https://id.example.com/users/abc-123',
    'https://id.example.com/groups/g-1/members/add',
    'https://id.example.com/o/roles/r-1/assignments',
  ])('allows %s', (target: string) => {
    expect(matchManagementUrl(target, collections)).toBeInstanceOf(URL);
  });

  it.each([
    ['another host', 'https://attacker.example.net/users'],
    ['a sibling host', 'https://id.example.com.attacker.net/users'],
    ['another scheme', 'ftp://id.example.com/users'],
    ['a path outside the collections', 'https://id.example.com/oauth2/token'],
    ['a collection name prefix', 'https://id.example.com/usersx'],
    ['a dot segment escaping the collection', 'https://id.example.com/users/../oauth2/token'],
    ['an encoded slash', 'https://id.example.com/users/a%2F..%2Foauth2'],
    ['an encoded dot', 'https://id.example.com/users/%2e%2e/oauth2'],
    ['credentials in the URL', 'https://user:pass@id.example.com/users'],
    ['a relative URL', '/users'],
    ['a non-string', 42],
  ])('refuses %s', (_label: string, target: unknown) => {
    expect(matchManagementUrl(target, collections)).toBeUndefined();
  });
});
