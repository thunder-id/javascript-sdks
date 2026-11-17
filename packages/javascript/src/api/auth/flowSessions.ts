// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {EmbeddedFlowSessionData, FlowSessionStore, HeldFlowSession} from '../../models/embedded-flow';
import logger from '../../utils/logger';

/**
 * The part of a flow step response that reports SSO sessions.
 */
interface FlowSessionUpdate {
  clearedSessions?: string[];
  sessionData?: EmbeddedFlowSessionData[];
}

// A flow is keyed by its authorization request, or by its execution when the request is known only at the
// end. A session can start on any step, not only the last, so every response is read. The caller's store keeps
// them between steps; nothing is held in this module, so a server process never shares one set across users.

/**
 * A store that lasts one call, for a caller that passes none: a session is posted only when the step that
 * returned it also completes the flow.
 */
export const createCallFlowSessionStore = (): FlowSessionStore => {
  const held: Map<string, HeldFlowSession[]> = new Map<string, HeldFlowSession[]>();

  return {
    getFlowSessions: (flowKey: string): Promise<HeldFlowSession[]> => Promise.resolve(held.get(flowKey) ?? []),
    removeFlowSessions: (flowKey: string): Promise<void> => {
      held.delete(flowKey);

      return Promise.resolve();
    },
    setFlowSessions: (flowKey: string, sessions: HeldFlowSession[]): Promise<void> => {
      held.set(flowKey, sessions);

      return Promise.resolve();
    },
  };
};

/**
 * Holds the sessions a flow step started or reused under its flow's key, and drops the ones it ended. A store
 * that fails only costs the device secret those sessions, so the flow goes on.
 */
export const collectFlowSessions = async (
  store: FlowSessionStore,
  flowKey: string,
  step: FlowSessionUpdate,
): Promise<void> => {
  if (!step.sessionData?.length && !step.clearedSessions?.length) {
    return;
  }
  try {
    const held: Map<string, HeldFlowSession> = new Map<string, HeldFlowSession>(
      (await store.getFlowSessions(flowKey)).map((session: HeldFlowSession) => [session.flowIdentifier, session]),
    );
    step.sessionData?.forEach(({expiresIn, flowIdentifier, sessionHandle}: EmbeddedFlowSessionData) => {
      held.set(flowIdentifier, {
        ...(expiresIn && expiresIn > 0 ? {endsAt: Date.now() + expiresIn * 1000} : {}),
        flowIdentifier,
        sessionHandle,
      });
    });
    step.clearedSessions?.forEach((flowIdentifier: string) => held.delete(flowIdentifier));
    if (held.size > 0) {
      await store.setFlowSessions(flowKey, [...held.values()]);
    } else {
      await store.removeFlowSessions(flowKey);
    }
  } catch (error) {
    logger.warn('Could not hold the SSO sessions of the flow, so they are not posted with its callback.', error);
  }
};

/**
 * Returns the sessions held under a flow's key, each with the time it has left when known, and forgets them.
 * A session that has already ended is left out, since it can no longer sign anyone in.
 */
export const takeFlowSessions = async (
  store: FlowSessionStore,
  flowKey: string,
): Promise<EmbeddedFlowSessionData[]> => {
  let held: HeldFlowSession[];
  try {
    held = await store.getFlowSessions(flowKey);
    await store.removeFlowSessions(flowKey);
  } catch (error) {
    logger.warn('Could not read the SSO sessions of the flow, so they are not posted with its callback.', error);

    return [];
  }
  const now: number = Date.now();

  return held.flatMap(({endsAt, flowIdentifier, sessionHandle}: HeldFlowSession): EmbeddedFlowSessionData[] => {
    if (endsAt === undefined) {
      return [{flowIdentifier, sessionHandle}];
    }
    const expiresIn: number = Math.ceil((endsAt - now) / 1000);

    return expiresIn > 0 ? [{expiresIn, flowIdentifier, sessionHandle}] : [];
  });
};
