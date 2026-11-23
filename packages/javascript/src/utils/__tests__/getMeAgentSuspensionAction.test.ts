// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import getMeAgentSuspensionAction from '../getMeAgentSuspensionAction';

describe('getMeAgentSuspensionAction', () => {
  it('offers the unsuspend while the owner holds the agent suspended', () => {
    expect(getMeAgentSuspensionAction({details: {appliedBy: ['owner']}, value: 'SUSPENDED'})).toBe('unsuspend');
    expect(getMeAgentSuspensionAction({details: {appliedBy: ['organization', 'owner']}, value: 'SUSPENDED'})).toBe(
      'unsuspend',
    );
  });

  it("offers the owner's own suspension when only others hold one", () => {
    expect(getMeAgentSuspensionAction({details: {appliedBy: ['organization']}, value: 'SUSPENDED'})).toBe('suspend');
    expect(getMeAgentSuspensionAction({details: {appliedBy: ['cascade']}, value: 'SUSPENDED'})).toBe('suspend');
    expect(getMeAgentSuspensionAction({value: 'SUSPENDED'})).toBe('suspend');
  });

  it('offers the suspension for an agent that is not suspended', () => {
    expect(getMeAgentSuspensionAction({value: 'ACTIVE'})).toBe('suspend');
    expect(getMeAgentSuspensionAction({value: 'LOCKED'})).toBe('suspend');
    expect(getMeAgentSuspensionAction(undefined)).toBe('suspend');
  });
});
