// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import getCurrentOrganizationUnitFromClaims from '../getCurrentOrganizationUnitFromClaims';
import resolveOrganizationUnitEndpoint from '../resolveOrganizationUnitEndpoint';

describe('getCurrentOrganizationUnitFromClaims', () => {
  it('reads ouId, ouHandle and ouName', () => {
    expect(getCurrentOrganizationUnitFromClaims({ouHandle: 'acme', ouId: 'ou-1', ouName: 'Acme', sub: 'u'})).toEqual({
      handle: 'acme',
      id: 'ou-1',
      name: 'Acme',
    });
  });

  it('returns only the id when the other claims are absent or blank', () => {
    expect(getCurrentOrganizationUnitFromClaims({ouHandle: '', ouId: 'ou-1'})).toEqual({id: 'ou-1'});
  });

  it('returns null without an ouId', () => {
    expect(getCurrentOrganizationUnitFromClaims({ouName: 'Acme'})).toBeNull();
    expect(getCurrentOrganizationUnitFromClaims({ouId: 42})).toBeNull();
    expect(getCurrentOrganizationUnitFromClaims(undefined)).toBeNull();
  });
});

describe('resolveOrganizationUnitEndpoint', () => {
  it('inserts the encoded unit before the oauth2 segment', () => {
    expect(resolveOrganizationUnitEndpoint('https://example.com/oauth2/token', 'a/b c')).toBe(
      'https://example.com/ou/a%2Fb%20c/oauth2/token',
    );
  });

  it('keeps a path prefix and the query', () => {
    expect(resolveOrganizationUnitEndpoint('https://example.com/t/oauth2/authorize?x=1', 'ou-1')).toBe(
      'https://example.com/t/ou/ou-1/oauth2/authorize?x=1',
    );
  });

  it('builds from baseUrl when the endpoint has no oauth2 segment', () => {
    expect(resolveOrganizationUnitEndpoint('https://idp.example.com/token', 'ou-1', 'https://example.com/')).toBe(
      'https://example.com/ou/ou-1/oauth2/token',
    );
  });

  it('refuses an empty unit and an endpoint it cannot qualify', () => {
    expect(() => resolveOrganizationUnitEndpoint('https://example.com/oauth2/token', ' ')).toThrow(
      expect.objectContaining({code: 'JS-AUTH_CORE-OUEP-IV01'}),
    );
    expect(() => resolveOrganizationUnitEndpoint('https://idp.example.com/token', 'ou-1')).toThrow(
      expect.objectContaining({code: 'JS-AUTH_CORE-OUEP-IV02'}),
    );
  });
});
