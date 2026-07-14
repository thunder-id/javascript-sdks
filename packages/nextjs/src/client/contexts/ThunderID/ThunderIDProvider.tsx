/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
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

'use client';

import {
  EmbeddedFlowExecuteRequestConfig,
  FlowMetadataResponse,
  generateFlattenedUserProfile,
  UpdateMeProfileConfig,
  User,
  UserProfile,
  ThunderIDRuntimeError,
  getVendorPrefix,
} from '@thunderid/node';
import {
  I18nProvider,
  FlowMetaProvider,
  FlowProvider,
  UserProvider,
  ThemeProvider,
  ThunderIDContext as ReactThunderIDContext,
  ThunderIDContextProps as ReactThunderIDContextProps,
  ThunderIDProviderProps,
  getActiveTheme,
} from '@thunderid/react';
import {ReadonlyURLSearchParams} from 'next/dist/client/components/navigation.react-server';
import {AppRouterInstance} from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {useRouter, useSearchParams} from 'next/navigation';
import {FC, PropsWithChildren, RefObject, useEffect, useMemo, useRef, useState} from 'react';
import ThunderIDContext, {ThunderIDContextProps} from './ThunderIDContext';
import {RefreshResult} from '../../../server/actions/refreshToken';
import logger from '../../../utils/logger';

/**
 * Props interface of {@link ThunderIDClientProvider}
 */
export type ThunderIDClientProviderProps = Partial<Omit<ThunderIDProviderProps, 'baseUrl' | 'clientId'>> &
  Pick<ThunderIDProviderProps, 'baseUrl' | 'clientId'> & {
    applicationId: ThunderIDContextProps['applicationId'];
    clearSession: () => Promise<void>;
    handleOAuthCallback: (
      code: string,
      state: string,
      sessionState?: string,
    ) => Promise<{error?: string; redirectUrl?: string; success: boolean}>;
    /**
     * Flow metadata fetched server-side ahead of time, seeding `FlowMetaProvider` so it can skip
     * its own initial client-side fetch (avoiding a flash of untranslated i18n keys).
     */
    initialMeta?: FlowMetadataResponse | null;
    isSignedIn: boolean;
    organizationHandle: ThunderIDContextProps['organizationHandle'];
    refreshToken: () => Promise<RefreshResult>;
    signIn: ThunderIDContextProps['signIn'];
    signOut: ThunderIDContextProps['signOut'];
    signUp: ThunderIDContextProps['signUp'];
    updateProfile: (
      requestConfig: UpdateMeProfileConfig,
      sessionId?: string,
    ) => Promise<{data: {user: User}; error: string; success: boolean}>;
    user: User | null;
    userProfile: UserProfile;
  };

