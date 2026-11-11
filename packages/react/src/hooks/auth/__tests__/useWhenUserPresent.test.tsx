// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import useWhenUserPresent from '../useWhenUserPresent';

describe('useWhenUserPresent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('runs at once when the user is on the page', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    const action = vi.fn();
    renderHook(() => useWhenUserPresent(true, action));

    vi.advanceTimersByTime(0);

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('waits for the user to come back, then runs once', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    const action = vi.fn();
    renderHook(() => useWhenUserPresent(true, action));

    vi.advanceTimersByTime(0);
    expect(action).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('focus'));

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('does nothing while disabled', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    const action = vi.fn();
    renderHook(() => useWhenUserPresent(false, action));

    vi.advanceTimersByTime(0);
    window.dispatchEvent(new Event('focus'));

    expect(action).not.toHaveBeenCalled();
  });
});
