// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  BrowserAuthConfig,
  hasAuthParamsInUrl,
  Hooks,
  HttpError,
  HttpRequestConfig,
  SignOutError,
  ThunderIDBrowserClient,
  User,
} from '@thunderid/browser';
import {describeError, logEvent, track} from './events';
import {createStore, Store} from './store';
import {getDisplayName} from './user';
import playgroundConfig from '../config';

export type SdkUser = Record<string, unknown>;

export interface SdkState {
  /** Outcome of handling `?code=` (or `?error=`) on this page load, if there was one. */
  callback: {error: string | null; handled: boolean};
  initError: string | null;
  initialized: boolean;
  /** True when the session came from storage rather than a callback on this page load. */
  restored: boolean;
  signedIn: boolean;
  user: SdkUser | null;
}

export const client: ThunderIDBrowserClient = new ThunderIDBrowserClient();

export const sdkState: Store<SdkState> = createStore<SdkState>({
  callback: {error: null, handled: false},
  initError: null,
  initialized: false,
  restored: false,
  signedIn: false,
  user: null,
});

/** How many times each `client.on()` hook has fired since the page loaded. */
export const hookCounts: Store<Record<string, number>> = createStore<Record<string, number>>({});

export const REGISTERED_HOOKS: Hooks[] = [
  Hooks.Initialize,
  Hooks.SignIn,
  Hooks.SignOut,
  Hooks.SignOutFailed,
  Hooks.RevokeAccessToken,
  Hooks.HttpRequestStart,
  Hooks.HttpRequestSuccess,
  Hooks.HttpRequestError,
  Hooks.HttpRequestFinish,
];

export const sdkConfig: BrowserAuthConfig = {
  afterSignInUrl: playgroundConfig.afterSignInUrl,
  afterSignOutUrl: playgroundConfig.afterSignOutUrl,
  applicationId: playgroundConfig.applicationId,
  baseUrl: playgroundConfig.baseUrl,
  clientId: playgroundConfig.clientId,
  // Per-collection management endpoint overrides (see .env.example). Unset keys resolve to
  // {baseUrl}/{collection}.
  endpoints: playgroundConfig.endpoints,
  scopes: playgroundConfig.scopes,
  ...(playgroundConfig.storage ? {storage: playgroundConfig.storage} : {}),
};

const patch = (next: Partial<SdkState>): void => sdkState.set({...sdkState.get(), ...next});

const hookFired = (hook: Hooks, detail: string, kind: 'ok' | 'error' | 'info' = 'info'): void => {
  const counts: Record<string, number> = hookCounts.get();

  hookCounts.set({...counts, [hook]: (counts[hook] ?? 0) + 1});
  logEvent(`on:${hook}`, detail, kind);
};

const describeRequest = (request: unknown): string => {
  const config: HttpRequestConfig = (request ?? {}) as HttpRequestConfig;

  return `${String(config.method ?? 'GET').toUpperCase()} ${String(config.url ?? '')}`;
};

/**
 * Re-reads the signed-in state and the user from the client. Called after every operation that can
 * change the session.
 */
export const refreshSdkState = async (): Promise<void> => {
  try {
    const signedIn: boolean = await client.isSignedIn();
    const user: SdkUser | null = signedIn ? ((await client.getUser()) as SdkUser) : null;

    patch({signedIn, user});
  } catch (error) {
    patch({signedIn: false, user: null});
    logEvent('sdk:state', describeError(error), 'error');
  }
};

const registerHooks = async (): Promise<void> => {
  await client.on(Hooks.Initialize, (ready?: boolean) => hookFired(Hooks.Initialize, `ready=${String(ready)}`, 'ok'));
  await client.on(Hooks.SignIn, (user?: User) => {
    hookFired(Hooks.SignIn, getDisplayName(user as SdkUser | undefined), 'ok');
    void refreshSdkState();
  });
  await client.on(Hooks.SignOut, () => {
    hookFired(Hooks.SignOut, 'returned from end_session_endpoint', 'ok');
  });
  await client.on(Hooks.SignOutFailed, (error?: SignOutError) => {
    hookFired(Hooks.SignOutFailed, `${error?.error ?? ''} ${error?.description ?? ''}`.trim(), 'error');
  });
  await client.on(Hooks.RevokeAccessToken, () => {
    hookFired(Hooks.RevokeAccessToken, 'access token revoked', 'ok');
    void refreshSdkState();
  });
  await client.on(Hooks.HttpRequestStart, (request?: unknown) => {
    hookFired(Hooks.HttpRequestStart, describeRequest(request));
  });
  await client.on(Hooks.HttpRequestSuccess, (response?: {status?: number}) => {
    hookFired(Hooks.HttpRequestSuccess, `HTTP ${String(response?.status ?? '')}`, 'ok');
  });
  await client.on(Hooks.HttpRequestError, (error?: HttpError) => {
    hookFired(
      Hooks.HttpRequestError,
      error?.response ? `HTTP ${error.response.status}` : (error?.message ?? 'request failed'),
      'error',
    );
  });
  await client.on(Hooks.HttpRequestFinish, () => {
    hookFired(Hooks.HttpRequestFinish, '');
  });
};

/**
 * Handles the redirect back from ThunderID: exchanges `?code=` for tokens with `signIn()`, or
 * reports `?error=` and strips it from the URL.
 */
const handleCallback = async (): Promise<void> => {
  const params: URLSearchParams = new URLSearchParams(window.location.search);
  const error: string | null = params.get('error');

  if (error) {
    const message = `${error}: ${params.get('error_description') ?? 'no description'}`;

    logEvent('callback:error', message, 'error');
    patch({callback: {error: message, handled: true}});
    window.history.replaceState(null, '', window.location.pathname + window.location.hash);

    return;
  }

  if (!hasAuthParamsInUrl()) return;

  try {
    await track(
      'signIn:callback',
      () => client.signIn(),
      (user: User | undefined) => (user ? `code exchanged for ${getDisplayName(user as SdkUser)}` : 'no user returned'),
    );
    patch({callback: {error: null, handled: true}});
  } catch (caught) {
    patch({callback: {error: describeError(caught), handled: true}});
  }
};

/**
 * Initializes the client, subscribes to its hooks, completes a pending callback, and restores any
 * stored session.
 */
export const bootstrap = async (): Promise<void> => {
  try {
    // Hooks are registered before initialize() so the initialize hook itself is observed.
    await registerHooks();
    await track('initialize', () => client.initialize(sdkConfig));
    patch({initialized: true});
  } catch (error) {
    patch({initError: describeError(error)});

    return;
  }

  const hadSessionBefore: boolean = await client.isSignedIn().catch(() => false);

  await handleCallback();
  await refreshSdkState();

  const {signedIn} = sdkState.get();

  patch({restored: signedIn && hadSessionBefore});
  logEvent(
    signedIn ? (hadSessionBefore ? 'session:restored' : 'session:started') : 'session:none',
    signedIn ? getDisplayName(sdkState.get().user) : 'signed out',
    signedIn ? 'ok' : 'info',
  );
};
