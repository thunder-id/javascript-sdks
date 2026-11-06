// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {afterEach, describe, expect, it, vi} from 'vitest';
import getAccessibleOrganizationUnits from '../../../api/account/getAccessibleOrganizationUnits';

const mockFetcher = vi.fn();

vi.mock('@thunderid/browser', async () => {
  const actual = await vi.importActual<typeof import('@thunderid/browser')>('@thunderid/browser');
  return {
    ...actual,
    createHttpClientFetcher: () => mockFetcher,
  };
});

describe('getAccessibleOrganizationUnits (vue)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('requests /users/me/ous through the SDK http client with the scope and paging', async () => {
    mockFetcher.mockResolvedValueOnce({
      json: () =>
        Promise.resolve({
          count: 1,
          current: 'ou-1',
          links: [],
          organizationUnits: [{handle: 'acme', id: 'ou-1', name: 'Acme'}],
          startIndex: 1,
          totalResults: 1,
        }),
      ok: true,
      status: 200,
    } as Response);

    const result = await getAccessibleOrganizationUnits({
      baseUrl: 'https://localhost:8090',
      limit: 5,
      offset: 0,
      scope: 'siblings',
    });

    expect(mockFetcher.mock.calls[0][0]).toBe('https://localhost:8090/users/me/ous?limit=5&offset=0&scope=siblings');
    expect(result).toEqual({
      count: 1,
      current: 'ou-1',
      organizationUnits: [{handle: 'acme', id: 'ou-1', name: 'Acme'}],
      startIndex: 1,
      totalResults: 1,
    });
  });

  it('prefers an explicit fetcher and keeps a 403 distinct', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: () => Promise.resolve(''),
    } as Response);

    await expect(getAccessibleOrganizationUnits({baseUrl: 'https://localhost:8090', fetcher})).rejects.toMatchObject({
      code: 'getAccessibleOrganizationUnits-ForbiddenError-001',
      statusCode: 403,
    });
    expect(mockFetcher).not.toHaveBeenCalled();
  });
});
