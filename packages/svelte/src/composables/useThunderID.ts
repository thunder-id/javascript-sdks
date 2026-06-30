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

import {getThunderIDContext} from '../context';
import type {ThunderIDContext} from '../models/contexts';
import {authState} from '../state.svelte';

export function useThunderID(): ThunderIDContext {
  const context = getThunderIDContext();

  return {
    ...context,
    get brandingPreference() {
      return context.brandingPreference;
    },
    get isSignedIn() {
      return authState.isSignedIn;
    },
    get isLoading() {
      return authState.isLoading;
    },
    get isInitialized() {
      return authState.isInitialized;
    },
    get user() {
      return authState.user;
    },
    get userProfile() {
      return authState.userProfile;
    },
    get organization() {
      return authState.organization;
    },
    get myOrganizations() {
      return authState.myOrganizations;
    },
    get resolvedBaseUrl() {
      return authState.resolvedBaseUrl;
    },
  };
}
