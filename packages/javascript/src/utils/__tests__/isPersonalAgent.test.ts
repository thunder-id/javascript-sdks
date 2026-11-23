// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import isPersonalAgent from '../isPersonalAgent';

describe('isPersonalAgent', () => {
  it('should be true for an agent of the personal kind', () => {
    expect(isPersonalAgent({kind: 'personal-assistant'})).toBe(true);
  });

  it('should be false for an agent with no kind', () => {
    expect(isPersonalAgent({})).toBe(false);
  });
});
