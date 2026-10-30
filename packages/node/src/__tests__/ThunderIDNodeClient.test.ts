// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import * as thunderJS from '@thunderid/javascript';
import {describe, it, expect, vi} from 'vitest';
import ThunderIDNodeClient from '../ThunderIDNodeClient';

vi.mock('@thunderid/javascript', async (importOriginal) => {
  const actual = await importOriginal<typeof thunderJS>();
  return {
    ...actual,
    getFlows: vi.fn().mockResolvedValue({count: 1, flows: [{id: 'f1'}], links: [], startIndex: 1, totalResults: 1}),
    getUsers: vi.fn().mockResolvedValue({count: 1, links: [], startIndex: 0, totalResults: 1, users: [{id: 'u1'}]}),
    getUserTypes: vi.fn().mockResolvedValue({count: 1, links: [], startIndex: 1, totalResults: 1, types: [{id: 't1'}]}),
    executeEmbeddedSelfServiceFlow: vi.fn().mockResolvedValue({executionId: 'exec-1', flowStatus: 'INCOMPLETE'}),
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

  describe('executeEmbeddedSelfServiceFlow', () => {
    it("sends the step with the session's bearer token to the flow endpoint, and returns the step", async () => {
      const client = new ThunderIDNodeClient();
      await client.initialize({
        baseUrl: 'https://auth.example.com',
        clientId: 'test-client',
        endpoints: {flowExecute: 'https://rs.example.com/flow/execute'},
      });

      const getAccessToken = vi.spyOn(client, 'getAccessToken').mockResolvedValue('test-access-token');
      const payload = {flowType: 'SELF_SERVICE', handle: 'default-self-attribute-verification-flow'} as const;

      const step = await client.executeEmbeddedSelfServiceFlow(payload as never, 'session-1');

      expect(getAccessToken).toHaveBeenCalledWith('session-1');
      expect(thunderJS.executeEmbeddedSelfServiceFlow).toHaveBeenCalledWith({
        baseUrl: 'https://auth.example.com',
        headers: {Authorization: 'Bearer test-access-token'},
        payload,
        url: 'https://rs.example.com/flow/execute',
      });
      expect(step).toEqual({executionId: 'exec-1', flowStatus: 'INCOMPLETE'});
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

  describe('getFlows', () => {
    it('requests one page of the given flow type with the session bearer token', async () => {
      const client = new ThunderIDNodeClient();
      await client.initialize({baseUrl: 'https://auth.example.com', clientId: 'test-client'});
      const getAccessToken = vi.spyOn(client, 'getAccessToken').mockResolvedValue('test-access-token');

      const page = await client.getFlows({flowType: 'AUTHENTICATION', limit: 30, offset: 60}, 'session-1');

      expect(getAccessToken).toHaveBeenCalledWith('session-1');
      expect(thunderJS.getFlows).toHaveBeenLastCalledWith({
        baseUrl: 'https://auth.example.com',
        flowType: 'AUTHENTICATION',
        headers: {Authorization: 'Bearer test-access-token'},
        limit: 30,
        offset: 60,
        url: undefined,
      });
      expect(page.flows).toEqual([{id: 'f1'}]);
    });

    it('uses the configured flows endpoint override when one is set', async () => {
      const client = new ThunderIDNodeClient();
      await client.initialize({
        baseUrl: 'https://auth.example.com',
        clientId: 'test-client',
        endpoints: {flows: 'https://rs.example.com/flows'},
      });
      vi.spyOn(client, 'getAccessToken').mockResolvedValue('test-access-token');

      await client.getFlows({}, 'session-1');

      expect(thunderJS.getFlows).toHaveBeenLastCalledWith(
        expect.objectContaining({url: 'https://rs.example.com/flows'}),
      );
    });
  });

  describe('getUserTypes', () => {
    it('requests one page with the session bearer token and returns the response untouched', async () => {
      const client = new ThunderIDNodeClient();
      await client.initialize({baseUrl: 'https://auth.example.com', clientId: 'test-client'});
      const getAccessToken = vi.spyOn(client, 'getAccessToken').mockResolvedValue('test-access-token');

      const page = await client.getUserTypes({limit: 30, offset: 30}, 'session-1');

      expect(getAccessToken).toHaveBeenCalledWith('session-1');
      expect(thunderJS.getUserTypes).toHaveBeenLastCalledWith({
        baseUrl: 'https://auth.example.com',
        headers: {Authorization: 'Bearer test-access-token'},
        limit: 30,
        offset: 30,
        url: undefined,
      });
      expect(page.types).toEqual([{id: 't1'}]);
    });

    it('uses the configured user types endpoint override when one is set', async () => {
      const client = new ThunderIDNodeClient();
      await client.initialize({
        baseUrl: 'https://auth.example.com',
        clientId: 'test-client',
        endpoints: {userTypes: 'https://rs.example.com/user-types'},
      });
      vi.spyOn(client, 'getAccessToken').mockResolvedValue('test-access-token');

      await client.getUserTypes({}, 'session-1');

      expect(thunderJS.getUserTypes).toHaveBeenLastCalledWith(
        expect.objectContaining({url: 'https://rs.example.com/user-types'}),
      );
    });
  });
});
