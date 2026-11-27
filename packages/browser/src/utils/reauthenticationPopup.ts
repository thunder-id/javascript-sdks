// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDRuntimeError} from '@thunderid/javascript';

/**
 * The message a re-sign-in popup posts to the window that opened it.
 */
export const REAUTHENTICATION_MESSAGE = 'reauthentication-callback';

/**
 * The window name a re-sign-in popup carries, so the SDK in the popup hands the callback to its opener
 * instead of signing in.
 */
export const REAUTHENTICATION_WINDOW_PREFIX = 'reauthentication-';

const POPUP_FEATURES = 'width=520,height=720';

export interface ReauthenticationMessage {
  code?: string;
  error?: string;
  errorDescription?: string;
  state?: string;
  type: string;
}

/**
 * Opens the re-sign-in popup. Call it from the user action, before any `await`, so the browser lets it
 * open.
 *
 * @param instanceId - The client instance.
 * @returns The popup window.
 */
export const openReauthenticationPopup = (instanceId: number): Window => {
  const popup: Window | null = window.open('', `${REAUTHENTICATION_WINDOW_PREFIX}${instanceId}`, POPUP_FEATURES);

  if (!popup) {
    throw new ThunderIDRuntimeError(
      'The browser blocked the sign-in window. Allow pop-ups for this site and try again.',
      'BROWSER-REAUTHENTICATION-PB01',
      'browser',
    );
  }

  return popup;
};

/**
 * Waits for the popup to post the callback of the request with this `state`.
 *
 * @param popup - The popup window.
 * @param state - The request's state.
 * @returns The callback parameters.
 */
export const waitForReauthentication = (popup: Window, state: string): Promise<ReauthenticationMessage> =>
  new Promise((resolve, reject) => {
    const closedCheck: number = window.setInterval(() => {
      if (popup.closed) {
        done();
        reject(new ThunderIDRuntimeError('The sign-in window was closed.', 'BROWSER-REAUTHENTICATION-PC01', 'browser'));
      }
    }, 500);

    function done(): void {
      window.clearInterval(closedCheck);
      window.removeEventListener('message', onMessage);
    }

    function onMessage(event: MessageEvent<ReauthenticationMessage>): void {
      if (
        event.origin !== window.location.origin ||
        event.source !== popup ||
        event.data?.type !== REAUTHENTICATION_MESSAGE ||
        event.data.state !== state
      ) {
        return;
      }

      done();
      resolve(event.data);
    }

    window.addEventListener('message', onMessage);
  });

/**
 * Whether this window is a re-sign-in popup.
 *
 * @returns `true` in a re-sign-in popup that has an opener.
 */
export const isReauthenticationPopup = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.name === 'string' &&
  window.name.startsWith(REAUTHENTICATION_WINDOW_PREFIX) &&
  Boolean(window.opener);

/**
 * In a re-sign-in popup that landed on the callback, hands the callback to the opener and closes the
 * popup. Elsewhere it does nothing.
 *
 * @returns `true` when the page was a re-sign-in callback.
 */
export const completeReauthenticationInPopup = (): boolean => {
  if (!isReauthenticationPopup()) {
    return false;
  }

  const params: URLSearchParams = new URL(window.location.href).searchParams;
  const state: string | null = params.get('state');

  if (!state) {
    return false;
  }

  const message: ReauthenticationMessage = {
    code: params.get('code') ?? undefined,
    error: params.get('error') ?? undefined,
    errorDescription: params.get('error_description') ?? undefined,
    state,
    type: REAUTHENTICATION_MESSAGE,
  };

  (window.opener as Window).postMessage(message, window.location.origin);
  window.close();

  return true;
};
