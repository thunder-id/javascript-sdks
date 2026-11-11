// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ComputedRef, MaybeRefOrGetter, Ref, ShallowRef, computed, ref, shallowRef, toValue, watch} from 'vue';
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
 * keyed to `expiry`, so a new expiry starts over.
 *
 * @param expiry - The expiry being handled, from `useFlowExpiry`, or null while the flow is active.
 * @param url - Where to send the user back to. Without it there is no redirect.
 * @returns The countdown, or null when there is nothing to count down.
 */
const useFlowExpiryRedirect = (
  expiry: MaybeRefOrGetter<object | null>,
  url: MaybeRefOrGetter<string | undefined>,
): ComputedRef<FlowExpiryRedirect | null> => {
  const started: ShallowRef<{at: number; expiry: object} | null> = shallowRef(null);
  const failedFor: ShallowRef<object | null> = shallowRef(null);
  const now: Ref<number> = ref(Date.now());

  const isActive: ComputedRef<boolean> = computed(() => toValue(expiry) !== null && Boolean(toValue(url)));
  const isStarted: ComputedRef<boolean> = computed(
    () => isActive.value && started.value !== null && started.value.expiry === toValue(expiry),
  );
  const isRedirectFailed: ComputedRef<boolean> = computed(
    () => isActive.value && failedFor.value !== null && failedFor.value === toValue(expiry),
  );

  useWhenUserPresent(isActive, () => {
    const current: object | null = toValue(expiry);
    if (current !== null) {
      started.value = {at: Date.now(), expiry: current};
    }
  });

  watch(
    [isStarted, started, () => toValue(url)],
    (_values: unknown, _previous: unknown, onCleanup: (cleanup: () => void) => void): void => {
      const target: string | undefined = toValue(url);
      if (!isStarted.value || started.value === null || !target) {
        return;
      }

      const {at, expiry: startedFor} = started.value;
      const intervalId: ReturnType<typeof setInterval> = setInterval(() => {
        now.value = Date.now();
      }, 1000);
      let fallbackId: ReturnType<typeof setTimeout> | undefined;
      const redirectId: ReturnType<typeof setTimeout> = setTimeout(
        () => {
          // The countdown is over, so it stops ticking.
          clearInterval(intervalId);
          now.value = Date.now();
          // The page settles on the link back when the browser refuses the URL, or has not left the page.
          try {
            window.location.replace(target);
          } catch {
            failedFor.value = startedFor;
            return;
          }
          fallbackId = setTimeout(() => {
            failedFor.value = startedFor;
          }, REDIRECT_FALLBACK_MS);
        },
        Math.max(at + FLOW_EXPIRY_REDIRECT_SECONDS * 1000 - Date.now(), 0),
      );

      onCleanup(() => {
        clearInterval(intervalId);
        clearTimeout(redirectId);
        clearTimeout(fallbackId);
      });
    },
    {immediate: true},
  );

  return computed((): FlowExpiryRedirect | null => {
    const target: string | undefined = toValue(url);
    if (!isActive.value || !target) {
      return null;
    }

    const remainingMs: number =
      isStarted.value && started.value ? started.value.at + FLOW_EXPIRY_REDIRECT_SECONDS * 1000 - now.value : Infinity;

    return {
      countdownSeconds: FLOW_EXPIRY_REDIRECT_SECONDS,
      isCountingDown: isStarted.value && !isRedirectFailed.value,
      isRedirectFailed: isRedirectFailed.value,
      secondsLeft: Math.min(Math.max(Math.ceil(remainingMs / 1000), 0), FLOW_EXPIRY_REDIRECT_SECONDS),
      url: target,
    };
  });
};

export default useFlowExpiryRedirect;
