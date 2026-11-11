// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import useFlowExpiry, {FlowExpiryStep} from '../useFlowExpiry';

const setVisibility = (state: DocumentVisibilityState): void => {
  Object.defineProperty(document, 'visibilityState', {configurable: true, value: state});
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('useFlowExpiry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is not expired without an expiry', () => {
    const {result} = renderHook(() => useFlowExpiry({}));

    expect(result.current.isFlowExpired).toBe(false);
    expect(result.current.expiry).toBeNull();
  });

  it('expires once expiresIn passes, counted from the response', () => {
    const step: FlowExpiryStep = {expiresIn: 5};
    const {result} = renderHook(() => useFlowExpiry(step));

    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(result.current.isFlowExpired).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.isFlowExpired).toBe(true);
  });

  it('is expired at once when nothing is left', () => {
    const step: FlowExpiryStep = {expiresIn: 0};
    const {result} = renderHook(() => useFlowExpiry(step));

    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(result.current.isFlowExpired).toBe(true);
  });

  it('expires when the page becomes visible after the deadline', () => {
    const step: FlowExpiryStep = {expiresIn: 5};
    const {result} = renderHook(() => useFlowExpiry(step));

    // The clock moves past the deadline without the timer firing, as after the device sleeps.
    vi.setSystemTime(Date.now() + 6000);
    act(() => {
      setVisibility('visible');
    });

    expect(result.current.isFlowExpired).toBe(true);
  });

  it('checks a deadline too long for a timer when the page becomes visible', () => {
    const step: FlowExpiryStep = {expiresIn: 30 * 24 * 60 * 60};
    const {result} = renderHook(() => useFlowExpiry(step));

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.isFlowExpired).toBe(false);

    vi.setSystemTime(Date.now() + 31 * 24 * 60 * 60 * 1000);
    act(() => {
      setVisibility('visible');
    });
    expect(result.current.isFlowExpired).toBe(true);
  });

  it('keeps the same expiry while the flow stays expired', () => {
    const step: FlowExpiryStep = {expiresIn: 5};
    const {result} = renderHook(() => useFlowExpiry(step));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    const {expiry} = result.current;

    vi.setSystemTime(Date.now() + 1000);
    act(() => {
      setVisibility('visible');
      result.current.expireFlow();
    });

    expect(result.current.expiry).toBe(expiry);
  });

  it('expires when the caller reports it, and clears when reset', () => {
    const step: FlowExpiryStep = {expiresIn: 60};
    const {result} = renderHook(() => useFlowExpiry(step));

    act(() => {
      result.current.expireFlow();
    });
    expect(result.current.isFlowExpired).toBe(true);

    act(() => {
      result.current.resetFlowExpiry();
    });
    expect(result.current.isFlowExpired).toBe(false);
  });

  it('clears the expiry for a new step', () => {
    const {result, rerender} = renderHook(({step}: {step: FlowExpiryStep}) => useFlowExpiry(step), {
      initialProps: {step: {expiresIn: 0}},
    });
    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(result.current.isFlowExpired).toBe(true);

    rerender({step: {expiresIn: 60}});

    expect(result.current.isFlowExpired).toBe(false);
  });
});
