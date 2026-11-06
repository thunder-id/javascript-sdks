// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Mock, beforeEach, describe, expect, it, vi} from 'vitest';
import getAccessibleOrganizationUnits from '../getAccessibleOrganizationUnits';

const LIST = {
  count: 2,
  current: 'ou-1',
  links: [],
  organizationUnits: [
    {handle: 'acme-ou-1', id: 'ou-1', name: 'Acme OU 1'},
    {handle: 'acme-ou-2', id: 'ou-2', name: 'Acme OU 2'},
  ],
  startIndex: 1,
  totalResults: 2,
};

const ok = (body: unknown): unknown => ({
  json: () => Promise.resolve(body),
  ok: true,
  status: 200,
  text: () => Promise.resolve(JSON.stringify(body)),
});

describe('getAccessibleOrganizationUnits', (): void => {
  beforeEach((): void => {
    vi.resetAllMocks();
  });

  it('reads /users/me/ous with the scope and paging, and returns the page', async (): Promise<void> => {
    global.fetch = vi.fn().mockResolvedValue(ok(LIST));

    const result = await getAccessibleOrganizationUnits({
      baseUrl: 'https://localhost:8090/',
      headers: {Authorization: 'Bearer at'},
      limit: 10,
      offset: 20,
      scope: 'siblings',
    });

    const [url, init] = (fetch as unknown as Mock).mock.calls[0] as [string, RequestInit];

    expect(url).toBe('https://localhost:8090/users/me/ous?limit=10&offset=20&scope=siblings');
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer at');
    expect(result).toEqual({
      count: 2,
      current: 'ou-1',
      organizationUnits: LIST.organizationUnits,
      startIndex: 1,
      totalResults: 2,
    });
  });

  it('sends no query when no options are given', async (): Promise<void> => {
    global.fetch = vi.fn().mockResolvedValue(ok(LIST));

    await getAccessibleOrganizationUnits({baseUrl: 'https://localhost:8090'});

    expect((fetch as unknown as Mock).mock.calls[0][0]).toBe('https://localhost:8090/users/me/ous');
  });

  it('uses an explicit url and a custom fetcher', async (): Promise<void> => {
    const fetcher: Mock = vi.fn().mockResolvedValue(ok({...LIST, organizationUnits: []}));
    global.fetch = vi.fn();

    const result = await getAccessibleOrganizationUnits({fetcher, url: 'https://rs.example.com/me/ous'});

    expect(fetcher.mock.calls[0][0]).toBe('https://rs.example.com/me/ous');
    expect(fetch).not.toHaveBeenCalled();
    expect(result.organizationUnits).toEqual([]);
  });

  it('keeps distinct codes for 403 and 404 and carries the server error', async (): Promise<void> => {
    const envelope = {code: 'USR-1036', message: {defaultValue: 'Invalid scope'}};

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: () => Promise.resolve(JSON.stringify(envelope)),
    });
    await expect(getAccessibleOrganizationUnits({baseUrl: 'https://localhost:8090'})).rejects.toMatchObject({
      code: 'getAccessibleOrganizationUnits-ForbiddenError-001',
      serverError: envelope,
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: () => Promise.resolve(''),
    });
    await expect(getAccessibleOrganizationUnits({baseUrl: 'https://localhost:8090'})).rejects.toMatchObject({
      code: 'getAccessibleOrganizationUnits-NotFoundError-001',
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: () => Promise.resolve(JSON.stringify(envelope)),
    });
    await expect(getAccessibleOrganizationUnits({baseUrl: 'https://localhost:8090'})).rejects.toMatchObject({
      code: 'getAccessibleOrganizationUnits-ResponseError-001',
      statusCode: 400,
    });
  });

  it('refuses a malformed URL before any request', async (): Promise<void> => {
    global.fetch = vi.fn();

    await expect(getAccessibleOrganizationUnits({baseUrl: 'not-a-url'})).rejects.toMatchObject({
      code: 'getAccessibleOrganizationUnits-ValidationError-001',
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
