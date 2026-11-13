// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {beforeEach, describe, expect, it, vi} from 'vitest';
import isOuSwitchCallback from '../isOuSwitchCallback';

const {client, getSessionId} = vi.hoisted(() => ({
  client: {isOuSwitchCallback: vi.fn(), initialize: vi.fn(), isInitialized: true},
  getSessionId: vi.fn(),
}));

vi.mock('../getSessionId', () => ({default: getSessionId}));
vi.mock('../../getClient', () => ({default: (): typeof client => client}));

describe('isOuSwitchCallback', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    client.isInitialized = true;
  });

  it('is true for the state of a switch this session started', async () => {
    getSessionId.mockResolvedValue('session-1');
    client.isOuSwitchCallback.mockResolvedValue(true);

    await expect(isOuSwitchCallback('state-1')).resolves.toBe(true);
    expect(client.isOuSwitchCallback).toHaveBeenCalledWith('state-1', 'session-1');
  });

  it('is false for a state no switch of this session sent', async () => {
    getSessionId.mockResolvedValue('session-1');
    client.isOuSwitchCallback.mockResolvedValue(false);

    await expect(isOuSwitchCallback('injected')).resolves.toBe(false);
  });

  it('is false without a session', async () => {
    getSessionId.mockResolvedValue(undefined);

    await expect(isOuSwitchCallback('state-1')).resolves.toBe(false);
    expect(client.isOuSwitchCallback).not.toHaveBeenCalled();
  });

  it('is false without a state', async () => {
    getSessionId.mockResolvedValue('session-1');

    await expect(isOuSwitchCallback('')).resolves.toBe(false);
    expect(client.isOuSwitchCallback).not.toHaveBeenCalled();
  });

  it('is false when the check fails', async () => {
    getSessionId.mockResolvedValue('session-1');
    client.isOuSwitchCallback.mockRejectedValue(new Error('storage unavailable'));

    await expect(isOuSwitchCallback('state-1')).resolves.toBe(false);
  });
});
