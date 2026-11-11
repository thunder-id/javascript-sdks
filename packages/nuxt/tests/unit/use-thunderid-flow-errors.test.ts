// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDAPIError} from '@thunderid/browser';
import {afterEach, describe, expect, it, vi} from 'vitest';

vi.mock('@thunderid/vue', () => ({
  useThunderID: () => ({}),
}));

const {useThunderID} = await import('../../src/runtime/composables/useThunderID');

/** What `$fetch` rejects with when a server route throws `createError` with `data`. */
const routeError = (data?: unknown): Error =>
  Object.assign(new Error('Embedded step failed'), {data: {data, statusCode: 502}, statusCode: 502});

describe('useThunderID embedded flow errors', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('turns a refused sign-in step back into the API error, with the server error code', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(routeError({serverError: {code: 'FES-1004'}})));

    const error: unknown = await useThunderID()
      .signIn({executionId: 'e-1'})
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ThunderIDAPIError);
    expect((error as ThunderIDAPIError).serverError?.code).toBe('FES-1004');
    expect((error as ThunderIDAPIError).statusCode).toBe(502);
  });

  it('turns a refused sign-up step back into the API error, with the server error code', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(routeError({serverError: {code: 'FES-1004'}})));

    const error: unknown = await useThunderID()
      .signUp({flowType: 'REGISTRATION'})
      .catch((e: unknown) => e);

    expect((error as ThunderIDAPIError).serverError?.code).toBe('FES-1004');
  });

  it('leaves any other failure as it is', async () => {
    const failure: Error = routeError();
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(failure));

    await expect(useThunderID().signIn({executionId: 'e-1'})).rejects.toBe(failure);
  });
});
