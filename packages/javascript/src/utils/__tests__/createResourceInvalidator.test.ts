// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it, vi, type Mock} from 'vitest';
import createResourceInvalidator, {ResourceInvalidator} from '../createResourceInvalidator';

describe('createResourceInvalidator', () => {
  it('notifies subscribers whose key starts with the invalidated prefix', () => {
    const invalidator: ResourceInvalidator = createResourceInvalidator();
    const list: Mock = vi.fn();
    const detail: Mock = vi.fn();
    const otherDetail: Mock = vi.fn();

    invalidator.subscribe(['applications', {limit: 10}], list);
    invalidator.subscribe(['application', 'app-1'], detail);
    invalidator.subscribe(['application', 'app-2'], otherDetail);

    invalidator.invalidate(['applications']);
    invalidator.invalidate(['application', 'app-1']);

    expect(list).toHaveBeenCalledOnce();
    expect(detail).toHaveBeenCalledOnce();
    expect(otherDetail).not.toHaveBeenCalled();
  });

  it('stops notifying after unsubscribe', () => {
    const invalidator: ResourceInvalidator = createResourceInvalidator();
    const listener: Mock = vi.fn();

    const unsubscribe: () => void = invalidator.subscribe(['users'], listener);
    unsubscribe();
    invalidator.invalidate(['users']);

    expect(listener).not.toHaveBeenCalled();
  });
});
