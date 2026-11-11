// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import useFlowExpiryRedirect from '../useFlowExpiryRedirect';

// A fragment of this page, so the redirect never navigates the test page away and the page stays open.
const appUrl = (): string => `${window.location.origin}${window.location.pathname}#app`;

describe('useFlowExpiryRedirect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.replaceState({}, '', window.location.pathname);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.history.replaceState({}, '', window.location.pathname);
  });

  it('has nothing to count down while the flow is active or without a URL', () => {
    expect(renderHook(() => useFlowExpiryRedirect(null, appUrl())).result.current).toBeNull();
    expect(renderHook(() => useFlowExpiryRedirect({}, undefined)).result.current).toBeNull();
  });

  it('waits for the user before counting down', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    const expiry: object = {};
    const {result} = renderHook(() => useFlowExpiryRedirect(expiry, appUrl()));

    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(result.current).toMatchObject({isCountingDown: false, secondsLeft: 10, url: appUrl()});
    expect(window.location.hash).toBe('');
  });

  it('counts down, redirects, and offers the link back when the page is still open', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    const expiry: object = {};
    const {result} = renderHook(() => useFlowExpiryRedirect(expiry, appUrl()));

    // Starts the countdown, then lets it run.
    act(() => {
      vi.advanceTimersByTime(0);
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current).toMatchObject({isCountingDown: true, isRedirectFailed: false, secondsLeft: 7});

    act(() => {
      vi.advanceTimersByTime(7000);
    });
    expect(window.location.hash).toBe('#app');
    expect(result.current?.isRedirectFailed).toBe(false);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current).toMatchObject({isCountingDown: false, isRedirectFailed: true});
  });

  it('offers the link back at once when the browser refuses the URL, and stops ticking', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    const expiry: object = {};
    // Not a valid URL, so the browser refuses to navigate to it.
    const {result} = renderHook(() => useFlowExpiryRedirect(expiry, 'http://['));

    act(() => {
      vi.advanceTimersByTime(0);
    });
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(result.current).toMatchObject({isCountingDown: false, isRedirectFailed: true, secondsLeft: 0});
    expect(vi.getTimerCount()).toBe(0);
  });

  it('starts over for a new expiry', () => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(true);
    const {result, rerender} = renderHook(({expiry}: {expiry: object}) => useFlowExpiryRedirect(expiry, appUrl()), {
      initialProps: {expiry: {}},
    });
    act(() => {
      vi.advanceTimersByTime(0);
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current?.secondsLeft).toBe(7);

    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    rerender({expiry: {}});

    expect(result.current).toMatchObject({isCountingDown: false, secondsLeft: 10});
  });
});
