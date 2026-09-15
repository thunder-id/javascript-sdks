// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import * as thunderJS from '@thunderid/javascript';
import {describe, it, expect, vi} from 'vitest';
import ThunderIDNodeClient from '../ThunderIDNodeClient';

vi.mock('@thunderid/javascript', async (importOriginal) => {
  const actual = await importOriginal<typeof thunderJS>();
  return {
    ...actual,
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
});
