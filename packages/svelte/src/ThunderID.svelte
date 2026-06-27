<script lang="ts">
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

  import type {ThunderIDSSRData} from './models/session';
  import type {ThunderIDContext, UserContextValue} from './models/contexts';
  import {setThunderIDContext, setUserContext} from './context';
  import {authState} from './state.svelte';

  interface Props {
    children?: import('svelte').Snippet;
    afterSignInUrl?: string;
    afterSignOutUrl?: string;
    applicationId?: string;
    baseUrl?: string;
    clientId?: string;
    scopes?: string | string[];
    signInUrl?: string;
    signUpUrl?: string;
    ssrData?: ThunderIDSSRData;
  }

  let {
    children,
    afterSignInUrl = undefined,
    afterSignOutUrl = undefined,
    applicationId = undefined,
    baseUrl = undefined,
    clientId = undefined,
    scopes = undefined,
    signInUrl = '/api/auth/signin',
    signUpUrl = undefined,
    ssrData = undefined,
  }: Props = $props();

  function hydrateFromSSR(data: ThunderIDSSRData): void {
    authState.isSignedIn = data.isSignedIn;
    authState.isInitialized = true;
    authState.myOrganizations = data.myOrganizations;
    authState.organization = data.organization;
    authState.resolvedBaseUrl = data.resolvedBaseUrl ?? '';
    authState.user = data.user;
    authState.userProfile = data.userProfile;
    authState.isLoading = false;
  }

  $effect(() => {
    if (ssrData) {
      hydrateFromSSR(ssrData);
    }
  });

  async function signIn(..._args: any[]): Promise<void> {
    window.location.href = signInUrl;
  }

  async function signOut(..._args: any[]): Promise<void> {
    window.location.href = '/api/auth/signout';
  }

  async function signUp(..._args: any[]): Promise<void> {
    if (signUpUrl) {
      window.location.href = signUpUrl;
    }
  }

  let brandingPreference: ThunderIDContext['brandingPreference'] = $state(null);

  $effect(() => {
    if (ssrData?.brandingPreference) {
      brandingPreference = ssrData.brandingPreference;
    }
  });

  const context: ThunderIDContext = {
    get afterSignInUrl() { return afterSignInUrl; },
    get afterSignOutUrl() { return afterSignOutUrl; },
    get applicationId() { return applicationId; },
    get baseUrl() { return baseUrl; },
    get brandingPreference() { return brandingPreference; },
    get clientId() { return clientId; },
    get isInitialized() { return authState.isInitialized; },
    get isLoading() { return authState.isLoading; },
    get isSignedIn() { return authState.isSignedIn; },
    get myOrganizations() { return authState.myOrganizations; },
    get organization() { return authState.organization; },
    get organizationHandle() { return undefined; },
    get resolvedBaseUrl() { return authState.resolvedBaseUrl; },
    get scopes() { return scopes; },
    get signInUrl() { return signInUrl; },
    get signUpUrl() { return signUpUrl; },
    get user() { return authState.user; },
    get userProfile() { return authState.userProfile; },
    signIn,
    signOut,
    signUp,
  };

  setThunderIDContext(context);

  const userContext: UserContextValue = {
    get profile() { return authState.userProfile; },
    get flattenedProfile() { return authState.user; },
    get schemas() { return authState.userProfile?.schemas ?? null; },
  };

  setUserContext(userContext);
</script>

{@render children?.()}
