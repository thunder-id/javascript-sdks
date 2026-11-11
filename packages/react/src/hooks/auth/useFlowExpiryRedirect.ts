// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {useEffect, useState} from 'react';
import useWhenUserPresent from './useWhenUserPresent';

/** How long an expired flow counts down before it sends the user back to the application. */
export const FLOW_EXPIRY_REDIRECT_SECONDS = 10;

/** How long the page waits after the redirect before it treats the redirect as not having happened. */
const REDIRECT_FALLBACK_MS = 3000;

/**
 * The countdown that sends the user of an expired flow back to the application.
 */
export interface FlowExpiryRedirect {
  /** Length of the countdown, in seconds. */
  countdownSeconds: number;
  /** Whether the countdown is running. It starts only while the user is on the page. */
  isCountingDown: boolean;
  /**
   * Whether the redirect was due but the page is still open, e.g. the browser refused it. The user then needs
   * the link back.
   */
  isRedirectFailed: boolean;
  /** Seconds left before the redirect. */
  secondsLeft: number;
  /** Where the user is sent back to. */
  url: string;
}

/**
 * Counts down and sends the user back to `url` once a flow expires. The countdown starts only while the user
 * is on the page, so a user who comes back to the tab still sees why they are being sent back. The state is
 * keyed to `expiry`, so a new expiry starts over without an effect.
 *
 * @param expiry - The expiry being handled, from `useFlowExpiry`, or null while the flow is active.
 * @param url - Where to send the user back to. Without it there is no redirect.
 * @returns The countdown, or null when there is nothing to count down.
 */
const useFlowExpiryRedirect = (expiry: object | null, url?: string): FlowExpiryRedirect | null => {
  const isActive: boolean = expiry !== null && url !== undefined && url !== '';
  const [started, setStarted] = useState<{at: number; expiry: object} | null>(null);
  const [failedFor, setFailedFor] = useState<object | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  const isStarted: boolean = isActive && started !== null && started.expiry === expiry;
  const isRedirectFailed: boolean = isActive && failedFor !== null && failedFor === expiry;

  useWhenUserPresent(isActive, () => {
    if (expiry !== null) {
      setStarted({at: Date.now(), expiry});
    }
  });

  useEffect(() => {
    if (!isStarted || started === null || !url) {
      return undefined;
    }

    const {expiry: startedFor} = started;
    const intervalId: ReturnType<typeof setInterval> = setInterval(() => setNow(Date.now()), 1000);
    let fallbackId: ReturnType<typeof setTimeout> | undefined;
    const redirectId: ReturnType<typeof setTimeout> = setTimeout(
      () => {
        // The countdown is over, so it stops ticking.
        clearInterval(intervalId);
        setNow(Date.now());
        // The page settles on the link back when the browser refuses the URL, or has not left the page.
        try {
          window.location.replace(url);
        } catch {
          setFailedFor(startedFor);
          return;
        }
        fallbackId = setTimeout(() => setFailedFor(startedFor), REDIRECT_FALLBACK_MS);
      },
      Math.max(started.at + FLOW_EXPIRY_REDIRECT_SECONDS * 1000 - Date.now(), 0),
    );

    return () => {
      clearInterval(intervalId);
      clearTimeout(redirectId);
      clearTimeout(fallbackId);
    };
  }, [isStarted, started, url]);

  if (!isActive || !url) {
    return null;
  }

  const remainingMs: number = isStarted && started ? started.at + FLOW_EXPIRY_REDIRECT_SECONDS * 1000 - now : Infinity;

  return {
    countdownSeconds: FLOW_EXPIRY_REDIRECT_SECONDS,
    isCountingDown: isStarted && !isRedirectFailed,
    isRedirectFailed,
    secondsLeft: Math.min(Math.max(Math.ceil(remainingMs / 1000), 0), FLOW_EXPIRY_REDIRECT_SECONDS),
    url,
  };
};

export default useFlowExpiryRedirect;
