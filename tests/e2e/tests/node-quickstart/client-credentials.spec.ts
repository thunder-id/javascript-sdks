// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * quickstarts/quickstart-node — a service-to-service CLI, not a browser app: it authenticates via the OAuth2
 * `client_credentials` grant (quickstarts/quickstart-node/lib/AuthService.mjs in thunder-id/samples) and prints the result.
 * No page to drive, so this spawns the CLI directly and asserts it exits 0 having actually
 * obtained a token, rather than being skipped from E2E coverage entirely.
 */

import {ChildProcess, spawn} from 'node:child_process';
import path from 'node:path';
import {test, expect} from '@playwright/test';
import {Timeouts} from '../../constants/timeouts';

const APP_DIR = path.resolve(import.meta.dirname, '../../.samples/quickstarts/quickstart-node');

test.describe('quickstarts/quickstart-node - client_credentials', () => {
  test('TC001: obtains an access token and exits cleanly', async () => {
    let child: ChildProcess | undefined;

    try {
      const result = await new Promise<{code: number | null; stderr: string; stdout: string}>((resolve, reject) => {
        // `timeout` bounds a hung token request (e.g. a network stall) instead of leaving the
        // child running indefinitely in the background — Playwright's own test timeout aborts
        // this promise's consumer, but never kills a spawned child process on its own.
        child = spawn('node', ['index.mjs'], {cwd: APP_DIR, env: process.env, timeout: Timeouts.DEFAULT_ACTION});
        let stdout = '';
        let stderr = '';
        child.stdout!.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
        child.stderr!.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
        child.on('error', reject);
        child.on('close', (code) => resolve({code, stderr, stdout}));
      });

      expect(result.code, `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`).toBe(0);
      // lib/ui.mjs's printAuthenticated() prints this banner once client_credentials succeeds.
      expect(result.stdout).toContain('AUTHENTICATED');
    } finally {
      // No-op if the process already exited — kill() on a dead process just returns false.
      child?.kill();
    }
  });
});
