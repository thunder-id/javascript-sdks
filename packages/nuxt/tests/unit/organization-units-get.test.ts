// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/typedef, sort-keys, @typescript-eslint/explicit-function-return-type */

import {getQuery} from 'h3';
import {describe, it, expect, vi, beforeEach} from 'vitest';

import organizationUnitsHandler from '../../src/runtime/server/routes/auth/user/organization-units.get';
import {verifyAndRehydrateSession} from '../../src/runtime/server/utils/serverSession';

const mockClientInstance = vi.hoisted(() => ({
  getAccessibleOrganizationUnits: vi.fn<(...args: any[]) => Promise<any>>(),
}));

vi.mock('h3', () => ({
  defineEventHandler: (fn: Function) => fn,
  getQuery: vi.fn(),
  createError: vi.fn((opts: any) => Object.assign(new Error(opts.statusMessage), opts)),
}));

vi.mock('#imports', () => ({
  useRuntimeConfig: vi.fn(() => ({thunderid: {sessionSecret: 'test-secret'}})),
}));

vi.mock('../../src/runtime/server/ThunderIDNuxtClient', () => ({
  default: {getInstance: () => mockClientInstance},
}));

vi.mock('../../src/runtime/server/utils/serverSession', () => ({
  verifyAndRehydrateSession: vi.fn(),
}));

const page = {
  count: 1,
  current: 'ou-1',
  organizationUnits: [{handle: 'acme', id: 'ou-1', name: 'Acme'}],
  startIndex: 1,
  totalResults: 1,
};

describe('GET /api/auth/user/organization-units', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyAndRehydrateSession).mockResolvedValue({sessionId: 'session-1'} as any);
    vi.mocked(getQuery).mockReturnValue({});
  });

  it('rejects a missing session with 401 and never lists', async () => {
    vi.mocked(verifyAndRehydrateSession).mockResolvedValue(null as any);

    await expect((organizationUnitsHandler as any)({})).rejects.toMatchObject({statusCode: 401});
    expect(mockClientInstance.getAccessibleOrganizationUnits).not.toHaveBeenCalled();
  });

  it('lists with the server-held session, the scope and the paging', async () => {
    vi.mocked(getQuery).mockReturnValue({limit: '5', offset: '10', scope: 'siblings'});
    mockClientInstance.getAccessibleOrganizationUnits.mockResolvedValue(page);

    await expect((organizationUnitsHandler as any)({})).resolves.toEqual(page);
    expect(mockClientInstance.getAccessibleOrganizationUnits).toHaveBeenCalledWith(
      {limit: 5, offset: 10, scope: 'siblings'},
      'session-1',
    );
  });

  it('refuses a scope the server does not offer and a malformed page', async () => {
    vi.mocked(getQuery).mockReturnValue({scope: 'children'});
    await expect((organizationUnitsHandler as any)({})).rejects.toMatchObject({statusCode: 400});

    vi.mocked(getQuery).mockReturnValue({limit: '-1'});
    await expect((organizationUnitsHandler as any)({})).rejects.toMatchObject({statusCode: 400});
    expect(mockClientInstance.getAccessibleOrganizationUnits).not.toHaveBeenCalled();
  });

  it('keeps the server status without repeating its reply', async () => {
    mockClientInstance.getAccessibleOrganizationUnits.mockRejectedValue(
      Object.assign(new Error('secret upstream detail'), {statusCode: 403}),
    );

    await expect((organizationUnitsHandler as any)({})).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'The organization units could not be loaded.',
    });
  });
});
