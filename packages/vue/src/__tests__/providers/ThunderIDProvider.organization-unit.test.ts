// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {flushPromises, mount} from '@vue/test-utils';
import {afterEach, describe, expect, it, vi, type Mock} from 'vitest';
import {defineComponent, h, inject} from 'vue';
import {THUNDERID_KEY} from '../../keys';
import type {ThunderIDContext} from '../../models/contexts';
import ThunderIDProvider from '../../providers/ThunderIDProvider';

const client = vi.hoisted(() => ({
  getConfiguration: vi.fn(),
  getCurrentOrganizationUnit: vi.fn(),
  getDecodedIdToken: vi.fn(),
  getDiscoveryResponse: vi.fn(),
  initialize: vi.fn(),
  isInitialized: vi.fn(),
  isLoading: vi.fn(() => false),
  isSignedIn: vi.fn(),
  on: vi.fn(),
  switchOrganizationUnit: vi.fn(),
}));

vi.mock('../../ThunderIDVueClient', () => ({
  default: vi.fn().mockImplementation(function MockClient() {
    return client;
  }),
}));

vi.mock('../../api/account/getUsersMe', () => ({default: vi.fn().mockRejectedValue(new Error('offline'))}));
vi.mock('../../api/account/getUsersMeMeta', () => ({default: vi.fn().mockResolvedValue({})}));

const mountProvider = async (): Promise<ThunderIDContext> => {
  let context: ThunderIDContext | undefined;
  const Probe = defineComponent({
    setup() {
      context = inject<ThunderIDContext>(THUNDERID_KEY);
      return () => h('div');
    },
  });

  mount(ThunderIDProvider, {
    props: {baseUrl: 'https://localhost:8090', clientId: 'client', preferences: {user: {fetchUserProfile: false}}},
    slots: {default: () => h(Probe)},
  });
  await flushPromises();

  return context!;
};

describe('ThunderIDProvider organization units', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('refreshes the session and the current unit after a successful switch', async () => {
    client.initialize.mockResolvedValue(true);
    client.getConfiguration.mockResolvedValue({});
    client.isInitialized.mockResolvedValue(true);
    client.isSignedIn.mockResolvedValue(true);
    client.getDecodedIdToken.mockResolvedValue({ouId: 'ou-1', sub: 'u'});
    client.getCurrentOrganizationUnit.mockResolvedValueOnce({id: 'ou-1'}).mockResolvedValue({id: 'ou-2', name: 'B'});
    client.switchOrganizationUnit.mockResolvedValue({sub: 'u'});

    const context: ThunderIDContext = await mountProvider();
    expect(context.currentOrganizationUnit.value).toEqual({id: 'ou-1'});

    await context.switchOrganizationUnit('ou-2');

    expect(client.switchOrganizationUnit).toHaveBeenCalledWith('ou-2', undefined);
    expect(context.currentOrganizationUnit.value).toEqual({id: 'ou-2', name: 'B'});
  });

  it('keeps the state when a switch fails', async () => {
    client.initialize.mockResolvedValue(true);
    client.getConfiguration.mockResolvedValue({});
    client.isInitialized.mockResolvedValue(true);
    client.isSignedIn.mockResolvedValue(true);
    client.getDecodedIdToken.mockResolvedValue({ouId: 'ou-1', sub: 'u'});
    client.getCurrentOrganizationUnit.mockResolvedValue({id: 'ou-1'});
    (client.switchOrganizationUnit as Mock).mockRejectedValue(new Error('unauthorized_client'));

    const context: ThunderIDContext = await mountProvider();
    const callsBefore: number = client.getCurrentOrganizationUnit.mock.calls.length;

    await expect(context.switchOrganizationUnit('ou-9')).rejects.toThrow('unauthorized_client');
    expect(context.isSignedIn.value).toBe(true);
    expect(context.currentOrganizationUnit.value).toEqual({id: 'ou-1'});
    expect(client.getCurrentOrganizationUnit.mock.calls.length).toBe(callsBefore);
  });
});
