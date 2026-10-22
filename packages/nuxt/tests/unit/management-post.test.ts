// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/typedef, sort-keys, @typescript-eslint/explicit-function-return-type */

import {readBody} from 'h3';
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';

import managementHandler from '../../src/runtime/server/routes/auth/management.post';
import {getValidAccessToken} from '../../src/runtime/server/utils/token-refresh';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('h3', () => ({
  defineEventHandler: (fn: Function) => fn,
  readBody: vi.fn(),
}));

vi.mock('#imports', () => ({
  useRuntimeConfig: vi.fn(() => ({public: {thunderid: {baseUrl: 'https://id.example.com'}}})),
}));

vi.mock('../../src/runtime/server/utils/token-refresh', () => ({
  getValidAccessToken: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockEvent = {};
const mockFetch = vi.fn();

const replyWith = (status: number, body: string, statusText = ''): Response =>
  ({ok: status >= 200 && status < 300, status, statusText, text: () => Promise.resolve(body)}) as Response;

const call = async (body: unknown) => {
  vi.mocked(readBody).mockResolvedValue(body);

  return (managementHandler as any)(mockEvent);
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/auth/management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
    vi.mocked(getValidAccessToken).mockResolvedValue('server-held-token');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('forwards the request with the server-held token and returns the reply', async () => {
    mockFetch.mockResolvedValue(replyWith(200, '{"groups":[]}', 'OK'));

    const result = await call({method: 'GET', url: 'https://id.example.com/groups?limit=10'});

    expect(mockFetch).toHaveBeenCalledWith('https://id.example.com/groups?limit=10', {
      headers: {Accept: 'application/json', Authorization: 'Bearer server-held-token'},
      method: 'GET',
      redirect: 'error',
    });
    expect(result).toEqual({body: '{"groups":[]}', status: 200, statusText: 'OK'});
  });

  it('sends a JSON body for a write', async () => {
    mockFetch.mockResolvedValue(replyWith(201, '{"id":"r-1"}'));

    await call({body: '{"name":"Auditor"}', method: 'post', url: 'https://id.example.com/roles'});

    expect(mockFetch).toHaveBeenCalledWith('https://id.example.com/roles', {
      body: '{"name":"Auditor"}',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer server-held-token',
        'Content-Type': 'application/json',
      },
      method: 'POST',
      redirect: 'error',
    });
  });

  it('returns 401 without a usable session and never reaches the management API', async () => {
    vi.mocked(getValidAccessToken).mockRejectedValue(Object.assign(new Error('Unauthorized'), {statusCode: 401}));

    const result = await call({url: 'https://id.example.com/users'});

    expect(result.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it.each([
    ['another host', {url: 'https://attacker.example.net/users'}],
    ['a path outside the collections', {url: 'https://id.example.com/oauth2/token'}],
    ['a dot segment escaping the collection', {url: 'https://id.example.com/users/../oauth2/token'}],
    ['a method the management API does not use', {method: 'PATCH', url: 'https://id.example.com/users'}],
    ['a body that is not a string', {body: {name: 'x'}, method: 'POST', url: 'https://id.example.com/groups'}],
    ['no URL', {}],
    ['no body at all', undefined],
  ])('refuses %s without sending the token anywhere', async (_label, body) => {
    const result = await call(body);

    expect(result.status).toBe(400);
    expect(getValidAccessToken).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('keeps 403 and 404 distinct but does not repeat the reply of the upstream', async () => {
    mockFetch.mockResolvedValueOnce(replyWith(403, '<html>403 from internal-proxy-7.corp.local</html>', 'Forbidden'));
    mockFetch.mockResolvedValueOnce(replyWith(404, 'not here'));

    const forbidden = await call({url: 'https://id.example.com/users/u-1'});
    const missing = await call({url: 'https://id.example.com/users/u-2'});

    expect(forbidden).toMatchObject({status: 403, statusText: 'Forbidden'});
    expect(JSON.stringify(forbidden)).not.toContain('internal-proxy-7');
    expect(missing.status).toBe(404);
  });

  it('maps a network failure to a plain result without its text', async () => {
    mockFetch.mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.5:8090'));

    const result = await call({url: 'https://id.example.com/users'});

    expect(result.status).toBe(502);
    expect(JSON.stringify(result)).not.toContain('10.0.0.5');
  });
});
