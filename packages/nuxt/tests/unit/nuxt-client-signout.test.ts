// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/typedef, sort-keys, @typescript-eslint/explicit-function-return-type */

import {beforeEach, describe, it, expect, vi} from 'vitest';

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import ThunderIDNuxtClient from '../../src/runtime/server/ThunderIDNuxtClient';

// ── vi.hoisted ────────────────────────────────────────────────────────────────

const END_SESSION_URL = 'https://localhost:8090/oauth2/logout?id_token_hint=id-token';

const captured = vi.hoisted(() => ({
  signOut: vi.fn<(sessionId?: string) => Promise<string>>(),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('@thunderid/node', () => ({
  ThunderIDNodeClient: class {
    getStorageManager() {
      return {getConfigData: () => Promise.resolve({afterSignOutUrl: 'http://localhost:3000'})};
    }

    signOut(sessionId?: string): Promise<string> {
      return captured.signOut(sessionId);
    }
  },
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ThunderIDNuxtClient.signOut', () => {
  beforeEach(() => {
    captured.signOut.mockReset();
    captured.signOut.mockResolvedValue(END_SESSION_URL);
  });

  it('returns the end-session URL, so the server session ends too', async () => {
    const url = await ThunderIDNuxtClient.getInstance().signOut('session-1');

    expect(captured.signOut).toHaveBeenCalledWith('session-1');
    expect(url).toBe(END_SESSION_URL);
  });

  it('returns afterSignOutUrl without asking the server when no session exists', async () => {
    const url = await ThunderIDNuxtClient.getInstance().signOut();

    expect(captured.signOut).not.toHaveBeenCalled();
    expect(url).toBe('http://localhost:3000');
  });

  it('returns afterSignOutUrl when the end-session URL cannot be built', async () => {
    captured.signOut.mockRejectedValue(new Error('Sign-out endpoint not found.'));

    const url = await ThunderIDNuxtClient.getInstance().signOut('session-1');

    expect(url).toBe('http://localhost:3000');
  });
});
