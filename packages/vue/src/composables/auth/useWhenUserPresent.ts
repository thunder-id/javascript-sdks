// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {MaybeRefOrGetter, toValue, watch} from 'vue';

/** Whether the user is looking at the page now, i.e. it is visible and has focus. */
const isUserPresent = (): boolean => document.visibilityState === 'visible' && document.hasFocus();

/**
 * Runs `action` once while `enabled`, as soon as the user is on the page: at once when they already are, or
 * when they come back to the tab or the window. Lets an expired flow wait for the user before it acts, so a
 * user who left the tab still sees what happened.
 *
 * @param enabled - Whether to run the action. A change to `true` arms it again.
 * @param action - What to run. The latest one runs.
 */
const useWhenUserPresent = (enabled: MaybeRefOrGetter<boolean>, action: () => void): void => {
  watch(
    () => toValue(enabled),
    (isEnabled: boolean, _previous: boolean | undefined, onCleanup: (cleanup: () => void) => void): void => {
      if (!isEnabled) {
        return;
      }

      let done = false;
      const run = (): void => {
        if (!done) {
          done = true;
          action();
        }
      };
      const runOnReturn = (): void => {
        if (document.visibilityState === 'visible') {
          run();
        }
      };

      // Deferred, so the action never changes state while this watcher runs.
      const timerId: ReturnType<typeof setTimeout> = setTimeout(() => {
        if (isUserPresent()) {
          run();
        }
      }, 0);
      document.addEventListener('visibilitychange', runOnReturn);
      window.addEventListener('focus', runOnReturn);

      onCleanup(() => {
        clearTimeout(timerId);
        document.removeEventListener('visibilitychange', runOnReturn);
        window.removeEventListener('focus', runOnReturn);
      });
    },
    {immediate: true},
  );
};

export default useWhenUserPresent;
