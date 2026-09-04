// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Mock, beforeEach, describe, expect, it, vi} from 'vitest';
import ThunderIDAPIError from '../../errors/ThunderIDAPIError';
import updateMeCredentials from '../updateMeCredentials';

describe('updateMeCredentials', (): void => {
  beforeEach((): void => {
    vi.resetAllMocks();
  });

  it('should post the new credential and resolve with no value on 204', async (): Promise<void> => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: () => Promise.resolve(''),
    });

    const url = 'https://localhost:8090/users/me/update-credentials';

    const result: void = await updateMeCredentials({payload: {password: 'n3wP@ssword!'}, url});

    expect(result).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);

    const [calledUrl, init] = (fetch as unknown as Mock).mock.calls[0] as [string, RequestInit];

    expect(calledUrl).toBe(url);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect((init.headers as Record<string, string>)['Accept']).toBe('application/json');

    const parsed = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(parsed['attributes']).toEqual({password: 'n3wP@ssword!'});
  });

  it('should send currentPassword as a top-level field, not inside attributes', async (): Promise<void> => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: () => Promise.resolve(''),
    });

    await updateMeCredentials({
      currentPassword: '0ldP@ssword!',
      payload: {password: 'n3wP@ssword!'},
      url: 'https://localhost:8090/users/me/update-credentials',
    });

    const [, init] = (fetch as unknown as Mock).mock.calls[0] as [string, RequestInit];
    const parsed = JSON.parse(init.body as string) as Record<string, unknown>;

    expect(parsed['currentPassword']).toBe('0ldP@ssword!');
    expect(parsed['attributes']).toEqual({password: 'n3wP@ssword!'});
    expect(parsed['attributes']).not.toHaveProperty('currentPassword');
  });

  it('should omit currentPassword when it is not provided', async (): Promise<void> => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: () => Promise.resolve(''),
    });

    await updateMeCredentials({
      payload: {password: 'n3wP@ssword!'},
      url: 'https://localhost:8090/users/me/update-credentials',
    });

    const [, init] = (fetch as unknown as Mock).mock.calls[0] as [string, RequestInit];
    const parsed = JSON.parse(init.body as string) as Record<string, unknown>;

    expect(parsed).not.toHaveProperty('currentPassword');
  });

  it('should never read the response body on success', async (): Promise<void> => {
    const json: Mock = vi.fn();

    global.fetch = vi.fn().mockResolvedValue({
      json,
      ok: true,
      status: 204,
      text: () => Promise.resolve(''),
    });

    await updateMeCredentials({
      payload: {password: 'n3wP@ssword!'},
      url: 'https://localhost:8090/users/me/update-credentials',
    });

    expect(json).not.toHaveBeenCalled();
  });

  it('should fall back to baseUrl when url is not provided', async (): Promise<void> => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: () => Promise.resolve(''),
    });

    await updateMeCredentials({baseUrl: 'https://localhost:8090', payload: {password: 'n3wP@ssword!'}});

    const [calledUrl] = (fetch as unknown as Mock).mock.calls[0] as [string, RequestInit];

    expect(calledUrl).toBe('https://localhost:8090/users/me/update-credentials');
  });

  it('should strip a trailing slash from baseUrl', async (): Promise<void> => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: () => Promise.resolve(''),
    });

    await updateMeCredentials({baseUrl: 'https://localhost:8090/', payload: {password: 'n3wP@ssword!'}});

    const [calledUrl] = (fetch as unknown as Mock).mock.calls[0] as [string, RequestInit];

    expect(calledUrl).toBe('https://localhost:8090/users/me/update-credentials');
  });

  it('should use a custom fetcher when provided', async (): Promise<void> => {
    const fetcher: Mock = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: () => Promise.resolve(''),
    });

    global.fetch = vi.fn();

    await updateMeCredentials({
      fetcher,
      payload: {password: 'n3wP@ssword!'},
      url: 'https://localhost:8090/users/me/update-credentials',
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should throw a validation error for a malformed URL', async (): Promise<void> => {
    global.fetch = vi.fn();

    await expect(updateMeCredentials({payload: {password: 'x'}, url: 'not-a-url'})).rejects.toThrow(ThunderIDAPIError);
    expect(fetch).not.toHaveBeenCalled();

    await expect(updateMeCredentials({payload: {password: 'x'}, url: 'not-a-url'})).rejects.toMatchObject({
      code: 'updateMeCredentials-ValidationError-001',
    });
  });

  it('should throw a response error carrying the server status', async (): Promise<void> => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: () =>
        Promise.resolve(
          JSON.stringify({
            code: 'USR-1029',
            message: {defaultValue: 'Invalid current password', key: 'error.userservice.invalid_current_password'},
          }),
        ),
    });

    await expect(
      updateMeCredentials({
        currentPassword: 'wrong',
        payload: {password: 'n3wP@ssword!'},
        url: 'https://localhost:8090/users/me/update-credentials',
      }),
    ).rejects.toMatchObject({
      code: 'updateMeCredentials-ResponseError-001',
      statusCode: 403,
    });
  });

  it('should throw a network error when the request itself fails', async (): Promise<void> => {
    global.fetch = vi.fn().mockRejectedValue(new Error('connection refused'));

    await expect(
      updateMeCredentials({
        payload: {password: 'n3wP@ssword!'},
        url: 'https://localhost:8090/users/me/update-credentials',
      }),
    ).rejects.toMatchObject({
      code: 'updateMeCredentials-NetworkError-001',
    });
  });
});
