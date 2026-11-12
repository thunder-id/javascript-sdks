// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/typedef, sort-keys, @typescript-eslint/explicit-function-return-type */

import {getFlowMeta, ThunderIDAPIError} from '@thunderid/node';
import {getQuery} from 'h3';
import {describe, it, expect, vi, beforeEach} from 'vitest';

import metaHandler from '../../src/runtime/server/routes/auth/session/meta.get';

// ── vi.hoisted ────────────────────────────────────────────────────────────────
const mocks = vi.hoisted(() => ({
  getConfigData: vi.fn<() => Promise<any>>(),
  log: {debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn()},
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('h3', () => ({
  defineEventHandler: (fn: Function) => fn,
  getQuery: vi.fn(),
  createError: vi.fn((opts: any) => Object.assign(new Error(opts.statusMessage), opts)),
}));

vi.mock('@thunderid/node', async (importOriginal: () => Promise<Record<string, unknown>>) => ({
  ...(await importOriginal()),
  getFlowMeta: vi.fn(),
}));

vi.mock('../../src/runtime/server/ThunderIDNuxtClient', () => ({
  default: {getInstance: () => ({getStorageManager: () => ({getConfigData: mocks.getConfigData})})},
}));

vi.mock('../../src/runtime/utils/log', () => ({
  createLogger: vi.fn(() => mocks.log),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockEvent = {};

const notFound = () =>
  new ThunderIDAPIError('<html>Not Found</html>', 'getFlowMeta-ResponseError-001', 'javascript', 404);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/auth/meta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getQuery).mockReturnValue({});
    mocks.getConfigData.mockResolvedValue({applicationId: 'app-1', baseUrl: 'https://localhost:8090'});
  });

  it('returns the flow metadata for the configured application and requested language', async () => {
    const meta = {design: {}, i18n: {}};
    vi.mocked(getQuery).mockReturnValue({language: 'fr'});
    vi.mocked(getFlowMeta).mockResolvedValue(meta as any);

    await expect((metaHandler as any)(mockEvent)).resolves.toBe(meta);
    expect(getFlowMeta).toHaveBeenCalledWith({
      baseUrl: 'https://localhost:8090',
      id: 'app-1',
      language: 'fr',
      type: 'APP',
      url: undefined,
    });
  });

  it('returns null, warning only once, when the server has no flow metadata endpoint', async () => {
    mocks.getConfigData.mockResolvedValue({baseUrl: 'https://idp.example.com/oauth2/token'});
    vi.mocked(getFlowMeta).mockRejectedValue(notFound());

    await expect((metaHandler as any)(mockEvent)).resolves.toBeNull();
    await expect((metaHandler as any)(mockEvent)).resolves.toBeNull();

    expect(mocks.log.warn).toHaveBeenCalledTimes(1);
    expect(mocks.log.debug).toHaveBeenCalledTimes(1);
    expect(mocks.log.error).not.toHaveBeenCalled();
  });

  it('returns null when the server answers with a body that is not JSON', async () => {
    vi.mocked(getFlowMeta).mockRejectedValue(
      new ThunderIDAPIError('Not JSON', 'getFlowMeta-InvalidResponseError-001', 'javascript', 200),
    );

    await expect((metaHandler as any)(mockEvent)).resolves.toBeNull();
    expect(mocks.log.error).not.toHaveBeenCalled();
  });

  it('answers 502 without the upstream reply when ThunderID refuses the request', async () => {
    vi.mocked(getFlowMeta).mockRejectedValue(
      new ThunderIDAPIError(
        JSON.stringify({code: 'FM-1004', message: {defaultValue: 'upstream secret detail'}}),
        'getFlowMeta-ResponseError-001',
        'javascript',
        404,
      ),
    );

    const thrown: any = await (metaHandler as any)(mockEvent).catch((error: unknown) => error);

    expect(thrown).toMatchObject({statusCode: 502, statusMessage: 'Failed to load flow metadata.'});
    expect(thrown.message).not.toContain('upstream secret detail');
    expect(mocks.log.error).toHaveBeenCalledTimes(1);
  });

  it('answers 502 when the server cannot be reached', async () => {
    vi.mocked(getFlowMeta).mockRejectedValue(new TypeError('fetch failed'));

    await expect((metaHandler as any)(mockEvent)).rejects.toMatchObject({statusCode: 502});
    expect(mocks.log.error).toHaveBeenCalledWith('Failed to fetch flow metadata:', 'fetch failed');
  });
});
