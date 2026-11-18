// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {FlowMetadataResponse, FlowMetaType, FlowReturnTarget, resolveFlowReturnUrl} from '@thunderid/browser';
import {ComputedRef, MaybeRefOrGetter, Ref, computed, ref, shallowRef, toValue, watch} from 'vue';
import useFlowExpiry, {FlowExpiryStep} from './useFlowExpiry';
import useFlowExpiryRedirect, {FlowExpiryRedirect} from './useFlowExpiryRedirect';
import useWhenUserPresent from './useWhenUserPresent';

/**
 * How to find where to send the user back to when the flow can't be started again in place.
 */
export interface FlowReturnUrlLookup {
  /** Whether the lookup may run yet, e.g. once the SDK has initialized. */
  enabled: MaybeRefOrGetter<boolean>;
  /** Fetches flow metadata for a query. */
  fetchMeta: (query: {id?: string; type?: FlowMetaType}) => Promise<FlowMetadataResponse | null>;
  /** Flow metadata already loaded for the page, if any. */
  meta: MaybeRefOrGetter<FlowMetadataResponse | null>;
  /** The `ref` query parameter the page URL carried when it loaded. */
  ref: string | null;
}

export interface FlowExpiryHandlingOptions {
  /**
   * Where to send the user once the flow expires. With it, the flow counts down there instead of restarting.
   * Without it, a flow that can't be started again in place goes back to the URL `returnUrlLookup` finds.
   */
  afterFlowExpiredUrl?: MaybeRefOrGetter<string | undefined>;
  /** Whether the component can start its flow again, e.g. it knows the application to start it for. */
  canRestart: MaybeRefOrGetter<boolean>;
  /** Starts the flow again: clears it and starts a new execution. */
  restart: () => void;
  /** Finds where to send the user back to when the flow can't be started again in place. */
  returnUrlLookup?: FlowReturnUrlLookup;
  /** The latest step response, a new object for each response. */
  step?: MaybeRefOrGetter<FlowExpiryStep | null | undefined>;
}

export interface FlowExpiryHandling {
  /** Clears the restart notice, once the user acts on the new flow. */
  clearFlowRestarted: () => void;
  /** Marks the flow execution as expired, e.g. when the server refused it as expired. */
  expireFlow: () => void;
  /** The countdown back to `afterFlowExpiredUrl`, or null when there is none. */
  flowExpiryRedirect: ComputedRef<FlowExpiryRedirect | null>;
  /** Whether the flow execution has expired. */
  isFlowExpired: ComputedRef<boolean>;
  /** Whether the flow was started again because the previous one expired. */
  isFlowRestarted: Ref<boolean>;
  /** Starts an expired flow again now, e.g. from a button. */
  restartFlow: () => void;
  /** Whether an expired flow is started again in place, rather than sent back to the application. */
  restartsInPlace: ComputedRef<boolean>;
  /** Where `returnUrlLookup` found to send the user back to. Undefined until it has looked. */
  returnTarget: Ref<FlowReturnTarget | undefined>;
}

/**
 * What a flow component does once its execution expires. With `afterFlowExpiredUrl`, it counts down and sends
 * the user back there. Otherwise, when it can, it starts the flow again in place once the user is on the page,
 * and says so. When it can do neither, the user is left to go back to the application.
 */
const useFlowExpiryHandling = ({
  afterFlowExpiredUrl = undefined,
  canRestart,
  restart,
  returnUrlLookup = undefined,
  step = undefined,
}: FlowExpiryHandlingOptions): FlowExpiryHandling => {
  const {expireFlow, expiry, isFlowExpired, resetFlowExpiry} = useFlowExpiry(step);
  const returnTarget: Ref<FlowReturnTarget | undefined> = shallowRef(undefined);
  const flowExpiryRedirect: ComputedRef<FlowExpiryRedirect | null> = useFlowExpiryRedirect(
    expiry,
    () => toValue(afterFlowExpiredUrl) ?? (toValue(canRestart) ? undefined : returnTarget.value?.url),
  );
  const isFlowRestarted: Ref<boolean> = ref(false);
  const restartsInPlace: ComputedRef<boolean> = computed(() => !toValue(afterFlowExpiredUrl) && toValue(canRestart));

  const restartFlow = (): void => {
    resetFlowExpiry();
    isFlowRestarted.value = true;
    restart();
  };
  const clearFlowRestarted = (): void => {
    isFlowRestarted.value = false;
  };

  useWhenUserPresent(() => isFlowExpired.value && restartsInPlace.value, restartFlow);

  // A flow that can't be started again here goes back to the application, so find out where that is, unless the
  // caller named the URL itself.
  if (returnUrlLookup) {
    watch(
      [
        (): boolean => toValue(returnUrlLookup.enabled) && !toValue(afterFlowExpiredUrl) && !toValue(canRestart),
        (): FlowMetadataResponse | null => toValue(returnUrlLookup.meta),
      ],
      (
        [shouldLookUp, meta]: [boolean, FlowMetadataResponse | null],
        _: unknown,
        onCleanup: (cleanup: () => void) => void,
      ) => {
        if (!shouldLookUp) {
          return;
        }
        // Without a page URL, as when rendering on the server, there is nowhere to go back to.
        if (typeof window === 'undefined') {
          returnTarget.value = {};
          return;
        }

        let active = true;
        onCleanup(() => {
          active = false;
        });
        void resolveFlowReturnUrl({
          currentUrl: window.location.href,
          fetchMeta: returnUrlLookup.fetchMeta,
          meta,
          ref: returnUrlLookup.ref,
        }).then((target: FlowReturnTarget) => {
          if (active) {
            returnTarget.value = target;
          }
        });
      },
      {immediate: true},
    );
  }

  return {
    clearFlowRestarted,
    expireFlow,
    flowExpiryRedirect,
    isFlowExpired,
    isFlowRestarted,
    restartFlow,
    restartsInPlace,
    returnTarget,
  };
};

export default useFlowExpiryHandling;
