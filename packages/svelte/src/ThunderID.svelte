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

  import {onMount} from 'svelte';
  import {
    ThunderIDRuntimeError,
    extractUserClaimsFromIdToken,
    hasAuthParamsInUrl,
    hasCalledForThisInstanceInUrl,
    type IdToken,
    type Organization,
    type SignInOptions,
    type User,
    type UserProfile,
  } from '@thunderid/browser';
  import ThunderIDSvelteClient from './ThunderIDSvelteClient';
  import {setThunderIDContext} from './context';
  import {authState} from './state.svelte';
  import type {ThunderIDSvelteConfig} from './models/config';
  import type {ThunderIDContext} from './models/contexts';

  interface Props {
    children?: import('svelte').Snippet;
    afterSignInUrl?: string;
    afterSignOutUrl?: string;
    applicationId?: string;
    baseUrl: string;
    clientId: string;
    instanceId?: number;
    organizationChain?: object;
    organizationHandle?: string;
    scopes?: string | string[];
    signInOptions?: SignInOptions;
    signInUrl?: string;
    signUpUrl?: string;
    storage?: string;
    syncSession?: boolean;
  }

  let {
    children,
    afterSignInUrl = undefined,
    afterSignOutUrl = undefined,
    applicationId = undefined,
    baseUrl,
    clientId,
    instanceId = 0,
    organizationChain = undefined,
    organizationHandle = undefined,
    scopes = undefined,
    signInOptions = undefined,
    signInUrl = undefined,
    signUpUrl = undefined,
    storage = undefined,
    syncSession = undefined,
  }: Props = $props();

  const client: ThunderIDSvelteClient = new ThunderIDSvelteClient(instanceId);

  let isUpdatingSession = false;
  let signInCheckInterval: ReturnType<typeof setInterval> | undefined;
  let loadingCheckInterval: ReturnType<typeof setInterval> | undefined;

  function buildConfig(): ThunderIDSvelteConfig {
    const resolvedAfterSignInUrl: string = afterSignInUrl ?? window.location.origin;
    const resolvedAfterSignOutUrl: string = afterSignOutUrl ?? window.location.origin;

    return {
      afterSignInUrl: resolvedAfterSignInUrl,
      afterSignOutUrl: resolvedAfterSignOutUrl,
      applicationId,
      baseUrl,
      clientId,
      organizationChain,
      organizationHandle,
      scopes,
      signInOptions,
      signInUrl,
      signUpUrl,
      storage,
      syncSession,
    } as ThunderIDSvelteConfig;
  }

  function hasAuthParams(url: URL, urlAfterSignIn: string | undefined): boolean {
    return (
      (hasAuthParamsInUrl() &&
        !!urlAfterSignIn &&
        new URL(url.origin + url.pathname).toString() === new URL(urlAfterSignIn).toString()) ||
      url.searchParams.get('error') !== null
    );
  }

  async function updateSession(): Promise<void> {
    try {
      isUpdatingSession = true;
      authState.isLoading = true;
      let resolvedBaseUrl: string = authState.resolvedBaseUrl;

      const decodedToken: IdToken = await client.getDecodedIdToken();

      if ((decodedToken as any)?.['user_org']) {
        resolvedBaseUrl = `${(await client.getConfiguration()).baseUrl}/o`;
        authState.resolvedBaseUrl = resolvedBaseUrl;
      }

      const claims: User = extractUserClaimsFromIdToken(decodedToken);
      authState.user = claims;
      const profileData: UserProfile = {
        flattenedProfile: claims,
        profile: claims,
        schemas: [],
      } as UserProfile;
      authState.userProfile = profileData;

      const currentSignInStatus: boolean = await client.isSignedIn();
      authState.isSignedIn = currentSignInStatus;
    } catch {
      // silent
    } finally {
      isUpdatingSession = false;
      authState.isLoading = client.isLoading();
    }
  }

  async function signIn(...args: any[]): Promise<any> {
    try {
      isUpdatingSession = true;
      authState.isLoading = true;

      return await client.signIn(...args);
    } catch (error) {
      throw new ThunderIDRuntimeError(
        `Sign in failed: ${error instanceof Error ? error.message : String(JSON.stringify(error))}`,
        'thunderid-signIn-Error',
        'svelte',
        'An error occurred while trying to sign in.',
      );
    } finally {
      isUpdatingSession = false;
      authState.isLoading = client.isLoading();
    }
  }

  async function signOut(...args: any[]): Promise<any> {
    return client.signOut(...args);
  }

  async function signUp(...args: any[]): Promise<any> {
    return client.signUp(...args);
  }

  async function signInSilently(options?: SignInOptions): Promise<any> {
    try {
      isUpdatingSession = true;
      authState.isLoading = true;
      return await client.signInSilently(options);
    } catch (error) {
      throw new ThunderIDRuntimeError(
        `Error while signing in silently: ${error instanceof Error ? error.message : String(JSON.stringify(error))}`,
        'thunderid-signInSilently-Error',
        'svelte',
        'An error occurred while trying to sign in silently.',
      );
    } finally {
      isUpdatingSession = false;
      authState.isLoading = client.isLoading();
    }
  }

  async function switchOrganization(organization: Organization): Promise<any> {
    try {
      isUpdatingSession = true;
      authState.isLoading = true;
      const response: any = await client.switchOrganization(organization);

      if (await client.isSignedIn()) {
        await updateSession();
      }

      return response;
    } catch (error) {
      throw new ThunderIDRuntimeError(
        `Failed to switch organization: ${error instanceof Error ? error.message : String(JSON.stringify(error))}`,
        'thunderid-switchOrganization-Error',
        'svelte',
        'An error occurred while switching to the specified organization.',
      );
    } finally {
      isUpdatingSession = false;
      authState.isLoading = client.isLoading();
    }
  }

  const context: ThunderIDContext = {
    afterSignInUrl,
    applicationId,
    baseUrl,
    clearSession: async (...args: any[]): Promise<void> => {
      await client.clearSession(...args);
    },
    clientId,
    scopes,
    exchangeToken: (config: any): Promise<any> => client.exchangeToken(config),
    getAccessToken: (): Promise<string> => client.getAccessToken(),
    getDecodedIdToken: (): Promise<IdToken> => client.getDecodedIdToken(),
    getIdToken: (): Promise<string> => client.getIdToken(),
    getStorageManager: () => client.getStorageManager(),
    http: {
      request: (requestConfig?: any): Promise<any> => client.request(requestConfig),
      requestAll: (requestConfigs?: any[]): Promise<any> => client.requestAll(requestConfigs),
    },
    instanceId,
    isInitialized: authState.isInitialized,
    isLoading: authState.isLoading,
    isSignedIn: authState.isSignedIn,
    organization: authState.organization,
    organizationHandle,
    reInitialize: async (config: any): Promise<boolean> => {
      const result: boolean = await client.reInitialize(config);
      return typeof result === 'boolean' ? result : true;
    },
    signIn,
    signInOptions,
    signInSilently,
    signInUrl,
    signOut,
    signUp,
    signUpUrl,
    storage: storage as ThunderIDSvelteConfig['storage'],
    switchOrganization,
    user: authState.user,
    userProfile: authState.userProfile,
  };

  setThunderIDContext(context);

  onMount(async () => {
    const config: ThunderIDSvelteConfig = buildConfig();
    await client.initialize(config);

    await client.getDiscoveryResponse();

    const initializedConfig: any = await (client.getConfiguration() as any);

    if (initializedConfig?.baseUrl) {
      sessionStorage.setItem('thunderid_base_url', initializedConfig.baseUrl);
    }

    try {
      const status: boolean = await client.isInitialized();
      authState.isInitialized = status;
    } catch {
      authState.isInitialized = false;
    }

    await client.on('sign-in', async () => {
      await updateSession();
    });

    const alreadySignedIn: boolean = await client.isSignedIn();

    if (alreadySignedIn) {
      await updateSession();
    } else {
      const currentUrl: URL = new URL(window.location.href);
      const hasParams: boolean =
        hasAuthParams(currentUrl, initializedConfig?.afterSignInUrl) &&
        hasCalledForThisInstanceInUrl(instanceId ?? 0, currentUrl.search);

      if (hasParams) {
        try {
          const urlParams: URLSearchParams = currentUrl.searchParams;
          const code: string | null = urlParams.get('code');
          const executionIdFromUrl: string | null = urlParams.get('executionId');
          const storedExecutionId: string | null = sessionStorage.getItem('thunderid_execution_id');

          if (code && !executionIdFromUrl && !storedExecutionId) {
            await signIn();
          }
        } catch (error) {
          throw new ThunderIDRuntimeError(
            `Sign in failed: ${error instanceof Error ? error.message : String(JSON.stringify(error))}`,
            'thunderid-signIn-Error',
            'svelte',
            'An error occurred while trying to sign in.',
          );
        }
      }
    }

    try {
      const status: boolean = await client.isSignedIn();
      authState.isSignedIn = status;

      if (!status) {
        signInCheckInterval = setInterval(async () => {
          const newStatus: boolean = await client.isSignedIn();
          if (newStatus) {
            authState.isSignedIn = true;
            if (signInCheckInterval) {
              clearInterval(signInCheckInterval);
              signInCheckInterval = undefined;
            }
          }
        }, 1000);
      }
    } catch {
      authState.isSignedIn = false;
    }

    loadingCheckInterval = setInterval(() => {
      if (isUpdatingSession) return;

      const currentUrl: URL = new URL(window.location.href);
      if (!authState.isSignedIn && hasAuthParams(currentUrl, initializedConfig?.afterSignInUrl)) return;

      authState.isLoading = client.isLoading();
    }, 100);
  });

  $effect(() => {
    return () => {
      if (signInCheckInterval) {
        clearInterval(signInCheckInterval);
      }
      if (loadingCheckInterval) {
        clearInterval(loadingCheckInterval);
      }
    };
  });
</script>

{@render children?.()}
