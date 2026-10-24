// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AttributeSchema,
  ThunderIDRuntimeError,
  extractUserClaimsFromIdToken,
  generateFlattenedUserProfile,
  hasAuthParamsInUrl,
  hasCalledForThisInstanceInUrl,
  HttpResponse,
  IdToken,
  User,
  UserProfile,
  SignInOptions,
  TokenResponse,
  EmbeddedSignInFlowResponse,
  Preferences,
  getVendorPrefix,
  resolveResourceEndpoint,
  SPAUtils,
} from '@thunderid/browser';
import {
  type AppContext,
  type Component,
  defineComponent,
  getCurrentInstance,
  h,
  onMounted,
  onUnmounted,
  provide,
  type Ref,
  ref,
  type SetupContext,
  type ShallowRef,
  shallowRef,
  type PropType,
  type VNode,
} from 'vue';
import FlowMetaProvider from './FlowMetaProvider';
import FlowProvider from './FlowProvider';
import I18nProvider from './I18nProvider';
import ThemeProvider from './ThemeProvider';
import UserProvider from './UserProvider';
import getUsersMe from '../api/getUsersMe';
import getUsersMeMeta from '../api/getUsersMeMeta';
import {THUNDERID_KEY} from '../keys';
import type {ThunderIDVueConfig} from '../models/config';
import type {ThunderIDContext} from '../models/contexts';
import ThunderIDVueClient from '../ThunderIDVueClient';
import {createVueLogger} from '../utils/logger';

const logger: ReturnType<typeof createVueLogger> = createVueLogger('ThunderIDProvider');

interface ThunderIDProviderProps {
  afterSignInUrl: string | undefined;
  afterSignOutUrl: string | undefined;
  applicationId: string | undefined;
  baseUrl: string;
  clientId: string;
  endpoints: ThunderIDVueConfig['endpoints'];
  instanceId: number;
  organizationChain: object | undefined;
  organizationHandle: string | undefined;
  preferences: Preferences | undefined;
  scopes: string | string[] | undefined;
  session: ThunderIDVueConfig['session'];
  signInOptions: SignInOptions | undefined;
  signInUrl: string | undefined;
  signUpUrl: string | undefined;
  storage: string | undefined;
  vendor: string | undefined;
}

/**
 * Checks if the current URL contains authentication parameters.
 */
function hasAuthParams(url: URL, afterSignInUrl: string | undefined): boolean {
  return (
    (hasAuthParamsInUrl() &&
      !!afterSignInUrl &&
      new URL(url.origin + url.pathname).toString() === new URL(afterSignInUrl).toString()) ||
    url.searchParams.get('error') !== null
  );
}

/**
 * Root provider component for the ThunderID Vue SDK.
 *
 * This component initializes the client, manages authentication state,
 * and provides the ThunderID context to child components via Vue's provide/inject.
 *
 * @example
 * ```vue
 * <template>
 *   <ThunderIDProvider v-bind="config">
 *     <router-view />
 *   </ThunderIDProvider>
 * </template>
 * ```
 */
