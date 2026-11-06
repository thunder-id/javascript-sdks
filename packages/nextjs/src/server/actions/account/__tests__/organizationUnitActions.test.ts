// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {SignJWT} from 'jose';
import {afterEach, beforeEach, describe, expect, it, Mock, vi} from 'vitest';
import getClient from '../../../getClient';
import getAccessToken from '../../getAccessToken';
import getAccessibleOrganizationUnitsAction from '../getAccessibleOrganizationUnitsAction';
import getCurrentOrganizationUnitAction from '../getCurrentOrganizationUnitAction';

vi.mock('../../../getClient', () => ({default: vi.fn()}));
vi.mock('../../getAccessToken', () => ({default: vi.fn()}));

const page = {
  count: 1,
  current: 'ou-acme',
  links: [],
  organizationUnits: [{handle: 'acme', id: 'ou-acme', name: 'Acme'}],
  startIndex: 1,
  totalResults: 1,
};

describe('getAccessibleOrganizationUnitsAction', () => {
  const fetchMock: Mock = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', fetchMock);
    (getClient as unknown as Mock).mockReturnValue({
      getConfiguration: vi.fn().mockResolvedValue({baseUrl: 'https://localhost:8090'}),
      initialize: vi.fn(),
      isInitialized: true,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('refuses without a session and sends nothing', async () => {
    (getAccessToken as unknown as Mock).mockResolvedValue(undefined);

    expect(await getAccessibleOrganizationUnitsAction()).toEqual({statusCode: 401, success: false});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads /users/me/ous with the session's token, keeping it on the server", async () => {
    (getAccessToken as unknown as Mock).mockResolvedValue('session-token');
    fetchMock.mockResolvedValue({json: () => Promise.resolve(page), ok: true, status: 200});

    const result = await getAccessibleOrganizationUnitsAction({limit: 5, offset: 0, scope: 'siblings'});

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://localhost:8090/users/me/ous?limit=5&offset=0&scope=siblings');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer session-token');
    expect(result).toEqual({
      data: {count: 1, current: 'ou-acme', organizationUnits: page.organizationUnits, startIndex: 1, totalResults: 1},
      success: true,
    });
  });

  it('ignores a scope the server does not offer', async () => {
    (getAccessToken as unknown as Mock).mockResolvedValue('session-token');
    fetchMock.mockResolvedValue({json: () => Promise.resolve(page), ok: true, status: 200});

    await getAccessibleOrganizationUnitsAction({scope: 'everything' as never});

    expect(fetchMock.mock.calls[0][0]).toBe('https://localhost:8090/users/me/ous');
  });

  it('returns the status and code of a rejection without the server message', async () => {
    (getAccessToken as unknown as Mock).mockResolvedValue('session-token');
    fetchMock.mockResolvedValue({ok: false, status: 403, statusText: 'Forbidden', text: () => Promise.resolve('no')});

    expect(await getAccessibleOrganizationUnitsAction()).toEqual({
      code: 'getAccessibleOrganizationUnits-ForbiddenError-001',
      statusCode: 403,
      success: false,
    });
  });
});

describe('getCurrentOrganizationUnitAction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('reads the unit from the claims of the session token', async () => {
    const token: string = await new SignJWT({ouHandle: 'acme', ouId: 'ou-acme', ouName: 'Acme'})
      .setProtectedHeader({alg: 'HS256'})
      .sign(new TextEncoder().encode('test-secret-test-secret-test-secret'));
    (getAccessToken as unknown as Mock).mockResolvedValue(token);

    expect(await getCurrentOrganizationUnitAction()).toEqual({handle: 'acme', id: 'ou-acme', name: 'Acme'});
  });

  it('is null without a session or without the claims', async () => {
    (getAccessToken as unknown as Mock).mockResolvedValue(undefined);
    expect(await getCurrentOrganizationUnitAction()).toBeNull();

    (getAccessToken as unknown as Mock).mockResolvedValue('not-a-jwt');
    expect(await getCurrentOrganizationUnitAction()).toBeNull();
  });
});
