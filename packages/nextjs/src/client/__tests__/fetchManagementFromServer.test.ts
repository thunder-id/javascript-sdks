// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDAPIError, getGroups} from '@thunderid/node';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import managementRequestAction from '../../server/actions/managementRequestAction';
import fetchManagementFromServer from '../fetchManagementFromServer';

vi.mock('../../server/actions/managementRequestAction', () => ({default: vi.fn()}));

describe('fetchManagementFromServer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('forwards only the URL, method and body: no headers or signal cross to the server', async () => {
    vi.mocked(managementRequestAction).mockResolvedValue({body: '{}', status: 200, statusText: 'OK'});

    await fetchManagementFromServer('https://id.example.com/groups', {
      body: '{"name":"Admins"}',
      headers: {Authorization: 'Bearer from-the-browser'},
      method: 'POST',
      signal: new AbortController().signal,
    });

    expect(managementRequestAction).toHaveBeenCalledWith({
      body: '{"name":"Admins"}',
      method: 'POST',
      url: 'https://id.example.com/groups',
    });
  });

  it('serves a core API function end to end', async () => {
    vi.mocked(managementRequestAction).mockResolvedValue({
      body: JSON.stringify({count: 1, groups: [{id: 'g-1', name: 'Admins'}], startIndex: 0, totalResults: 1}),
      status: 200,
      statusText: 'OK',
    });

    const page = await getGroups({baseUrl: 'https://id.example.com', fetcher: fetchManagementFromServer, limit: 10});

    expect(page.groups).toEqual([{id: 'g-1', name: 'Admins'}]);
    const [[request]] = vi.mocked(managementRequestAction).mock.calls;

    expect(request.method).toBe('GET');
    expect(request.url).toMatch(/^https:\/\/id\.example\.com\/groups\?.*limit=10/);
  });

  it('keeps a 403 distinct from a 404 for the core API function', async () => {
    vi.mocked(managementRequestAction).mockResolvedValueOnce({
      body: 'Management request failed (HTTP 403).',
      status: 403,
      statusText: 'Forbidden',
    });
    vi.mocked(managementRequestAction).mockResolvedValueOnce({
      body: 'Management request failed (HTTP 404).',
      status: 404,
      statusText: 'Not Found',
    });

    const forbidden = await getGroups({baseUrl: 'https://id.example.com', fetcher: fetchManagementFromServer}).catch(
      (error: unknown) => error,
    );
    const missing = await getGroups({baseUrl: 'https://id.example.com', fetcher: fetchManagementFromServer}).catch(
      (error: unknown) => error,
    );

    expect(forbidden).toBeInstanceOf(ThunderIDAPIError);
    expect(forbidden).toMatchObject({statusCode: 403});
    expect((forbidden as ThunderIDAPIError).code).toContain('ForbiddenError');
    expect((missing as ThunderIDAPIError).code).toContain('NotFoundError');
  });
});
