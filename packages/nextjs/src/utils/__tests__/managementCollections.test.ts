// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import {pickManagementEndpoints} from '../managementCollections';

describe('pickManagementEndpoints', () => {
  it('keeps only the management collection overrides', () => {
    expect(
      pickManagementEndpoints({
        authorization: 'https://id.example.com/oauth2/authorize',
        groups: 'https://mgmt.example.com/groups',
        users: 'https://mgmt.example.com/users',
      } as never),
    ).toEqual({groups: 'https://mgmt.example.com/groups', users: 'https://mgmt.example.com/users'});
  });

  it('returns undefined when there is nothing to pass on', () => {
    expect(pickManagementEndpoints(undefined)).toBeUndefined();
    expect(pickManagementEndpoints({authorization: 'https://id.example.com/authorize'} as never)).toBeUndefined();
  });
});
