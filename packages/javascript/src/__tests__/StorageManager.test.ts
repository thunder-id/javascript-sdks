// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {afterEach, describe, expect, it, vi} from 'vitest';
import type {Storage} from '../models/store';
import StorageManager from '../StorageManager';

class MemoryStore implements Storage {
  private store = new Map<string, string>();

  async getData(key: string): Promise<string> {
    return this.store.get(key) ?? null!;
  }

  async setData(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeData(key: string): Promise<void> {
    this.store.delete(key);
  }
}

describe('StorageManager', () => {
  const original: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

  afterEach(() => {
    if (original) {
      Object.defineProperty(globalThis, 'localStorage', original);
    } else {
      delete (globalThis as {localStorage?: unknown}).localStorage;
    }
  });

  it('keeps hybrid data in the given store without touching localStorage outside a browser window', async () => {
    const read = vi.fn((): undefined => undefined);
    Object.defineProperty(globalThis, 'localStorage', {configurable: true, get: read});
    const manager: StorageManager<unknown> = new StorageManager<unknown>('instance_0', new MemoryStore());

    await manager.setHybridDataParameter('pkce_code_verifier#0', 'verifier', 'session-1');

    expect(await manager.getHybridDataParameter('pkce_code_verifier#0', 'session-1')).toBe('verifier');
    expect(read).not.toHaveBeenCalled();
  });

  describe('flow authId', () => {
    const originalWindow: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(globalThis, 'window');

    const useSharedLocalStorage = (): void => {
      const data = new Map<string, string>();
      Object.defineProperty(globalThis, 'window', {configurable: true, value: globalThis});
      Object.defineProperty(globalThis, 'localStorage', {
        configurable: true,
        value: {
          getItem: (key: string): string | null => data.get(key) ?? null,
          removeItem: (key: string): boolean => data.delete(key),
          setItem: (key: string, value: string): Map<string, string> => data.set(key, value),
        },
      });
    };

    afterEach(() => {
      if (originalWindow) {
        Object.defineProperty(globalThis, 'window', originalWindow);
      } else {
        delete (globalThis as {window?: unknown}).window;
      }
    });

    it('keeps the authId of a tab when another tab sharing localStorage starts a sign-in', async () => {
      useSharedLocalStorage();
      const firstTab: StorageManager<unknown> = new StorageManager<unknown>('instance_0', new MemoryStore());
      const secondTab: StorageManager<unknown> = new StorageManager<unknown>('instance_0', new MemoryStore());

      await firstTab.setFlowAuthId('execution-a', 'auth-a');
      await secondTab.setFlowAuthId('execution-b', 'auth-b');

      expect(await firstTab.getFlowAuthId('execution-a')).toBe('auth-a');
      expect(await secondTab.getFlowAuthId('execution-b')).toBe('auth-b');
    });

    it('finds the authId of an execution from another tab, as a magic link opened in a new tab does', async () => {
      useSharedLocalStorage();
      const signInTab: StorageManager<unknown> = new StorageManager<unknown>('instance_0', new MemoryStore());
      const magicLinkTab: StorageManager<unknown> = new StorageManager<unknown>('instance_0', new MemoryStore());

      await signInTab.setFlowAuthId('execution-a', 'auth-a');

      expect(await magicLinkTab.getFlowAuthId('execution-a')).toBe('auth-a');
    });

    it('removes only the authId of the given execution', async () => {
      useSharedLocalStorage();
      const manager: StorageManager<unknown> = new StorageManager<unknown>('instance_0', new MemoryStore());

      await manager.setFlowAuthId('execution-a', 'auth-a');
      await manager.setFlowAuthId('execution-b', 'auth-b');
      await manager.removeFlowAuthId('execution-a');

      expect(await manager.getFlowAuthId('execution-a')).toBeUndefined();
      expect(await manager.getFlowAuthId('execution-b')).toBe('auth-b');
    });

    it('keeps the authId per execution in the given store outside a browser window', async () => {
      const manager: StorageManager<unknown> = new StorageManager<unknown>('instance_0', new MemoryStore());

      await manager.setFlowAuthId('execution-a', 'auth-a');
      await manager.setFlowAuthId('execution-b', 'auth-b');

      expect(await manager.getFlowAuthId('execution-a')).toBe('auth-a');
      expect(await manager.getFlowAuthId('execution-b')).toBe('auth-b');
    });
  });
});
