// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/typedef, sort-keys, @typescript-eslint/explicit-function-return-type */

import {ThunderIDError, mapPagedSelectError} from '@thunderid/browser';
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';

import NuxtAPIRoutes from '../../src/runtime/constants/NuxtAPIRoutes';
import {fetchUsersFromServer} from '../../src/runtime/utils/fetchUsersFromServer';

const $fetch = vi.fn();
const request = {component: {} as never, limit: 30, offset: 60, signal: new AbortController().signal};

describe('fetchUsersFromServer', () => {
  beforeEach(() => {
    vi.stubGlobal('$fetch', $fetch);
    $fetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls the users route with paging, filter and the abort signal, and returns the page', async () => {
    const page = {nextOffset: null, options: [{label: 'Jane Doe', value: 'user-1'}], totalResults: 1};
    $fetch.mockResolvedValue({page, success: true});

    const controller = new AbortController();
    await expect(
      fetchUsersFromServer({...request, filter: 'department eq "Engineering"', signal: controller.signal}),
    ).resolves.toEqual(page);

    expect($fetch).toHaveBeenCalledWith(NuxtAPIRoutes.USERS, {
      query: {filter: 'department eq "Engineering"', limit: 30, offset: 60},
      signal: controller.signal,
    });
  });

  it('re-throws a server-vouched message as an SDK error, so the picker shows it', async () => {
    $fetch.mockResolvedValue({
      message: 'Forbidden',
      messageKey: 'elements.fields.paged_select.load_error',
      success: false,
    });

    const thrown = await fetchUsersFromServer(request).catch((error: unknown) => error);

    expect(thrown).toBeInstanceOf(ThunderIDError);
    expect(mapPagedSelectError(thrown).message).toBe('Forbidden');
  });

  it('throws a bare Error when the server gave no message, so the picker falls back to the generic text', async () => {
    $fetch.mockResolvedValue({messageKey: 'elements.fields.paged_select.load_error', success: false});

    const thrown = await fetchUsersFromServer(request).catch((error: unknown) => error);

    expect(thrown).not.toBeInstanceOf(ThunderIDError);
    expect(mapPagedSelectError(thrown).message).toBeUndefined();
  });
});
