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

import {describe, it, expect, vi} from 'vitest';
import ThunderIDAPIError from '../../errors/ThunderIDAPIError';
import getUsersMe from '../getUsersMe';

// Mock user data
const mockUserResponse: Record<string, unknown> = {
  id: '123',
  attributes: {
    email: 'test@example.com',
    familyName: 'User',
    givenName: 'Test',
    username: 'testuser',
  },
};

const mockUser: Record<string, unknown> = {
  ...mockUserResponse,
  ...mockUserResponse.attributes,
};

describe('getUsersMe', () => {
  it('should fetch user profile successfully with default fetch', async () => {
    // Mock fetch
    const mockFetch: typeof fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockUserResponse),
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve(JSON.stringify(mockUserResponse)),
    });

    // Replace global fetch
    global.fetch = mockFetch;

    const result: Record<string, unknown> = await getUsersMe({
      url: 'https://localhost:8090/users/me',
    });

    expect(result).toEqual(mockUser);
    expect(mockFetch).toHaveBeenCalledWith('https://localhost:8090/users/me', {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'GET',
    });
  });

  it('should use custom fetcher when provided', async () => {
    const customFetcher: typeof fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockUserResponse),
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve(JSON.stringify(mockUserResponse)),
    });

    const result: Record<string, unknown> = await getUsersMe({
      fetcher: customFetcher,
      url: 'https://localhost:8090/users/me',
    });

    expect(result).toEqual(mockUser);
    expect(customFetcher).toHaveBeenCalledWith('https://localhost:8090/users/me', {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'GET',
    });
  });

  it('should handle errors thrown directly by custom fetcher', async (): Promise<void> => {
    const customFetcher: typeof fetch = vi.fn().mockImplementation(() => {
      throw new Error('Custom fetcher failure');
    });

    await expect(
      getUsersMe({
        fetcher: customFetcher,
        url: 'https://localhost:8090/users/me',
      }),
    ).rejects.toThrow(ThunderIDAPIError);
    await expect(
      getUsersMe({
        fetcher: customFetcher,
        url: 'https://localhost:8090/users/me',
      }),
    ).rejects.toThrow('Network or parsing error: Custom fetcher failure');
  });

  it('should throw ThunderIDAPIError for invalid URL', async () => {
    await expect(
      getUsersMe({
        url: 'invalid-url',
      }),
    ).rejects.toThrow(ThunderIDAPIError);

    await expect(
      getUsersMe({
        baseUrl: 'invalid-url',
      }),
    ).rejects.toThrow(ThunderIDAPIError);
  });

  it('should throw ThunderIDAPIError for undefined URL', async () => {
    await expect(getUsersMe({})).rejects.toThrow(ThunderIDAPIError);

    const error: ThunderIDAPIError = await getUsersMe({
      baseUrl: undefined,
      url: undefined,
    }).catch((e: ThunderIDAPIError) => e);

    expect(error.name).toBe('ThunderIDAPIError');
    expect(error.code).toBe('getUsersMe-ValidationError-001');
  });

  it('should throw ThunderIDAPIError for empty string URL', async () => {
    await expect(
      getUsersMe({
        url: '',
      }),
    ).rejects.toThrow(ThunderIDAPIError);

    const error: ThunderIDAPIError = await getUsersMe({
      url: '',
    }).catch((e: ThunderIDAPIError) => e);

    expect(error.name).toBe('ThunderIDAPIError');
    expect(error.code).toBe('getUsersMe-ValidationError-001');
  });

  it('should throw ThunderIDAPIError for failed response', async () => {
    const mockFetch: typeof fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: () => Promise.resolve('User not found'),
    });

    global.fetch = mockFetch;

    await expect(
      getUsersMe({
        url: 'https://localhost:8090/users/me',
      }),
    ).rejects.toThrow(ThunderIDAPIError);
  });

  it('should handle network errors', async () => {
    const mockFetch: typeof fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    global.fetch = mockFetch;

    await expect(
      getUsersMe({
        url: 'https://localhost:8090/users/me',
      }),
    ).rejects.toThrow(ThunderIDAPIError);
  });

  it('should handle non-Error rejections', async (): Promise<void> => {
    global.fetch = vi.fn().mockRejectedValue('unexpected failure');

    const baseUrl = 'https://localhost:8090';

    await expect(getUsersMe({baseUrl})).rejects.toThrow(ThunderIDAPIError);
    await expect(getUsersMe({baseUrl})).rejects.toThrow('Network or parsing error: Unknown error');
  });

  it('should pass through custom headers', async () => {
    const mockFetch: typeof fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockUserResponse),
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve(JSON.stringify(mockUserResponse)),
    });

    global.fetch = mockFetch;
    const customHeaders: Record<string, string> = {
      Authorization: 'Bearer token',
      'X-Custom-Header': 'custom-value',
    };

    await getUsersMe({
      headers: customHeaders,
      url: 'https://localhost:8090/users/me',
    });

    expect(mockFetch).toHaveBeenCalledWith('https://localhost:8090/users/me', {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...customHeaders,
      },
      method: 'GET',
    });
  });

  it('should default to baseUrl if url is not provided', async () => {
    const mockFetch: typeof fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(mockUserResponse),
      ok: true,
      status: 200,
      statusText: 'OK',
      text: () => Promise.resolve(JSON.stringify(mockUserResponse)),
    });
    global.fetch = mockFetch;

    const baseUrl = 'https://localhost:8090';
    await getUsersMe({
      baseUrl,
    });
    expect(mockFetch).toHaveBeenCalledWith(`${baseUrl}/users/me`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'GET',
    });
  });
});
