/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {getLogger} from '../logger/LoggerAdapter';

export enum SDKEvent {
  SIGN_IN = 'signIn',
  SIGN_IN_FAILED = 'signInFailed',
  SIGN_OUT = 'signOut',
  SIGN_UP = 'signUp',
  SESSION_EXPIRED = 'sessionExpired',
  TOKEN_REFRESHED = 'tokenRefreshed',
  TOKEN_REFRESH_FAILED = 'tokenRefreshFailed',
  MFA_STEP_REQUIRED = 'mfaStepRequired',

  INITIALIZED = 'initialized',
  ERROR = 'error',
}

export type SDKEventListener = (data?: unknown) => void;

type EventHandlers = Map<string, Set<SDKEventListener>>;

let _handlers: EventHandlers = new Map();

export function on(event: SDKEvent | string, listener: SDKEventListener): void {
  const key: string = typeof event === 'string' ? event : event;
  if (!_handlers.has(key)) {
    _handlers.set(key, new Set());
  }
  _handlers.get(key)!.add(listener);
}

export function off(event: SDKEvent | string, listener: SDKEventListener): void {
  const key: string = typeof event === 'string' ? event : event;
  _handlers.get(key)?.delete(listener);
}

export function emit(event: SDKEvent | string, data?: unknown): void {
  const key: string = typeof event === 'string' ? event : event;
  const logger = getLogger();
  _handlers.get(key)?.forEach((listener: SDKEventListener) => {
    try {
      listener(data);
    } catch (error: unknown) {
      logger.warn(`[EventBus] Listener error for event "${key}": ${(error as any)?.message ?? String(error)}`);
    }
  });
}

export function clearListeners(event?: SDKEvent | string): void {
  if (event) {
    _handlers.delete(typeof event === 'string' ? event : event);
  } else {
    _handlers.clear();
  }
}
