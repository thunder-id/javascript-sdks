// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import resolveResourceEndpoint, {RESOURCE_ENDPOINT_KEYS} from '../resolveResourceEndpoint';

describe('resolveResourceEndpoint', (): void => {
  it('returns undefined when no explicit URL and no override are set (fallback to baseUrl)', (): void => {
    expect(resolveResourceEndpoint('flowExecute', {})).toBeUndefined();
    expect(resolveResourceEndpoint('flowExecute', {endpoints: {}})).toBeUndefined();
    expect(resolveResourceEndpoint('flowExecute', undefined)).toBeUndefined();
  });

  it('returns the config override when set', (): void => {
    const config = {endpoints: {flowExecute: 'https://rs.example.com/flow/execute'}};

    expect(resolveResourceEndpoint('flowExecute', config)).toBe('https://rs.example.com/flow/execute');
  });

  it('resolves each supported resource endpoint key independently', (): void => {
    const config = {
      endpoints: {
        flowExecute: 'https://rs.example.com/flow/execute',
        flowMeta: 'https://rs.example.com/flow/meta',
        usersMe: 'https://rs.example.com/users/me',
        usersMeMeta: 'https://rs.example.com/users/me/meta',
      },
    };

    expect(resolveResourceEndpoint('flowExecute', config)).toBe('https://rs.example.com/flow/execute');
    expect(resolveResourceEndpoint('flowMeta', config)).toBe('https://rs.example.com/flow/meta');
    expect(resolveResourceEndpoint('usersMe', config)).toBe('https://rs.example.com/users/me');
    expect(resolveResourceEndpoint('usersMeMeta', config)).toBe('https://rs.example.com/users/me/meta');
  });

  it('prefers an explicit per-call URL over the config override', (): void => {
    const config = {endpoints: {flowExecute: 'https://rs.example.com/flow/execute'}};

    expect(resolveResourceEndpoint('flowExecute', config, 'https://explicit.example.com/flow/execute')).toBe(
      'https://explicit.example.com/flow/execute',
    );
  });

  it('falls back to the config override when the explicit URL is undefined', (): void => {
    const config = {endpoints: {flowExecute: 'https://rs.example.com/flow/execute'}};

    expect(resolveResourceEndpoint('flowExecute', config, undefined)).toBe('https://rs.example.com/flow/execute');
  });

  it('exposes the resource endpoint keys for filtering OIDC metadata', (): void => {
    expect([...RESOURCE_ENDPOINT_KEYS].sort()).toEqual([
      'flowExecute',
      'flowMeta',
      'usersMe',
      'usersMeCredentials',
      'usersMeMeta',
    ]);
  });
});
