// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import express from 'express';
import {describe, it, expect, vi} from 'vitest';
import ThunderIDExpressClient from '../ThunderIDExpressClient';

describe('ThunderIDExpressClient', () => {
  describe('updateUserCredentialsFromRequest', () => {
    it('extracts session cookie and calls updateUserCredentials', async () => {
      const client = new ThunderIDExpressClient();
      await client.initialize({
        baseUrl: 'https://auth.example.com',
        clientId: 'test-client',
      });

      const updateCredentialsSpy = vi.spyOn(client, 'updateUserCredentials').mockResolvedValue(undefined);

      const cookieName = client.getSessionCookieName();
      const req = {
        cookies: {
          [cookieName]: 'session-cookie-123',
        },
      } as unknown as express.Request;

      const payload = {password: 'new-password'};
      await client.updateUserCredentialsFromRequest(req, payload);

      expect(updateCredentialsSpy).toHaveBeenCalledWith(payload, 'session-cookie-123');
    });
  });
});
