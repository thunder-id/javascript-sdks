// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import getAccountLifecycleActions from '../getAccountLifecycleActions';

const allUserFlows: Record<string, string> = {
  userSuspendFlow: 'f-suspend',
  userUnlockFlow: 'f-unlock',
  userUnsuspendFlow: 'f-unsuspend',
};

describe('getAccountLifecycleActions', () => {
  it('offers the actions each status allows, most expected first', () => {
    expect(getAccountLifecycleActions('user', 'ACTIVE', allUserFlows)).toEqual(['suspend']);
    expect(getAccountLifecycleActions('user', 'LOCKED', allUserFlows)).toEqual(['unlock', 'suspend']);
    expect(getAccountLifecycleActions('user', 'SUSPENDED', allUserFlows)).toEqual(['unsuspend']);
  });

  it('reads an identity with no status as active', () => {
    expect(getAccountLifecycleActions('user', undefined, allUserFlows)).toEqual(['suspend']);
  });

  it('offers only the actions whose flow is configured', () => {
    expect(getAccountLifecycleActions('user', 'LOCKED', {userSuspendFlow: 'f-suspend'})).toEqual(['suspend']);
    expect(getAccountLifecycleActions('user', 'ACTIVE', {})).toEqual([]);
  });

  it('reads the flows of the identity kind it is given', () => {
    expect(getAccountLifecycleActions('agent', 'ACTIVE', allUserFlows)).toEqual([]);
    expect(getAccountLifecycleActions('agent', 'LOCKED', {agentSuspendFlow: 'a', agentUnlockFlow: 'b'})).toEqual([
      'unlock',
      'suspend',
    ]);
  });

  it('never offers an unlock for an application', () => {
    expect(
      getAccountLifecycleActions('application', 'LOCKED', {
        applicationSuspendFlow: 'a',
        applicationUnsuspendFlow: 'b',
      }),
    ).toEqual(['suspend']);
  });

  it('offers nothing for a status it does not know', () => {
    expect(getAccountLifecycleActions('user', 'ARCHIVED' as never, allUserFlows)).toEqual([]);
  });

  describe('a suspension other parties hold', () => {
    const agentFlows: Record<string, string> = {agentSuspendFlow: 'a', agentUnsuspendFlow: 'b'};

    it('offers the unsuspend while the organization holds a suspension', () => {
      expect(getAccountLifecycleActions('agent', 'SUSPENDED', agentFlows, ['organization', 'owner'])).toEqual([
        'unsuspend',
      ]);
    });

    it("offers the organization's own suspension when only the owner or the cascade holds one", () => {
      expect(getAccountLifecycleActions('agent', 'SUSPENDED', agentFlows, ['owner'])).toEqual(['suspend']);
      expect(getAccountLifecycleActions('agent', 'SUSPENDED', agentFlows, ['owner', 'cascade'])).toEqual(['suspend']);
    });

    it("reads a suspension that names no party as the organization's", () => {
      expect(getAccountLifecycleActions('agent', 'SUSPENDED', agentFlows, [])).toEqual(['unsuspend']);
      expect(getAccountLifecycleActions('agent', 'SUSPENDED', agentFlows)).toEqual(['unsuspend']);
    });

    it('ignores the parties for a status that is not a suspension', () => {
      expect(getAccountLifecycleActions('agent', 'ACTIVE', agentFlows, ['owner'])).toEqual(['suspend']);
    });
  });
});
