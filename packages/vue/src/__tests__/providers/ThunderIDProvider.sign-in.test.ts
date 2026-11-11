// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDAPIError, ThunderIDRuntimeError} from '@thunderid/browser';
import {flushPromises, mount} from '@vue/test-utils';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {defineComponent, h, inject} from 'vue';
import {THUNDERID_KEY} from '../../keys';
import type {ThunderIDContext} from '../../models/contexts';
import ThunderIDProvider from '../../providers/ThunderIDProvider';

const client = vi.hoisted(() => ({
  getConfiguration: vi.fn().mockResolvedValue({}),
  getDiscoveryResponse: vi.fn().mockResolvedValue({}),
  initialize: vi.fn().mockResolvedValue(true),
  isInitialized: vi.fn().mockResolvedValue(true),
  isLoading: vi.fn(() => false),
  isSignedIn: vi.fn().mockResolvedValue(false),
  on: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock('../../ThunderIDVueClient', () => ({
  default: vi.fn().mockImplementation(function MockClient() {
    return client;
  }),
}));

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

describe('ThunderIDProvider signIn', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the status and the server error code of an API error', async () => {
    const apiError: ThunderIDAPIError = new ThunderIDAPIError(
      JSON.stringify({code: 'FES-1004', message: 'Invalid request'}),
      'FLOW_ERROR',
      'javascript',
      400,
    );
    client.signIn.mockRejectedValue(apiError);
    const context: ThunderIDContext = await mountProvider();

    await expect(context.signIn({executionId: 'e-1'})).rejects.toBe(apiError);
  });

  it('wraps any other failure', async () => {
    client.signIn.mockRejectedValue(new Error('offline'));
    const context: ThunderIDContext = await mountProvider();

    await expect(context.signIn({executionId: 'e-1'})).rejects.toBeInstanceOf(ThunderIDRuntimeError);
  });
});