const ThunderIDProvider: Component = defineComponent({
  name: 'ThunderIDProvider',
  props: {
    /** The URL to redirect to after sign in. */
    afterSignInUrl: {
      default: undefined,
      type: String,
    },
    /** The URL to redirect to after sign out. */
    afterSignOutUrl: {
      default: undefined,
      type: String,
    },
    /** The ThunderID application ID. */
    applicationId: {
      default: undefined,
      type: String,
    },
    /** The base URL of the ThunderID tenant. */
    baseUrl: {
      required: true,
      type: String,
    },
    /** The OAuth2 client ID. */
    clientId: {
      required: true,
      type: String,
    },
    /** Optional endpoint URL overrides (OIDC/OAuth and resource-server endpoints). */
    endpoints: {
      default: undefined,
      type: Object as PropType<ThunderIDVueConfig['endpoints']>,
    },
    /** Instance ID for multi-instance support. */
    instanceId: {
      default: 0,
      type: Number,
    },
    /** Organization chain config. */
    organizationChain: {
      default: undefined,
      type: Object,
    },
    /** The organization handle. */
    organizationHandle: {
      default: undefined,
      type: String,
    },
    /** User preferences configuration. */
    preferences: {
      default: undefined,
      type: Object as PropType<Preferences>,
    },
    /** The scopes to request. */
    scopes: {
      default: undefined,
      type: [Array, String] as PropType<string | string[]>,
    },
    /** Additional sign-in options. */
    /** Behaviour around the ThunderID SSO session, such as checking for it before signing in. */
    session: {
      default: undefined,
      type: Object as PropType<ThunderIDVueConfig['session']>,
    },
    signInOptions: {
      default: undefined,
      type: Object as PropType<SignInOptions>,
    },
    /** The sign-in URL. */
    signInUrl: {
      default: undefined,
      type: String,
    },
    /** The sign-up URL. */
    signUpUrl: {
      default: undefined,
      type: String,
    },
    /** Storage type. */
    storage: {
      default: undefined,
      type: String,
    },
    /**
     * Vendor/brand namespace used to prefix storage keys, cookie names, and CSS class names
     * generated by the SDK. Override this when white-labeling the SDK under a different brand.
     */
    vendor: {
      default: undefined,
      type: String,
    },
  },
  setup(props: ThunderIDProviderProps, {slots}: SetupContext): () => VNode {
    // ── Client ──
    const client: ThunderIDVueClient = new ThunderIDVueClient(props.instanceId);
    const vendor: string = getVendorPrefix(props.vendor);

    // ── Reactive State ──
    const isSignedIn: Ref<boolean> = ref<boolean>(false);
    const isInitialized: Ref<boolean> = ref<boolean>(false);
    const isLoading: Ref<boolean> = ref<boolean>(true);
    const user: ShallowRef<any | null> = shallowRef<any | null>(null);
    const userProfile: ShallowRef<UserProfile | null> = shallowRef<UserProfile | null>(null);
    const userSchema: Ref<Record<string, AttributeSchema> | null> = ref<Record<string, AttributeSchema> | null>(null);
    const resolvedBaseUrl: Ref<string> = ref<string>(props.baseUrl);

    let isUpdatingSession = false;
    let signInCheckInterval: ReturnType<typeof setInterval> | undefined;
    let loadingCheckInterval: ReturnType<typeof setInterval> | undefined;

    // ── Build config from props ──
    function buildConfig(): ThunderIDVueConfig {
      return {
        afterSignInUrl: props.afterSignInUrl ?? window.location.origin,
        afterSignOutUrl: props.afterSignOutUrl ?? window.location.origin,
        applicationId: props.applicationId,
        baseUrl: props.baseUrl,
        clientId: props.clientId,
        endpoints: props.endpoints,
        organizationChain: props.organizationChain,
        organizationHandle: props.organizationHandle,
        preferences: props.preferences,
        scopes: props.scopes,
        session: props.session,
        signInOptions: props.signInOptions,
        signInUrl: props.signInUrl,
        signUpUrl: props.signUpUrl,
        storage: props.storage,
        vendor,
      } as ThunderIDVueConfig;
    }

    // ── Session Update ──
    async function updateSession(): Promise<void> {
      try {
        isUpdatingSession = true;
        isLoading.value = true;
        let baseUrl: string = resolvedBaseUrl.value;

        const decodedToken: IdToken = await client.getDecodedIdToken();

        if (decodedToken?.['user_org']) {
          baseUrl = `${(await client.getConfiguration()).baseUrl}/o`;
          resolvedBaseUrl.value = baseUrl;
        }

        const shouldFetchProfile: boolean = props.preferences?.user?.fetchUserProfile !== false;
        const claims: User = extractUserClaimsFromIdToken(decodedToken);
        let profileData: User = claims;
        const currentSignInStatus: boolean = await client.isSignedIn();

        if (currentSignInStatus && shouldFetchProfile) {
          try {
            const fetchedProfile: User = await getUsersMe({
              baseUrl,
              url: resolveResourceEndpoint('usersMe', {endpoints: props.endpoints}),
              instanceId: props.instanceId,
            });
            profileData = {...claims, ...fetchedProfile};
          } catch {
            // silent failure, fall back to token claims
          }

          try {
            const metaRes = await getUsersMeMeta({
              baseUrl,
              url: resolveResourceEndpoint('usersMeMeta', {endpoints: props.endpoints}),
              instanceId: props.instanceId,
            });
            if (metaRes?.schema) {
              userSchema.value = metaRes.schema;
            } else {
              userSchema.value = null;
            }
          } catch {
            userSchema.value = null;
          }
        } else {
          userSchema.value = null;
        }

        user.value = profileData;
        const profileDataObj: UserProfile = {
          flattenedProfile: generateFlattenedUserProfile(profileData),
          profile: profileData,
        };
        userProfile.value = profileDataObj;

        isSignedIn.value = currentSignInStatus;
      } catch {
        // silent
      } finally {
        isUpdatingSession = false;
        isLoading.value = client.isLoading();
      }
    }

    // ── Sign In (wrapper) ──
    async function signIn(...args: any[]): Promise<User | EmbeddedSignInFlowResponse> {
      const arg1: any = args[0];
      const isV2FlowRequest: boolean =
        typeof arg1 === 'object' && arg1 !== null && ('executionId' in arg1 || 'applicationId' in arg1);

      try {
        if (!isV2FlowRequest) {
          isUpdatingSession = true;
          isLoading.value = true;
        }

        return await client.signIn(...args);
      } catch (error) {
        throw new ThunderIDRuntimeError(
          `Sign in failed: ${error instanceof Error ? error.message : String(JSON.stringify(error))}`,
          'thunderid-signIn-Error',
          'vue',
          'An error occurred while trying to sign in.',
        );
      } finally {
        if (!isV2FlowRequest) {
          isUpdatingSession = false;
          isLoading.value = client.isLoading();
        }
      }
    }

    // ── Sign Out ──
    async function signOut(...args: any[]): Promise<any> {
      return client.signOut(...args);
    }

    // ── Sign Up ──
    async function signUp(...args: any[]): Promise<any> {
      return client.signUp(...args);
    }

    // ── Sign In Silently ──
    async function signInSilently(options?: SignInOptions): Promise<User | boolean> {
      try {
        isUpdatingSession = true;
        isLoading.value = true;
        return await client.signInSilently(options);
      } catch (error) {
        throw new ThunderIDRuntimeError(
          `Error while signing in silently: ${error instanceof Error ? error.message : String(JSON.stringify(error))}`,
          'thunderid-signInSilently-Error',
          'vue',
          'An error occurred while trying to sign in silently.',
        );
      } finally {
        isUpdatingSession = false;
        isLoading.value = client.isLoading();
      }
    }

    // ── Provide Context ──
    const context: ThunderIDContext = {
      afterSignInUrl: props.afterSignInUrl,
      applicationId: props.applicationId,
      baseUrl: props.baseUrl,
      endpoints: props.endpoints,
      clearSession: async (...args: any[]): Promise<void> => {
        await client.clearSession(...args);
      },
      clientId: props.clientId,
      scopes: props.scopes,
      exchangeToken: (config: any): Promise<TokenResponse | Response> => client.exchangeToken(config),
      getAccessToken: (): Promise<string> => client.getAccessToken(),
      getDecodedIdToken: (): Promise<IdToken> => client.getDecodedIdToken(),
      getIdToken: (): Promise<string> => client.getIdToken(),
      getStorageManager: () => client.getStorageManager(),
      http: {
        request: (requestConfig?: any): Promise<HttpResponse<any>> => client.request(requestConfig),
        requestAll: (requestConfigs?: any[]): Promise<HttpResponse<any>[]> => client.requestAll(requestConfigs),
      },
      instanceId: props.instanceId,
      isInitialized,
      isLoading,
      isSignedIn,
      organizationHandle: props.organizationHandle,
      preferences: props.preferences,
      reInitialize: async (config: any): Promise<boolean> => {
        const result: boolean = await client.reInitialize(config);
        return typeof result === 'boolean' ? result : true;
      },
      signIn,
      signInOptions: props.signInOptions,
      signInSilently,
      signInUrl: props.signInUrl,
      signOut,
      signUp,
      signUpUrl: props.signUpUrl,
      storage: props.storage as ThunderIDVueConfig['storage'],
      user,
      userSchema,
      vendor,
    };

    provide(THUNDERID_KEY, context);

    // Also provide at app level, so code that runs in the app context rather than inside this
    // component tree (such as Vue Router guards, which run in `app.runWithContext()`) can inject it.
    // The first provider wins; one the host framework already provided is left untouched.
    const appContext: AppContext | undefined = getCurrentInstance()?.appContext;
    const providesAtAppLevel: boolean = !!appContext && !((THUNDERID_KEY as symbol) in appContext.provides);

    if (appContext && providesAtAppLevel) {
      appContext.app.provide(THUNDERID_KEY, context);
    }

    // ── Lifecycle ──
    onMounted(async (): Promise<void> => {
      // 1. Initialize the client
      const config: ThunderIDVueConfig = buildConfig();
      await client.initialize(config);

      // 2. Load the OpenID provider configuration
      // We manually initialize this here because `initialize` doesn't load it for us.
      // This is needed for endpoints like /.well-known/openid-configuration.
      // A failure is not fatal: sign-in loads it again before it needs any endpoint.
      try {
        await client.getDiscoveryResponse();
      } catch (error) {
        logger.warn('Could not load the OIDC discovery metadata on mount.', error);
      }

      const initializedConfig: any = await (client.getConfiguration() as any);

      if (initializedConfig?.baseUrl) {
        sessionStorage.setItem(`${vendor}_base_url`, initializedConfig.baseUrl);
      }

      // 2. Check initialization status
      try {
        const status: boolean = await client.isInitialized();
        isInitialized.value = status;
      } catch {
        isInitialized.value = false;
      }

      // Sync session state whenever sign-in completes (both redirect and embedded V2 flows).
      await client.on('sign-in', async () => {
        await updateSession();
      });

      // A session that ends elsewhere, such as a sign-out in another app, signs this app out too.
      await client.on('sign-out', () => {
        user.value = null;
        userProfile.value = null;
        isSignedIn.value = false;
      });

      // 3. Try to sign in if already authenticated or if URL has auth params
      const alreadySignedIn: boolean = await client.isSignedIn();

      if (alreadySignedIn) {
        await updateSession();
      } else {
        const currentUrl: URL = new URL(window.location.href);
        const hasParams: boolean =
          hasAuthParams(currentUrl, initializedConfig?.afterSignInUrl) &&
          hasCalledForThisInstanceInUrl(props.instanceId ?? 0, currentUrl.search);

        if (hasParams) {
          try {
            const urlParams: URLSearchParams = currentUrl.searchParams;
            const code: string | null = urlParams.get('code');
            const executionIdFromUrl: string | null = urlParams.get('executionId');
            const storedExecutionId: string | null = sessionStorage.getItem(`${vendor}_execution_id`);

            // A silent sign-in response is handled even without a code: an error such as
            // login_required must still be relayed from the iframe to the waiting parent.
            if ((code || SPAUtils.isSilentStatePresentInURL()) && !executionIdFromUrl && !storedExecutionId) {
              await signIn();
            }
          } catch (error) {
            throw new ThunderIDRuntimeError(
              `Sign in failed: ${error instanceof Error ? error.message : String(JSON.stringify(error))}`,
              'thunderid-signIn-Error',
              'vue',
              'An error occurred while trying to sign in.',
            );
          }
        }
      }

      // 4. Set up polling for sign-in status
      try {
        const status: boolean = await client.isSignedIn();
        isSignedIn.value = status;

        if (!status) {
          signInCheckInterval = setInterval(async (): Promise<void> => {
            const newStatus: boolean = await client.isSignedIn();
            if (newStatus) {
              isSignedIn.value = true;
              if (signInCheckInterval) {
                clearInterval(signInCheckInterval);
                signInCheckInterval = undefined;
              }
            }
          }, 1000);
        }
      } catch {
        isSignedIn.value = false;
      }

      // 5. Set up polling for loading state
      loadingCheckInterval = setInterval((): void => {
        if (isUpdatingSession) return;

        const currentUrl: URL = new URL(window.location.href);
        if (!isSignedIn.value && hasAuthParams(currentUrl, initializedConfig?.afterSignInUrl)) return;

        isLoading.value = client.isLoading();
      }, 100);
    });

    onUnmounted((): void => {
      if (appContext && providesAtAppLevel && appContext.provides[THUNDERID_KEY as symbol] === context) {
        delete appContext.provides[THUNDERID_KEY as symbol];
      }
      if (signInCheckInterval) {
        clearInterval(signInCheckInterval);
      }
      if (loadingCheckInterval) {
        clearInterval(loadingCheckInterval);
      }
    });

    // ── Render ──
    return (): any =>
      h(
        I18nProvider,
        {vendor},
        {
          default: (): any =>
            h(
              FlowMetaProvider,
              {enabled: true},
              {
                default: (): any =>
                  h(ThemeProvider, null, {
                    default: (): any =>
                      h(FlowProvider, null, {
                        default: (): any =>
                          h(
                            UserProvider,
                            {
                              onUpdateProfile: (updatedUser: User): void => {
                                user.value = updatedUser;
                                userProfile.value = {
                                  flattenedProfile: generateFlattenedUserProfile(updatedUser),
                                  profile: updatedUser,
                                };
                              },
                              profile: userProfile.value,
                              revalidateProfile: async (): Promise<void> => {
                                await updateSession();
                              },
                              userSchema: userSchema.value,
                            },
                            {
                              default: (): any => slots['default']?.(),
                            },
                          ),
                      }),
                  }),
              },
            ),
        },
      );
  },
});

export default ThunderIDProvider;