const ThunderIDClientProvider: FC<PropsWithChildren<ThunderIDClientProviderProps>> = ({
  baseUrl,
  children,
  signIn,
  clearSession,
  refreshToken,
  signOut,
  signUp,
  handleOAuthCallback,
  preferences,
  isSignedIn,
  signInUrl,
  signUpUrl,
  user: _user,
  userProfile: _userProfile,
  updateProfile,
  applicationId,
  organizationHandle,
  scopes,
  vendor,
  initialMeta = null,
}: PropsWithChildren<ThunderIDClientProviderProps>) => {
  const reRenderCheckRef: RefObject<boolean> = useRef(false);
  const router: AppRouterInstance = useRouter();
  const searchParams: ReadonlyURLSearchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(_user);
  const [userProfile, setUserProfile] = useState<UserProfile>(_userProfile);

  useEffect(() => {
    setUserProfile(_userProfile);
  }, [_userProfile]);

  useEffect(() => {
    setUser(_user);
  }, [_user]);

  // Handle OAuth callback automatically
  useEffect(() => {
    // React 18.x Strict.Mode has a new check for `Ensuring reusable state` to facilitate an upcoming react feature.
    // https://reactjs.org/docs/strict-mode.html#ensuring-reusable-state
    // This will remount all the useEffects to ensure that there are no unexpected side effects.
    // When react remounts the signIn hook of the AuthProvider, it will cause a race condition. Hence, we have to
    // prevent the re-render of this hook as suggested in the following discussion.
    // https://github.com/reactwg/react-18/discussions/18#discussioncomment-795623
    if (reRenderCheckRef.current) {
      return;
    }

    reRenderCheckRef.current = true;

    // Don't handle callback if already signed in
    if (isSignedIn) return;

    (async (): Promise<void> => {
      try {
        const code: string | null = searchParams.get('code');
        const state: string | null = searchParams.get('state');
        const sessionState: string | null = searchParams.get('session_state');
        const error: string | null = searchParams.get('error');

        // Check for OAuth errors first
        if (error) {
          logger.error('[ThunderIDClientProvider] An error was received for the initiated sign-in request.');

          return;
        }

        // Handle OAuth callback if code and state are present
        if (code && state) {
          setIsLoading(true);

          const result: {error?: string; redirectUrl?: string; success: boolean} = await handleOAuthCallback(
            code,
            state,
            sessionState || undefined,
          );

          if (result.success) {
            // Redirect to the success URL
            if (result.redirectUrl) {
              router.push(result.redirectUrl);
            } else {
              // Refresh the page to update authentication state
              window.location.reload();
            }
          } else {
            logger.error(
              `[ThunderIDClientProvider] An error occurred while signing in: ${result.error || 'Authentication failed'}`,
            );
          }
        }
      } catch (error) {
        logger.error('[ThunderIDClientProvider] Failed to handle OAuth callback:', error);
      }
    })();
  }, []);

  useEffect(() => {
    // Set loading to false when server has resolved authentication state
    setIsLoading(false);
  }, [isSignedIn, user]);

  const handleSignIn = async (payload: any, request: EmbeddedFlowExecuteRequestConfig): Promise<any> => {
    if (!signIn) {
      throw new ThunderIDRuntimeError(
        '`signIn` function is not available.',
        'ThunderIDClientProvider-handleSignIn-RuntimeError-001',
        'nextjs',
      );
    }

    const result: any = await signIn(payload, request);

    // Redirect based flow URL is sent as `signInUrl` in the response.
    // Use window.location.href instead of router.push() — the OAuth authorization
    // endpoint is on an external server, and router.push() would send RSC fetch
    // headers that the identity provider doesn't understand, causing a CORS error.
    if (result?.data?.signInUrl) {
      window.location.href = result.data.signInUrl;

      return undefined;
    }

    // After the Embedded flow is successful, the URL to navigate next is sent as `afterSignInUrl` in the response.
    if (result?.data?.afterSignInUrl) {
      router.push(result.data.afterSignInUrl);

      return undefined;
    }

    if (result?.error) {
      throw new Error(result.error);
    }

    return result?.data ?? result;
  };

  const handleSignUp = async (payload: any, request: EmbeddedFlowExecuteRequestConfig): Promise<any> => {
    if (!signUp) {
      throw new ThunderIDRuntimeError(
        '`signUp` function is not available.',
        'ThunderIDClientProvider-handleSignUp-RuntimeError-001',
        'nextjs',
      );
    }

    const result: any = await signUp(payload, request);

    // Redirect based flow URL is sent as `signUpUrl` in the response.
    if (result?.data?.signUpUrl) {
      router.push(result.data.signUpUrl);

      return undefined;
    }

    // After the Embedded flow is successful, the URL to navigate next is sent as `afterSignUpUrl` in the response.
    if (result?.data?.afterSignUpUrl) {
      router.push(result.data.afterSignUpUrl);

      return undefined;
    }

    if (result?.error) {
      throw new Error(result.error);
    }

    return result?.data ?? result;
  };

  const handleSignOut = async (): Promise<any> => {
    logger.debug('[ThunderIDClientProvider][handleSignOut] `handleSignOut` called.');

    try {
      const result: any = await signOut();

      logger.debug('[ThunderIDClientProvider][handleSignOut] Sign out result:', result);

      if (result?.data?.afterSignOutUrl) {
        router.push(result.data.afterSignOutUrl);

        return {location: result.data.afterSignOutUrl, redirected: true};
      }

      if (result?.error) {
        logger.error(
          '[ThunderIDClientProvider][handleSignOut] Error result was returned during signing the user out with a button click:',
          result.error,
        );
      }

      return result?.data ?? result;
    } catch (error) {
      logger.error(
        '[ThunderIDClientProvider][handleSignOut] Error occurred during signing the user out with a button click:',
        error,
      );

      return undefined;
    }
  };

  const contextValue: ThunderIDContextProps = useMemo(
    () => ({
      applicationId,
      baseUrl,
      clearSession,
      isLoading,
      isSignedIn,
      organizationHandle,
      preferences,
      refreshToken,
      scopes,
      signIn: handleSignIn,
      signInUrl,
      signOut: handleSignOut,
      signUp: handleSignUp,
      signUpUrl,
      user,
    }),
    [
      baseUrl,
      user,
      isSignedIn,
      isLoading,
      signInUrl,
      signUpUrl,
      applicationId,
      organizationHandle,
      scopes,
      preferences,
    ],
  );

  const handleProfileUpdate = (payload: User): void => {
    setUser(payload);
    setUserProfile((prev: UserProfile) => ({
      ...prev,
      flattenedProfile: generateFlattenedUserProfile(payload),
      profile: payload,
    }));
  };

  // Bridge into @thunderid/react's own ThunderIDContext. Internal react components rendered by
  // BaseSignIn/BaseSignUp — most notably FlowMetaProvider, which fetches `/flow/meta` and injects
  // its i18n bundle — call react's `useThunderID()` directly. Without this bridge they'd only see
  // react's context default (applicationId/baseUrl undefined, isInitialized false), so the meta
  // fetch would never fire and flow labels would render as untranslated i18n keys. Fields with no
  // nextjs equivalent (token/http helpers meant for direct browser API calls) are stubbed out,
  // since nextjs routes those operations through server actions instead.
  const unsupported = (name: string): (() => Promise<never>) => {
    return () =>
      Promise.reject(
        new ThunderIDRuntimeError(
          `\`${name}\` is not supported in @thunderid/nextjs.`,
          `ThunderIDClientProvider-${name}-NotSupportedError-001`,
          'nextjs',
        ),
      );
  };

  const reactContextValue: ReactThunderIDContextProps = useMemo(
    () => ({
      afterSignInUrl: undefined,
      applicationId,
      baseUrl,
      clearSession,
      clientId: undefined,
      discovery: {wellKnown: null},
      exchangeToken: unsupported('exchangeToken'),
      getAccessToken: unsupported('getAccessToken'),
      getDecodedIdToken: unsupported('getDecodedIdToken'),
      getIdToken: unsupported('getIdToken'),
      getStorageManager: () => Promise.resolve(null),
      http: {
        request: unsupported('http.request'),
        requestAll: unsupported('http.requestAll'),
      },
      instanceId: 0,
      isInitialized: !isLoading,
      isLoading,
      isMetaLoading: false,
      isSignedIn,
      meta: initialMeta ?? null,
      organizationHandle,
      reInitialize: unsupported('reInitialize'),
      recover: unsupported('recover'),
      resolveFlowTemplateLiterals: (text: string | undefined): string => text ?? '',
      scopes,
      signIn: handleSignIn,
      signInSilently: unsupported('signInSilently'),
      signInUrl,
      signOut: handleSignOut,
      signUp: handleSignUp,
      signUpUrl,
      user,
      vendor: getVendorPrefix(vendor),
    }),
    [
      applicationId,
      baseUrl,
      clearSession,
      isLoading,
      isSignedIn,
      organizationHandle,
      scopes,
      signInUrl,
      signUpUrl,
      user,
      initialMeta,
      vendor,
    ],
  );

  return (
    <ThunderIDContext.Provider value={contextValue}>
      <ReactThunderIDContext.Provider value={reactContextValue}>
        <I18nProvider preferences={preferences?.i18n}>
          <FlowMetaProvider enabled={preferences?.resolveFromMeta !== false} initialMeta={initialMeta}>
            <ThemeProvider theme={preferences?.theme?.overrides} mode={getActiveTheme(preferences?.theme?.mode as any)}>
              <FlowProvider>
                <UserProvider profile={userProfile} onUpdateProfile={handleProfileUpdate} updateProfile={updateProfile}>
                  {children}
                </UserProvider>
              </FlowProvider>
            </ThemeProvider>
          </FlowMetaProvider>
        </I18nProvider>
      </ReactThunderIDContext.Provider>
    </ThunderIDContext.Provider>
  );
};

export default ThunderIDClientProvider;
