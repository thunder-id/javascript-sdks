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
        'https://id.example.com/applications',
        'https://id.example.com/o/applications',
        'https://id.example.com/user-types',
        'https://id.example.com/agent-types',
        'https://id.example.com/flows',
        'https://id.example.com/organization-units',
        'https://id.example.com/o/organization-units',
        'https://id.example.com/resource-servers',
        'https://id.example.com/connections',
        'https://id.example.com/notification-templates',
        'https://id.example.com/design',
        'https://id.example.com/i18n',
        'https://id.example.com/server-config',
        'https://id.example.com/gateways',
        'https://id.example.com/variables',
        'https://id.example.com/secrets',
        'https://id.example.com/configuration-versions',
        'https://id.example.com/import',
        'https://id.example.com/export',
        'https://id.example.com/openid4vci/credential-configurations',
        'https://id.example.com/openid4vp/presentation-definitions',
        'https://id.example.com/oauth2/dcr/register',
        'https://id.example.com/projects',
        'https://id.example.com/authorization-detail-types',
      ]),
    );
  });

  it('uses an endpoints override for a new collection too', () => {
    const urls: string[] = getManagementCollectionUrls({
      ...baseConfig,
      endpoints: {secrets: 'https://vault.example.com/secrets'},
    }).map((url: URL) => url.toString());

    expect(urls).toContain('https://vault.example.com/secrets');
    expect(urls).not.toContain('https://id.example.com/secrets');
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
    'https://id.example.com/applications',
    'https://id.example.com/applications?limit=10&offset=0',
    'https://id.example.com/applications/app-1',
    'https://id.example.com/applications/app-1/sharing-policies/p-1',
    'https://id.example.com/organization-units/tree/engineering/platform/users?include=display',
    'https://id.example.com/resource-servers/rs-1/resources/r-1/actions/a-1',
    'https://id.example.com/connections/google/c-1/usages',
    'https://id.example.com/flows/f-1/restore',
    'https://id.example.com/notification-templates/email/templates/t-1',
    'https://id.example.com/design/themes/th-1',
    'https://id.example.com/i18n/languages/en-US/translations/resolve',
    'https://id.example.com/server-config/flow',
    'https://id.example.com/gateways/gw-1/secrets/S',
    'https://id.example.com/variables/A',
    'https://id.example.com/secrets',
    'https://id.example.com/configuration-versions/abc1234',
    'https://id.example.com/import/delete',
    'https://id.example.com/export',
    'https://id.example.com/openid4vci/credential-configurations/vc-1',
    'https://id.example.com/openid4vp/presentation-definitions/vp-1',
    'https://id.example.com/oauth2/dcr/register/client-1',
  ])('allows %s', (target: string) => {
    expect(matchManagementUrl(target, collections)).toBeInstanceOf(URL);
  });

  it.each([
    ['another host', 'https://attacker.example.net/users'],
    ['a sibling host', 'https://id.example.com.attacker.net/users'],
    ['another scheme', 'ftp://id.example.com/users'],
    ['a path outside the collections', 'https://id.example.com/oauth2/token'],
    ['the parent of the client registration endpoint', 'https://id.example.com/oauth2/dcr'],
    ['a collection name prefix', 'https://id.example.com/usersx'],
    ['a prefix of a new collection', 'https://id.example.com/exports'],
    ['an application collection name prefix', 'https://id.example.com/applicationsx'],
    ['the client metadata preview, which is not a management collection', 'https://id.example.com/cimd/preview'],
    ['flow execution, which is not a management collection', 'https://id.example.com/flow/execute'],
    ['a path outside the collections on the same host', 'https://id.example.com/scim2/Users'],
    ['an encoded slash in a tree path', 'https://id.example.com/organization-units/tree/a%2Fb'],
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
