// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/typedef, sort-keys, @typescript-eslint/explicit-function-return-type */

import {ThunderIDAPIError, getRoles} from '@thunderid/browser';
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';

import NuxtAPIRoutes from '../../src/runtime/constants/NuxtAPIRoutes';
import fetchManagementFromServer from '../../src/runtime/utils/fetchManagementFromServer';

const $fetch = vi.fn();

describe('fetchManagementFromServer', () => {
  beforeEach(() => {
    vi.stubGlobal('$fetch', $fetch);
    $fetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts only the URL, method and body to the management route: no headers cross', async () => {
    $fetch.mockResolvedValue({body: '{}', status: 200, statusText: 'OK'});
    const controller = new AbortController();

    await fetchManagementFromServer('https://id.example.com/groups', {
      body: '{"name":"Admins"}',
      headers: {Authorization: 'Bearer from-the-browser'},
      method: 'POST',
      signal: controller.signal,
    });

    expect($fetch).toHaveBeenCalledWith(NuxtAPIRoutes.MANAGEMENT, {
      body: {body: '{"name":"Admins"}', method: 'POST', url: 'https://id.example.com/groups'},
      method: 'POST',
      signal: controller.signal,
    });
  });

  it('serves a core API function end to end', async () => {
    $fetch.mockResolvedValue({
      body: JSON.stringify({count: 1, roles: [{id: 'r-1', name: 'Auditor'}], startIndex: 0, totalResults: 1}),
      status: 200,
      statusText: 'OK',
    });

    const page = await getRoles({baseUrl: 'https://id.example.com', fetcher: fetchManagementFromServer});

    expect(page.roles).toEqual([{id: 'r-1', name: 'Auditor'}]);
  });

  it('keeps a 403 distinct from a 404 for the core API function', async () => {
    $fetch.mockResolvedValueOnce({body: 'Management request failed (HTTP 403).', status: 403, statusText: 'Forbidden'});
    $fetch.mockResolvedValueOnce({body: 'Management request failed (HTTP 404).', status: 404, statusText: 'Not Found'});

    const forbidden = await getRoles({baseUrl: 'https://id.example.com', fetcher: fetchManagementFromServer}).catch(
      (error: unknown) => error,
    );
    const missing = await getRoles({baseUrl: 'https://id.example.com', fetcher: fetchManagementFromServer}).catch(
      (error: unknown) => error,
    );

    expect(forbidden).toBeInstanceOf(ThunderIDAPIError);
    expect((forbidden as ThunderIDAPIError).code).toContain('ForbiddenError');
    expect((missing as ThunderIDAPIError).code).toContain('NotFoundError');
  });
});
