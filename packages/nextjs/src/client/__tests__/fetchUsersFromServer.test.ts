// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDError, mapPagedSelectError} from '@thunderid/node';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import getUsersAction from '../../server/actions/getUsersAction';
import fetchUsersFromServer from '../fetchUsersFromServer';

vi.mock('../../server/actions/getUsersAction', () => ({default: vi.fn()}));

const request = {component: {} as never, limit: 30, offset: 60, signal: new AbortController().signal};

describe('fetchUsersFromServer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns the normalized page the server action produced', async () => {
    const page = {nextOffset: null, options: [{label: 'Jane Doe', value: 'user-1'}], totalResults: 1};
    vi.mocked(getUsersAction).mockResolvedValue({page, success: true});

    await expect(fetchUsersFromServer(request)).resolves.toEqual(page);
  });

  it('forwards only paging and filter — no signal, session, or URL crosses to the server', async () => {
    vi.mocked(getUsersAction).mockResolvedValue({page: {nextOffset: null, options: []}, success: true});

    await fetchUsersFromServer({...request, filter: 'department eq "Engineering"'});

    expect(getUsersAction).toHaveBeenCalledWith({filter: 'department eq "Engineering"', limit: 30, offset: 60});
  });

  it('re-throws a server-vouched message as an SDK error, so the picker shows it', async () => {
    vi.mocked(getUsersAction).mockResolvedValue({
      message: 'Forbidden',
      messageKey: 'elements.fields.paged_select.load_error',
      success: false,
    });

    const thrown = await fetchUsersFromServer(request).catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(ThunderIDError);
    expect(mapPagedSelectError(thrown).message).toBe('Forbidden');
  });

  it('throws a bare Error when the server gave no message, so the picker falls back to the generic text', async () => {
    vi.mocked(getUsersAction).mockResolvedValue({
      messageKey: 'elements.fields.paged_select.load_error',
      success: false,
    });

    const thrown = await fetchUsersFromServer(request).catch((error: unknown) => error);

    expect(thrown).not.toBeInstanceOf(ThunderIDError);
    expect(mapPagedSelectError(thrown).message).toBeUndefined();
  });
});
