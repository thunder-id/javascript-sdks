// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {StepUpRequiredError} from '@thunderid/browser';
import {afterEach, describe, expect, it, vi} from 'vitest';
import updateMeProfile from '../updateMeProfile';

// The httpClient-to-Response adapter is covered in @thunderid/browser's createHttpClientFetcher tests.
// This checks that the wrapper uses it, so a refused write reaches the core function's error mapping.
const mockFetcher = vi.fn();

vi.mock('@thunderid/browser', async () => {
  const actual = await vi.importActual<typeof import('@thunderid/browser')>('@thunderid/browser');
  return {
    ...actual,
    createHttpClientFetcher: () => mockFetcher,
  };
});

describe('updateMeProfile (react)', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('turns a step-up challenge into a StepUpRequiredError with its maxAge', async () => {
    mockFetcher.mockResolvedValueOnce({
      headers: new Headers({
        'WWW-Authenticate': 'Bearer error="insufficient_user_authentication", max_age="180"',
      }),
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: () =>
        Promise.resolve(JSON.stringify({code: 'AUTH-4011', message: {defaultValue: 'Recent authentication required'}})),
    } as Response);

    const error: unknown = await updateMeProfile({
      payload: {email: 'new@example.com'},
      url: 'https://localhost:8090/users/me',
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(StepUpRequiredError);
    expect((error as StepUpRequiredError).maxAge).toBe(180);
  });

  it('resolves with the updated profile', async () => {
    mockFetcher.mockResolvedValueOnce({
      json: () => Promise.resolve({email: 'new@example.com', id: 'user-1'}),
      ok: true,
      status: 200,
      statusText: 'OK',
    } as Response);

    await expect(
      updateMeProfile({payload: {email: 'new@example.com'}, url: 'https://localhost:8090/users/me'}),
    ).resolves.toMatchObject({id: 'user-1'});
  });
});
