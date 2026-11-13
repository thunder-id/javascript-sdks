// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {flushPromises, mount} from '@vue/test-utils';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {h} from 'vue';
import ThunderIDProvider from '../../providers/ThunderIDProvider';

const client = vi.hoisted(() => ({
  clearSession: vi.fn(),
  getConfiguration: vi.fn(),
  getDecodedIdToken: vi.fn().mockResolvedValue({sub: 'user-1'}),
  getDiscoveryResponse: vi.fn().mockResolvedValue({}),
  getUser: vi.fn().mockResolvedValue({sub: 'user-1'}),
  initialize: vi.fn().mockResolvedValue(true),
  isInitialized: vi.fn().mockResolvedValue(true),
  isLoading: vi.fn(() => false),
  isSignedIn: vi.fn(),
  on: vi.fn(),
  signIn: vi.fn(),
}));

vi.mock('../../ThunderIDVueClient', () => ({
  default: vi.fn().mockImplementation(function MockClient() {
    return client;
  }),
}));

const mountProvider = async (): Promise<void> => {
  mount(ThunderIDProvider, {
    props: {baseUrl: 'https://localhost:8090', clientId: 'client', preferences: {user: {fetchUserProfile: false}}},
    slots: {default: () => h('div')},
  });
  await flushPromises();
};

describe('ThunderIDProvider callback while signed in', () => {
  beforeEach(() => {
    client.getConfiguration.mockResolvedValue({afterSignInUrl: window.location.origin});
    client.isSignedIn.mockResolvedValue(true);
    client.signIn.mockResolvedValue({sub: 'user-1'});
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
    vi.clearAllMocks();
  });

  it('completes a switch that returns with a code while the previous session is signed in', async () => {
    window.history.replaceState(null, '', '/?code=code-1&state=instance_0_request-1');

    await mountProvider();

    expect(client.signIn).toHaveBeenCalledOnce();
  });

  it('does not sign in again when the URL carries no callback', async () => {
    await mountProvider();

    expect(client.signIn).not.toHaveBeenCalled();
  });

  it('ignores a callback meant for another instance', async () => {
    window.history.replaceState(null, '', '/?code=code-1&state=instance_9_request-1');

    await mountProvider();

    expect(client.signIn).not.toHaveBeenCalled();
  });

  it('keeps the current session when the switch cannot be completed', async () => {
    client.signIn.mockRejectedValue(new Error('state mismatch'));
    window.history.replaceState(null, '', '/?code=code-1&state=instance_0_request-1');

    await mountProvider();

    expect(client.signIn).toHaveBeenCalledOnce();
    expect(client.clearSession).not.toHaveBeenCalled();
  });
});
