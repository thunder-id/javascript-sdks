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

describe('ThunderIDExpressClient managementFromRequest', () => {
  it('binds the management client to the session cookie and sends that session token', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({id: 'u1'}), {headers: {'Content-Type': 'application/json'}, status: 200}),
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    try {
      const client = new ThunderIDExpressClient();
      await client.initialize({baseUrl: 'https://auth.example.com', clientId: 'test-client'});
      const getAccessToken = vi.spyOn(client, 'getAccessToken').mockResolvedValue('session-token');

      const req = {cookies: {[client.getSessionCookieName()]: 'session-cookie-123'}} as unknown as express.Request;

      await client.managementFromRequest(req).users.update('u1', {attributes: {name: 'A'}} as never);

      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(getAccessToken).toHaveBeenCalledWith('session-cookie-123');
      expect(url).toBe('https://auth.example.com/users/u1');
      expect(init.method).toBe('PUT');
      expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer session-token');
      expect(JSON.parse(init.body as string)).toEqual({attributes: {name: 'A'}});
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('throws a runtime error when the request has no session cookie', async () => {
    const client = new ThunderIDExpressClient();
    await client.initialize({baseUrl: 'https://auth.example.com', clientId: 'test-client'});

    expect(() => client.managementFromRequest({cookies: {}} as unknown as express.Request)).toThrowError(
      expect.objectContaining({code: 'EXPRESS-CLIENT-MFR-NF01'}),
    );
  });
});
