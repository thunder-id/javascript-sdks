// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import getTokenPermissions from '../getTokenPermissions';
import hasPermission from '../hasPermission';

const token = (payload: Record<string, unknown>): string => {
  // A JWT carries UTF-8 JSON, so encode the bytes rather than the UTF-16 code units.
  const encode = (value: unknown): string =>
    btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(value))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

  return `${encode({alg: 'none'})}.${encode(payload)}.signature`;
};

describe('getTokenPermissions', () => {
  it('reads a space separated scope claim', () => {
    expect(getTokenPermissions(token({scope: 'openid system:user  system:group:view'}))).toEqual([
      'openid',
      'system:user',
      'system:group:view',
    ]);
  });

  it('reads a scopes list claim, ignoring entries that are not strings', () => {
    expect(getTokenPermissions(token({scopes: ['system:agent', 7]}))).toEqual(['system:agent']);
  });

  it('decodes non ASCII claims', () => {
    expect(getTokenPermissions(token({name: 'Zoë', scope: 'system'}))).toEqual(['system']);
  });

  it('returns nothing for a token it cannot read', () => {
    expect(getTokenPermissions(undefined)).toEqual([]);
    expect(getTokenPermissions('opaque-token')).toEqual([]);
    expect(getTokenPermissions('a.not-json.c')).toEqual([]);
    expect(getTokenPermissions(token({sub: 'u-1'}))).toEqual([]);
  });
});

describe('hasPermission', () => {
  it('lets a permission cover everything under it', () => {
    expect(hasPermission(['system'], 'system:user:view')).toBe(true);
    expect(hasPermission(['system:user'], 'system:user:view')).toBe(true);
    expect(hasPermission(['system:user:view'], 'system:user:view')).toBe(true);
  });

  it('does not let a permission cover its parent or a sibling with a shared prefix', () => {
    expect(hasPermission(['system:user:view'], 'system:user')).toBe(false);
    expect(hasPermission(['system:user'], 'system:usertype:view')).toBe(false);
  });

  it('always covers an empty requirement', () => {
    expect(hasPermission([], '')).toBe(true);
  });

  it('matches only exactly on a resource server without hierarchical permissions', () => {
    expect(hasPermission(['orders'], 'orders:create', {hierarchical: false})).toBe(false);
    expect(hasPermission(['orders:create'], 'orders:create', {hierarchical: false})).toBe(true);
  });

  it('uses the resource server delimiter', () => {
    expect(hasPermission(['orders'], 'orders.create', {delimiter: '.'})).toBe(true);
    expect(hasPermission(['orders'], 'orders:create', {delimiter: '.'})).toBe(false);
    expect(hasPermission(['orders'], 'orders.create')).toBe(false);
  });

  it('does not let an empty granted permission cover anything', () => {
    expect(hasPermission([''], ':orders')).toBe(false);
  });
});
