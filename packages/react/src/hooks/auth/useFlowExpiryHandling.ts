// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {FlowMetadataResponse, FlowMetaType, FlowReturnTarget, resolveFlowReturnUrl} from '@thunderid/browser';
import {useCallback, useEffect, useState} from 'react';
import useFlowExpiry, {FlowExpiryStep} from './useFlowExpiry';
import useFlowExpiryRedirect, {FlowExpiryRedirect} from './useFlowExpiryRedirect';
import useWhenUserPresent from './useWhenUserPresent';

/**
 * How to find where to send the user back to when the flow can't be started again in place.
 */
export interface FlowReturnUrlLookup {
  /** Whether the lookup may run yet, e.g. once the SDK has initialized. */
  enabled: boolean;
  /** Fetches flow metadata for a query. Keep it stable across renders. */
  fetchMeta: (query: {id?: string; type?: FlowMetaType}) => Promise<FlowMetadataResponse | null>;
  /** Flow metadata already loaded for the page, if any. */
  meta: FlowMetadataResponse | null;
  /** The `ref` query parameter the page URL carried when it loaded. */
  ref: string | null;
}

export interface FlowExpiryHandlingOptions {
  /**
   * Where to send the user once the flow expires. With it, the flow counts down there instead of restarting.
   * Without it, a flow that can't be started again in place goes back to the URL `returnUrlLookup` finds.
   */
  afterFlowExpiredUrl?: string;
  /** Whether the component can start its flow again, e.g. it knows the application to start it for. */
  canRestart: boolean;
  /** Starts the flow again: clears it and starts a new execution. */
  restart: () => void;
  /** Finds where to send the user back to when the flow can't be started again in place. */
  returnUrlLookup?: FlowReturnUrlLookup;
  /** The latest step response, a new object for each response. */
  step?: FlowExpiryStep | null;
}

export interface FlowExpiryHandling {
  /** Clears the restart notice, once the user acts on the new flow. */
  clearFlowRestarted: () => void;
  /** Marks the flow execution as expired, e.g. when the server refused it as expired. */
  expireFlow: () => void;
  /** The countdown back to `afterFlowExpiredUrl`, or null when there is none. */
  flowExpiryRedirect: FlowExpiryRedirect | null;
  /** Whether the flow execution has expired. */
  isFlowExpired: boolean;
  /** Whether the flow was started again because the previous one expired. */
  isFlowRestarted: boolean;
  /** Starts an expired flow again now, e.g. from a button. */
  restartFlow: () => void;
  /** Whether an expired flow is started again in place, rather than sent back to the application. */
  restartsInPlace: boolean;
  /** Where `returnUrlLookup` found to send the user back to. Undefined until it has looked. */
  returnTarget: FlowReturnTarget | undefined;
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
  const [returnTarget, setReturnTarget] = useState<FlowReturnTarget | undefined>(undefined);
  const flowExpiryRedirect: FlowExpiryRedirect | null = useFlowExpiryRedirect(
    expiry,
    afterFlowExpiredUrl ?? (canRestart ? undefined : returnTarget?.url),
  );
  const [isFlowRestarted, setIsFlowRestarted] = useState<boolean>(false);
  const restartsInPlace: boolean = !afterFlowExpiredUrl && canRestart;

  const restartFlow = (): void => {
    resetFlowExpiry();
    setIsFlowRestarted(true);
    restart();
  };
  const clearFlowRestarted: () => void = useCallback((): void => setIsFlowRestarted(false), []);

  useWhenUserPresent(isFlowExpired && restartsInPlace, restartFlow);

  // A flow that can't be started again here goes back to the application, so find out where that is, unless the
  // caller named the URL itself.
  const lookupEnabled: boolean = Boolean(returnUrlLookup?.enabled) && !afterFlowExpiredUrl && !canRestart;
  const {fetchMeta, meta = null, ref = null} = returnUrlLookup ?? {};
  useEffect(() => {
    if (!lookupEnabled || !fetchMeta) {
      return undefined;
    }

    let active = true;
    void resolveFlowReturnUrl({currentUrl: window.location.href, fetchMeta, meta, ref}).then(
      (target: FlowReturnTarget) => {
        if (active) {
          setReturnTarget(target);
        }
      },
    );

    return () => {
      active = false;
    };
  }, [lookupEnabled, fetchMeta, meta, ref]);

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
