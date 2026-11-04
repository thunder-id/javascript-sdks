// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import * as browser from '../index';

describe('browser exports', () => {
  it('exposes the user side of device authorization under its canonical name', () => {
    expect(browser.verifyDeviceCode).toBe(browser.executeEmbeddedDeviceGrantFlow);
  });

  it('never exposes the server-only operations, which need a secret a browser cannot hold', () => {
    ['evaluateAccess', 'evaluateAccesses', 'searchActions', 'introspectToken'].forEach((name: string) => {
      expect(name in browser).toBe(false);
    });
  });
});
