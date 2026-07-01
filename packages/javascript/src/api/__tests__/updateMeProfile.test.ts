/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {Mock, beforeEach, describe, expect, it, vi} from 'vitest';
import ThunderIDAPIError from '../../errors/ThunderIDAPIError';
import type {User} from '../../models/user';
import updateMeProfile from '../updateMeProfile';

describe('updateMeProfile', (): void => {
  beforeEach((): void => {
    vi.resetAllMocks();
  });

  it('should update profile successfully using default fetch', async (): Promise<void> => {
    const mockUserResponse = {
      id: 'u1',
      attributes: {
        email: 'alice@example.com',
        name: 'Alice',
      },
    };

    const mockUser: User = {
      ...mockUserResponse,
      ...mockUserResponse.attributes,
    };

    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockUserResponse),
      ok: true,
    });

    const url = 'https://localhost:8090/users/me';
    const payload: Record<string, unknown> = {given_name: 'Alice'};

    const result: User = await updateMeProfile({payload, url});

    expect(fetch).toHaveBeenCalledTimes(1);
    const [calledUrl, init]: [string, RequestInit] = (fetch as unknown as Mock).mock.calls[0];

    expect(calledUrl).toBe(url);
    expect(init.method).toBe('PUT');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect((init.headers as Record<string, string>)['Accept']).toBe('application/json');

    const parsed: Record<string, unknown> = JSON.parse(init.body as string);
    expect(parsed.attributes).toEqual(payload);

    expect(result).toEqual(mockUser);
  });

  it('should fall back to baseUrl when url is not provided', async (): Promise<void> => {
    const mockUserResponse = {
      id: 'u2',
      attributes: {
        email: 'bob@example.com',
        name: 'Bob',
      },
    };

    const mockUser: User = {
      ...mockUserResponse,
      ...mockUserResponse.attributes,
    };

    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockUserResponse),
      ok: true,
    });

    const baseUrl = 'https://localhost:8090';
    const payload: Record<string, unknown> = {givenName: 'Bob'};

    const result: User = await updateMeProfile({baseUrl, payload});

    expect(fetch).toHaveBeenCalledWith(`${baseUrl}/users/me`, expect.any(Object));
    expect(result).toEqual(mockUser);
  });

  it('should use custom fetcher when provided', async (): Promise<void> => {
    const mockUserResponse = {
      id: 'u3',
      attributes: {
        email: 'carol@example.com',
        name: 'Carol',
      },
    };

    const mockUser: User = {
      ...mockUserResponse,
      ...mockUserResponse.attributes,
    };

    const customFetcher: Mock = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockUserResponse),
      ok: true,
    });

    const baseUrl = 'https://localhost:8090';
    const payload: Record<string, unknown> = {familyName: 'Doe'};

    const result: User = await updateMeProfile({baseUrl, fetcher: customFetcher, payload});

    expect(result).toEqual(mockUser);
    expect(customFetcher).toHaveBeenCalledWith(
      `${baseUrl}/users/me`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json',
        }),
        method: 'PUT',
      }),
    );
  });

  it('should prefer url over baseUrl when both are provided', async (): Promise<void> => {
    const mockUser: User = {email: 'dan@example.com', id: 'u4', name: 'Dan'};
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockUser),
      ok: true,
    });

    const url = 'https://localhost:8090/users/me';
    const baseUrl = 'https://localhost:8090';
    await updateMeProfile({baseUrl, payload: {x: 1}, url});

    expect(fetch).toHaveBeenCalledWith(url, expect.any(Object));
  });

  it('should throw ThunderIDAPIError for invalid URL or baseUrl', async (): Promise<void> => {
    await expect(updateMeProfile({payload: {}, url: 'not-a-valid-url' as any})).rejects.toThrow(ThunderIDAPIError);

    await expect(updateMeProfile({payload: {}, url: 'not-a-valid-url' as any})).rejects.toThrow(
      'Invalid URL provided.',
    );
  });

  it('should throw ThunderIDAPIError when both url and baseUrl are missing', async (): Promise<void> => {
    await expect(updateMeProfile({baseUrl: undefined as any, payload: {}, url: undefined as any})).rejects.toThrow(
      ThunderIDAPIError,
    );
  });

  it('should throw ThunderIDAPIError when both url and baseUrl are empty strings', async (): Promise<void> => {
    await expect(updateMeProfile({baseUrl: '', payload: {}, url: ''})).rejects.toThrow(ThunderIDAPIError);
  });

  it('should handle HTTP error responses', async (): Promise<void> => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: () => Promise.resolve('SCIM validation failed'),
    });

    const baseUrl = 'https://localhost:8090';
    await expect(updateMeProfile({baseUrl, payload: {bad: 'data'}})).rejects.toThrow(ThunderIDAPIError);

    await expect(updateMeProfile({baseUrl, payload: {bad: 'data'}})).rejects.toThrow(
      'Failed to update user profile: SCIM validation failed',
    );
  });

  it('should handle network or unknown errors with the generic message', async (): Promise<void> => {
    // Rejection with Error
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    await expect(updateMeProfile({payload: {a: 1}, url: 'https://localhost:8090/users/me'})).rejects.toThrow(
      ThunderIDAPIError,
    );
    await expect(updateMeProfile({payload: {a: 1}, url: 'https://localhost:8090/users/me'})).rejects.toThrow(
      'An error occurred while updating the user profile. Please try again.',
    );

    // Rejection with non-Error
    global.fetch = vi.fn().mockRejectedValue('weird failure');
    await expect(updateMeProfile({payload: {a: 1}, url: 'https://localhost:8090/users/me'})).rejects.toThrow(
      'An error occurred while updating the user profile. Please try again.',
    );
  });

  it('should pass through custom headers (and enforces content-type & accept)', async (): Promise<void> => {
    const mockUser: User = {email: 'eve@example.com', id: 'u5', name: 'Eve'};

    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockUser),
      ok: true,
    });

    const baseUrl = 'https://localhost:8090';
    const customHeaders: Record<string, string> = {
      Accept: 'text/plain',
      Authorization: 'Bearer token',
      'Content-Type': 'text/plain',
      'X-Custom-Header': 'custom-value',
    };

    await updateMeProfile({baseUrl, headers: customHeaders, payload: {y: 2}});

    const [, init]: [string, RequestInit] = (fetch as unknown as Mock).mock.calls[0];
    expect((init as Record<string, unknown>).headers).toMatchObject({
      Accept: 'application/json',
      Authorization: 'Bearer token',
      'Content-Type': 'application/json',
      'X-Custom-Header': 'custom-value',
    });
  });

  it('should build the PUT attributes body correctly', async (): Promise<void> => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({} as User),
      ok: true,
    });

    const baseUrl = 'https://localhost:8090';
    const payload: Record<string, unknown> = {mobileNumbers: ['123']};

    await updateMeProfile({baseUrl, payload});

    const [, init]: [string, RequestInit] = (fetch as unknown as Mock).mock.calls[0];
    const body: Record<string, unknown> = JSON.parse((init as Record<string, unknown>).body as string);

    expect(body.attributes).toEqual(payload);
  });

  it('should allow method override when provided in requestConfig', async (): Promise<void> => {
    // Note: due to `{ method: 'PATCH', ...requestConfig }` order, requestConfig.method overrides PATCH
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({} as User),
      ok: true,
    });

    const baseUrl = 'https://localhost:8090';
    await updateMeProfile({baseUrl, method: 'PUT' as any, payload: {z: 9}});

    const [, init]: [string, RequestInit] = (fetch as unknown as Mock).mock.calls[0];
    expect(init.method).toBe('PUT');
  });
});
