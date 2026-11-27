// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {afterEach, describe, expect, it, vi} from 'vitest';
import resolveSessionSecret from '../utils/resolveSessionSecret';

const LONG = 'l'.repeat(32);

describe('resolveSessionSecret', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('prefers the configured secret, then THUNDERID_SESSION_SECRET', () => {
    vi.stubEnv('THUNDERID_SESSION_SECRET', `env-${LONG}`);

    expect(resolveSessionSecret({configured: `cfg-${LONG}`})).toBe(`cfg-${LONG}`);
    expect(resolveSessionSecret()).toBe(`env-${LONG}`);
  });

  it('reads a deprecated variable with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    vi.stubEnv('THUNDERID_SESSION_SECRET', '');
    vi.stubEnv('LEGACY_SECRET_FOR_TEST', LONG);

    expect(resolveSessionSecret({deprecatedEnv: ['LEGACY_SECRET_FOR_TEST']})).toBe(LONG);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('LEGACY_SECRET_FOR_TEST is deprecated'));
  });

  it('throws in production when the secret is missing or short', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('THUNDERID_SESSION_SECRET', '');

    expect(() => resolveSessionSecret()).toThrow(/not set/);
    expect(() => resolveSessionSecret({configured: 'short'})).toThrow(/shorter than 32 bytes/);
  });

  it('falls back to a development secret in development', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('THUNDERID_SESSION_SECRET', '');

    expect(resolveSessionSecret().length).toBeGreaterThanOrEqual(32);
  });

  it('treats an unset or unknown NODE_ENV as a deployment, without the development fallback', () => {
    vi.stubEnv('THUNDERID_SESSION_SECRET', '');
    vi.stubEnv('NODE_ENV', '');

    expect(() => resolveSessionSecret()).toThrow(/not set/);
    vi.stubEnv('NODE_ENV', 'staging');
    expect(() => resolveSessionSecret()).toThrow(/not set/);
  });

  it('refuses the development secret in production, however it is supplied', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('THUNDERID_SESSION_SECRET', '');

    const developmentSecret: string = resolveSessionSecret();

    vi.stubEnv('NODE_ENV', 'production');

    expect(() => resolveSessionSecret({configured: developmentSecret})).toThrow(/development secret/);
    vi.stubEnv('THUNDERID_SESSION_SECRET', developmentSecret);
    expect(() => resolveSessionSecret()).toThrow(/development secret/);
  });
});
