// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Mock, beforeEach, describe, expect, it, vi} from 'vitest';
import getAccessibleOrganizationUnits from '../getAccessibleOrganizationUnits';

const mockBase = vi.fn() as Mock;
const mockCreateFetcher = vi.fn() as Mock;

vi.mock('@thunderid/browser', () => ({
  createHttpClientFetcher: (...args: unknown[]): unknown => mockCreateFetcher(...args) as unknown,
  getAccessibleOrganizationUnits: (...args: unknown[]): unknown => mockBase(...args) as unknown,
}));

describe('getAccessibleOrganizationUnits (React)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBase.mockResolvedValue({count: 0, current: 'ou-1', organizationUnits: [], startIndex: 1, totalResults: 0});
  });

  it("uses the SDK's HTTP client, which attaches the access token, for the instance", async () => {
    const fetcher = vi.fn();
    mockCreateFetcher.mockReturnValue(fetcher);

    const result = await getAccessibleOrganizationUnits({
      baseUrl: 'https://localhost:8090',
      instanceId: 2,
      scope: 'siblings',
    });

    expect(mockCreateFetcher).toHaveBeenCalledWith(2);
    expect(mockBase).toHaveBeenCalledWith({baseUrl: 'https://localhost:8090', fetcher, scope: 'siblings'});
    expect(result.current).toBe('ou-1');
  });

  it('keeps a fetcher the caller supplies', async () => {
    const fetcher = vi.fn();

    await getAccessibleOrganizationUnits({baseUrl: 'https://localhost:8090', fetcher});

    expect(mockCreateFetcher).not.toHaveBeenCalled();
    expect(mockBase.mock.calls[0][0]).toMatchObject({fetcher});
  });
});
