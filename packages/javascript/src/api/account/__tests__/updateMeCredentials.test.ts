// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Mock, beforeEach, describe, expect, it, vi} from 'vitest';
import StepUpRequiredError from '../../../errors/StepUpRequiredError';
import ThunderIDAPIError from '../../../errors/ThunderIDAPIError';
import updateMeCredentials from '../updateMeCredentials';

describe('updateMeCredentials', (): void => {
  beforeEach((): void => {
    vi.resetAllMocks();
  });

  it('should send the name and new value and resolve with no value on 204', async (): Promise<void> => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: () => Promise.resolve(''),
    });

    const url = 'https://localhost:8090/users/me/update-credentials';

    const result: void = await updateMeCredentials({
      payload: {name: 'password', newValue: 'n3wP@ssword!'},
      url,
    });

    expect(result).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);

    const [calledUrl, init] = (fetch as unknown as Mock).mock.calls[0] as [string, RequestInit];

    expect(calledUrl).toBe(url);
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect((init.headers as Record<string, string>)['Accept']).toBe('application/json');

    const parsed = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(parsed).toEqual({name: 'password', newValue: 'n3wP@ssword!'});
  });

  it('should send the current value when one is given', async (): Promise<void> => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: () => Promise.resolve(''),
    });

    await updateMeCredentials({
      payload: {currentValue: '0ldP@ss!', name: 'pin', newValue: '1234'},
      url: 'https://localhost:8090/users/me/update-credentials',
    });

    const [, init] = (fetch as unknown as Mock).mock.calls[0] as [string, RequestInit];
    const parsed = JSON.parse(init.body as string) as Record<string, unknown>;

    expect(parsed).toEqual({currentValue: '0ldP@ss!', name: 'pin', newValue: '1234'});
    expect(parsed).not.toHaveProperty('attributes');
  });

  it('should leave out an empty current value', async (): Promise<void> => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: () => Promise.resolve(''),
    });

    await updateMeCredentials({
      payload: {currentValue: '', name: 'password', newValue: 'n3wP@ssword!'},
      url: 'https://localhost:8090/users/me/update-credentials',
    });

    const [, init] = (fetch as unknown as Mock).mock.calls[0] as [string, RequestInit];

    expect(JSON.parse(init.body as string)).toEqual({name: 'password', newValue: 'n3wP@ssword!'});
  });

  it.each([
    ['a blank name', {name: ' ', newValue: 'n3wP@ssword!'}],
    ['an empty new value', {name: 'password', newValue: ''}],
  ])('should refuse %s before any request', async (_label: string, payload): Promise<void> => {
    global.fetch = vi.fn();

    await expect(
      updateMeCredentials({payload, url: 'https://localhost:8090/users/me/update-credentials'}),
    ).rejects.toMatchObject({code: 'updateMeCredentials-ValidationError-002'});
    expect(fetch).not.toHaveBeenCalled();
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
      payload: {name: 'password', newValue: 'n3wP@ssword!'},
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

    await updateMeCredentials({
      baseUrl: 'https://localhost:8090',
      payload: {name: 'password', newValue: 'n3wP@ssword!'},
    });

    const [calledUrl] = (fetch as unknown as Mock).mock.calls[0] as [string, RequestInit];

    expect(calledUrl).toBe('https://localhost:8090/users/me/update-credentials');
  });

  it('should strip a trailing slash from baseUrl', async (): Promise<void> => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      text: () => Promise.resolve(''),
    });

    await updateMeCredentials({
      baseUrl: 'https://localhost:8090/',
      payload: {name: 'password', newValue: 'n3wP@ssword!'},
    });

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
      payload: {name: 'password', newValue: 'n3wP@ssword!'},
      url: 'https://localhost:8090/users/me/update-credentials',
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should throw a validation error for a malformed URL', async (): Promise<void> => {
    global.fetch = vi.fn();

    await expect(updateMeCredentials({payload: {name: 'password', newValue: 'x'}, url: 'not-a-url'})).rejects.toThrow(
      ThunderIDAPIError,
    );
    expect(fetch).not.toHaveBeenCalled();

    await expect(
      updateMeCredentials({payload: {name: 'password', newValue: 'x'}, url: 'not-a-url'}),
    ).rejects.toMatchObject({
      code: 'updateMeCredentials-ValidationError-001',
    });
  });

  it('should throw a response error carrying the server status', async (): Promise<void> => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: () =>
        Promise.resolve(
          JSON.stringify({
            code: 'USR-1017',
            message: {defaultValue: 'Missing credentials', key: 'error.userservice.missing_credentials'},
          }),
        ),
    });

    await expect(
      updateMeCredentials({
        payload: {name: 'password', newValue: 'n3wP@ssword!'},
        url: 'https://localhost:8090/users/me/update-credentials',
      }),
    ).rejects.toMatchObject({
      code: 'updateMeCredentials-ResponseError-001',
      statusCode: 400,
    });
  });

  it('should carry the server code and a readable message for a wrong current value', async (): Promise<void> => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      text: () =>
        Promise.resolve(
          JSON.stringify({
            code: 'USR-1048',
            description: {
              defaultValue: 'The current value does not match the credential',
              key: 'error.userservice.invalid_current_credential_description',
            },
            message: {defaultValue: 'Invalid current credential', key: 'error.userservice.invalid_current_credential'},
          }),
        ),
    });

    const error: ThunderIDAPIError = await updateMeCredentials({
      payload: {currentValue: 'wrong', name: 'password', newValue: 'n3wP@ssword!'},
      url: 'https://localhost:8090/users/me/update-credentials',
    }).catch((caught: ThunderIDAPIError) => caught);

    expect(error.statusCode).toBe(403);
    expect(error.serverError?.code).toBe('USR-1048');
    expect(error.message).toBe('Failed to update user credentials: Invalid current credential');
    expect(error.authenticationChallenge).toBeUndefined();
  });

  it('should read the challenge of a 401 that asks for a recent sign-in', async (): Promise<void> => {
    global.fetch = vi.fn().mockResolvedValue({
      headers: new Headers({
        'WWW-Authenticate':
          'Bearer error="insufficient_user_authentication", error_description="A more recent authentication is required", max_age="300"',
      }),
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: () =>
        Promise.resolve(
          JSON.stringify({
            code: 'AUTH-4011',
            message: {
              defaultValue: 'Recent authentication required',
              key: 'error.security.recent_authentication_required',
            },
          }),
        ),
    });

    const error: ThunderIDAPIError = await updateMeCredentials({
      payload: {name: 'pin', newValue: '1234'},
      url: 'https://localhost:8090/users/me/update-credentials',
    }).catch((caught: ThunderIDAPIError) => caught);

    expect(error).toBeInstanceOf(StepUpRequiredError);
    expect(error.code).toBe('updateMeCredentials-StepUpRequired-001');
    expect((error as StepUpRequiredError).maxAge).toBe(300);
    expect(error.statusCode).toBe(401);
    expect(error.serverError?.code).toBe('AUTH-4011');
    expect(error.authenticationChallenge).toEqual({
      error: 'insufficient_user_authentication',
      errorDescription: 'A more recent authentication is required',
      maxAge: 300,
    });
  });

  it('should read the challenge from the body when the header is not readable', async (): Promise<void> => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      text: () =>
        Promise.resolve(
          JSON.stringify({
            code: 'AUTH-4011',
            description: {
              defaultValue:
                'Authenticate again: this change needs an authentication within the last {{param(maxAge)}} seconds',
              key: 'error.security.recent_authentication_required_description',
              params: {maxAge: '120'},
            },
            message: {
              defaultValue: 'Recent authentication required',
              key: 'error.security.recent_authentication_required',
            },
          }),
        ),
    });

    const error: ThunderIDAPIError = await updateMeCredentials({
      payload: {name: 'pin', newValue: '1234'},
      url: 'https://localhost:8090/users/me/update-credentials',
    }).catch((caught: ThunderIDAPIError) => caught);

    expect(error.authenticationChallenge).toEqual({error: 'insufficient_user_authentication', maxAge: 120});
    expect(error).toBeInstanceOf(StepUpRequiredError);
    expect((error as StepUpRequiredError).maxAge).toBe(120);
  });

  it('should throw a network error when the request itself fails', async (): Promise<void> => {
    global.fetch = vi.fn().mockRejectedValue(new Error('connection refused'));

    await expect(
      updateMeCredentials({
        payload: {name: 'password', newValue: 'n3wP@ssword!'},
        url: 'https://localhost:8090/users/me/update-credentials',
      }),
    ).rejects.toMatchObject({
      code: 'updateMeCredentials-NetworkError-001',
    });
  });
});
