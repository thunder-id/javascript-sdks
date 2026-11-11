// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ComputedRef, MaybeRefOrGetter, ShallowRef, computed, shallowRef, toValue, watch} from 'vue';

// Longest delay setTimeout holds. A longer one fires at once, so such an expiry is left to the
// visibility check.
const MAX_TIMEOUT_MS = 2147483647;

/** A flow step response, as far as its expiry goes. */
export interface FlowExpiryStep {
  /** How many seconds the flow execution stays valid, from when the response arrived. */
  expiresIn?: number;
}

export interface FlowExpiry {
  /** Marks the flow execution as expired, e.g. when the server refused it as expired. */
  expireFlow: () => void;
  /** The current expiry, the same object for as long as the flow stays expired, or null while it is active. */
  expiry: ComputedRef<object | null>;
  /** Whether the flow execution has expired. */
  isFlowExpired: ComputedRef<boolean>;
  /** Clears the expiry, e.g. when the flow starts again. */
  resetFlowExpiry: () => void;
}

/**
 * Expiry of a flow execution, from the `expiresIn` of its latest step response or a refusal the caller
 * reports with `expireFlow()`. `expiresIn` is counted from when the response arrived, on this device's own
 * clock, so a device clock that differs from the server's does not move the expiry. The expiry is raised
 * when that time passes, and re-checked when the page becomes visible again, since a timer can fire late in
 * a background tab or after the device sleeps. It is keyed to `step`, so a new step response clears it.
 *
 * @param step - The latest step response, a new object for each response. Null or undefined before one.
 */
const useFlowExpiry = (step: MaybeRefOrGetter<FlowExpiryStep | null | undefined>): FlowExpiry => {
  const expiredFor: ShallowRef<{step?: FlowExpiryStep | null} | null> = shallowRef(null);
  const isFlowExpired: ComputedRef<boolean> = computed(
    () => expiredFor.value !== null && expiredFor.value.step === toValue(step),
  );

  // Keeps the expiry object once raised for this step, so what is keyed to it carries on.
  const expireFlow = (): void => {
    if (!isFlowExpired.value) {
      expiredFor.value = {step: toValue(step)};
    }
  };
  const resetFlowExpiry = (): void => {
    expiredFor.value = null;
  };

  watch(
    () => toValue(step),
    (
      current: FlowExpiryStep | null | undefined,
      _previous: FlowExpiryStep | null | undefined,
      onCleanup: (cleanup: () => void) => void,
    ): void => {
      const expiresIn: number | undefined = current?.expiresIn;
      if (expiresIn === undefined) {
        return;
      }

      // Measured from now, when the response is in hand, on this device's clock.
      const delay: number = Math.max(expiresIn * 1000, 0);
      const deadline: number = Date.now() + delay;
      const checkExpiry = (): void => {
        if (Date.now() >= deadline) {
          expireFlow();
        }
      };
      const onVisibilityChange = (): void => {
        if (document.visibilityState === 'visible') {
          checkExpiry();
        }
      };

      const timerId: ReturnType<typeof setTimeout> | undefined =
        delay <= MAX_TIMEOUT_MS ? setTimeout(checkExpiry, delay) : undefined;
      document.addEventListener('visibilitychange', onVisibilityChange);

      onCleanup(() => {
        clearTimeout(timerId);
        document.removeEventListener('visibilitychange', onVisibilityChange);
      });
    },
    {immediate: true},
  );

  return {
    expireFlow,
    expiry: computed(() => (isFlowExpired.value ? expiredFor.value : null)),
    isFlowExpired,
    resetFlowExpiry,
  };
};

export default useFlowExpiry;
