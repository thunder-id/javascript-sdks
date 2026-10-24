// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDBrowserClient} from '@thunderid/browser';
import {afterEach, describe, expect, it, vi} from 'vitest';
import ThunderIDVueClient from '../../ThunderIDVueClient';

describe('ThunderIDVueClient redirect sign-in', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('passes RFC 9396 authorization details to the authorize request options', async () => {
    const signIn = vi.spyOn(ThunderIDBrowserClient.prototype, 'signIn').mockResolvedValue(undefined);
    const authorizationDetails: Record<string, unknown>[] = [
      {instructedAmount: {amount: '35', currency: 'EUR'}, type: 'payment_initiation'},
    ];

    await new ThunderIDVueClient().signIn({authorization_details: authorizationDetails});

    expect(signIn).toHaveBeenCalledWith({authorization_details: authorizationDetails});
  });
});
