// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import getClient from '../../getClient';
import getSessionId from '../getSessionId';
import managementRequestAction from '../managementRequestAction';

vi.mock('../getSessionId', () => ({default: vi.fn()}));
vi.mock('../../getClient', () => ({default: vi.fn()}));

const mockGetAccessToken = vi.fn();
const mockFetch = vi.fn();

const replyWith = (status: number, body: string, statusText = ''): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    statusText,
    text: () => Promise.resolve(body),
  }) as Response;

describe('managementRequestAction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', mockFetch);
    vi.mocked(getSessionId).mockResolvedValue('session-1');
    vi.mocked(getClient).mockReturnValue({
      getAccessToken: mockGetAccessToken,
      getConfiguration: () => Promise.resolve({baseUrl: 'https://id.example.com'}),
      initialize: vi.fn(),
      isInitialized: true,
    } as unknown as ReturnType<typeof getClient>);
    mockGetAccessToken.mockResolvedValue('server-held-token');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('forwards the request with the server-held token and returns the reply', async () => {
    mockFetch.mockResolvedValue(replyWith(200, '{"totalResults":0,"users":[]}', 'OK'));

    const result = await managementRequestAction({method: 'GET', url: 'https://id.example.com/users?limit=20'});

    expect(mockGetAccessToken).toHaveBeenCalledWith('session-1');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://id.example.com/users?limit=20',
      expect.objectContaining({
        headers: {Accept: 'application/json', Authorization: 'Bearer server-held-token'},
        method: 'GET',
        redirect: 'error',
      }),
    );
    expect(result).toEqual({body: '{"totalResults":0,"users":[]}', status: 200, statusText: 'OK'});
  });

  it('sends a JSON body for a write', async () => {
    mockFetch.mockResolvedValue(replyWith(201, '{"id":"g-1"}'));

    await managementRequestAction({body: '{"name":"Admins"}', method: 'post', url: 'https://id.example.com/groups'});

    const [[url, init]] = mockFetch.mock.calls as [[string, RequestInit]];

    expect(url).toBe('https://id.example.com/groups');
    expect(init).toMatchObject({body: '{"name":"Admins"}', method: 'POST'});
    expect(init.headers).toMatchObject({'Content-Type': 'application/json'});
  });

  it('refuses without a session and never reaches the management API', async () => {
    vi.mocked(getSessionId).mockResolvedValue(undefined);

    const result = await managementRequestAction({url: 'https://id.example.com/users'});

    expect(result.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('never sends the token to a URL outside the configured management collections', async () => {
    const result = await managementRequestAction({url: 'https://attacker.example.net/users'});

    expect(result.status).toBe(400);
    expect(mockGetAccessToken).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it.each([
    ['a method the management API does not use', {method: 'PATCH', url: 'https://id.example.com/users'}],
    ['a body that is not a string', {body: {name: 'x'}, method: 'POST', url: 'https://id.example.com/groups'}],
    [
      'a body that is far too long',
      {body: 'x'.repeat(2 * 1024 * 1024), method: 'POST', url: 'https://id.example.com/groups'},
    ],
    ['no URL', {}],
  ])('refuses %s', async (_label: string, request: unknown) => {
    const result = await managementRequestAction(request as never);

    expect(result.status).toBe(400);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('keeps 403 and 404 distinct but does not repeat the reply of the upstream', async () => {
    mockFetch.mockResolvedValueOnce(replyWith(403, '<html>403 from internal-proxy-7.corp.local</html>', 'Forbidden'));
    mockFetch.mockResolvedValueOnce(replyWith(404, 'not here'));

    const forbidden = await managementRequestAction({url: 'https://id.example.com/users/u-1'});
    const missing = await managementRequestAction({url: 'https://id.example.com/users/u-2'});

    expect(forbidden).toMatchObject({status: 403, statusText: 'Forbidden'});
    expect(JSON.stringify(forbidden)).not.toContain('internal-proxy-7');
    expect(missing.status).toBe(404);
  });

  it('maps a network failure to a plain result without its text', async () => {
    mockFetch.mockRejectedValue(new Error('connect ECONNREFUSED 10.0.0.5:8090'));

    const result = await managementRequestAction({url: 'https://id.example.com/users'});

    expect(result.status).toBe(502);
    expect(JSON.stringify(result)).not.toContain('10.0.0.5');
  });

  it('returns 401 when the session has no usable access token', async () => {
    mockGetAccessToken.mockRejectedValue(new Error('Failed to get access token.'));

    const result = await managementRequestAction({url: 'https://id.example.com/users'});

    expect(result.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
