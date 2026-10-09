// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import * as thunderJS from '@thunderid/javascript';
import {describe, it, expect, vi} from 'vitest';
import ThunderIDNodeClient from '../ThunderIDNodeClient';

vi.mock('@thunderid/javascript', async (importOriginal) => {
  const actual = await importOriginal<typeof thunderJS>();
  return {
    ...actual,
    getUsers: vi.fn().mockResolvedValue({count: 1, links: [], startIndex: 0, totalResults: 1, users: [{id: 'u1'}]}),
    updateMeCredentials: vi.fn().mockResolvedValue(undefined),
  };
});

describe('ThunderIDNodeClient', () => {
  describe('updateUserCredentials', () => {
    it('calls updateMeCredentials with the correct payload and authorization header', async () => {
      const client = new ThunderIDNodeClient();
      await client.initialize({
        baseUrl: 'https://auth.example.com',
        clientId: 'test-client',
      });

      vi.spyOn(client, 'getAccessToken').mockResolvedValue('test-access-token');

      const payload = {password: 'new-secure-password!'};
      await client.updateUserCredentials(payload, 'user-123');

      expect(thunderJS.updateMeCredentials).toHaveBeenCalledWith({
        baseUrl: 'https://auth.example.com',
        headers: {
          Authorization: 'Bearer test-access-token',
        },
        payload,
        url: undefined,
      });
    });
  });

  describe('getUsers', () => {
    it('requests one page with the session bearer token and returns the response untouched', async () => {
      const client = new ThunderIDNodeClient();
      await client.initialize({
        baseUrl: 'https://auth.example.com',
        clientId: 'test-client',
      });

      const getAccessToken = vi.spyOn(client, 'getAccessToken').mockResolvedValue('test-access-token');

      const page = await client.getUsers({filter: 'department eq "Engineering"', limit: 30, offset: 60}, 'session-1');

      expect(getAccessToken).toHaveBeenCalledWith('session-1');
      expect(thunderJS.getUsers).toHaveBeenCalledWith({
        baseUrl: 'https://auth.example.com',
        filter: 'department eq "Engineering"',
        headers: {
          Authorization: 'Bearer test-access-token',
        },
        limit: 30,
        offset: 60,
        url: undefined,
      });
      expect(page.users).toEqual([{id: 'u1'}]);
    });

    it('uses the configured users endpoint override when one is set', async () => {
      const client = new ThunderIDNodeClient();
      await client.initialize({
        baseUrl: 'https://auth.example.com',
        clientId: 'test-client',
        endpoints: {users: 'https://rs.example.com/users'},
      });

      vi.spyOn(client, 'getAccessToken').mockResolvedValue('test-access-token');

      await client.getUsers({}, 'session-1');

      expect(thunderJS.getUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({url: 'https://rs.example.com/users'}),
      );
    });
  });
});
