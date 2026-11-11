// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {useCallback, useState} from 'react';
import useFlowExpiry, {FlowExpiryStep} from './useFlowExpiry';
import useFlowExpiryRedirect, {FlowExpiryRedirect} from './useFlowExpiryRedirect';
import useWhenUserPresent from './useWhenUserPresent';

export interface FlowExpiryHandlingOptions {
  /** Where to send the user once the flow expires. With it, the flow counts down there instead of restarting. */
  afterFlowExpiredUrl?: string;
  /** Whether the component can start its flow again, e.g. it knows the application to start it for. */
  canRestart: boolean;
  /** Starts the flow again: clears it and starts a new execution. */
  restart: () => void;
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
  step = undefined,
}: FlowExpiryHandlingOptions): FlowExpiryHandling => {
  const {expireFlow, expiry, isFlowExpired, resetFlowExpiry} = useFlowExpiry(step);
  const flowExpiryRedirect: FlowExpiryRedirect | null = useFlowExpiryRedirect(expiry, afterFlowExpiredUrl);
  const [isFlowRestarted, setIsFlowRestarted] = useState<boolean>(false);
  const restartsInPlace: boolean = !afterFlowExpiredUrl && canRestart;

  const restartFlow = (): void => {
    resetFlowExpiry();
    setIsFlowRestarted(true);
    restart();
  };
  const clearFlowRestarted: () => void = useCallback((): void => setIsFlowRestarted(false), []);

  useWhenUserPresent(isFlowExpired && restartsInPlace, restartFlow);

  return {
    clearFlowRestarted,
    expireFlow,
    flowExpiryRedirect,
    isFlowExpired,
    isFlowRestarted,
    restartFlow,
    restartsInPlace,
  };
};

export default useFlowExpiryHandling;
