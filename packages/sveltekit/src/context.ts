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

import {getContext, setContext} from 'svelte';
import type {ThunderIDContext, UserContextValue} from './models/contexts';

export const THUNDERID_KEY = Symbol('thunderid');
export const USER_KEY = Symbol('thunderid-user');

export function setThunderIDContext(context: ThunderIDContext): void {
  setContext(THUNDERID_KEY, context);
}

export function getThunderIDContext(): ThunderIDContext {
  const context = getContext<ThunderIDContext>(THUNDERID_KEY);
  if (!context) {
    throw new Error(
      '[ThunderID] No ThunderID context found. Ensure you are inside a <ThunderID> provider component.',
    );
  }
  return context;
}

export function setUserContext(context: UserContextValue): void {
  setContext(USER_KEY, context);
}

export function getUserContext(): UserContextValue {
  const context = getContext<UserContextValue>(USER_KEY);
  if (!context) {
    throw new Error(
      '[ThunderID] useUser() was called outside of <ThunderID>. ' +
        'Make sure to wrap your app with the ThunderID provider.',
    );
  }
  return context;
}
