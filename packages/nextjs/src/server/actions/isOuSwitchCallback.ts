// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use server';

import {ThunderIDNextConfig} from '../../models/config';
import getClient from '../getClient';
import getSessionId from './getSessionId';

/**
 * Reports whether a callback that arrives while signed in completes a switch to another organization
 * unit that this session started: its `state` belongs to an authorization request bounded to a unit.
 * The record is removed when the code is redeemed, so a replayed, stale or injected callback finds none.
 *
 * @param state - The `state` the callback carries
 * @returns True when the callback completes a pending organization unit switch
 */
const isOuSwitchCallback = async (state: string): Promise<boolean> => {
  try {
    const sessionId: string | undefined = await getSessionId();

    if (!state || !sessionId) {
      return false;
    }

    const client = getClient();

    if (!client.isInitialized) {
      await client.initialize({} as ThunderIDNextConfig);
    }

    return await client.isOuSwitchCallback(state, sessionId);
  } catch {
    return false;
  }
};

export default isOuSwitchCallback;
