// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use server';

import {
  ThunderIDRuntimeError,
  AttributeSchema,
  FlowMetadataResponse,
  FlowMetaType,
  IdToken,
  User,
  UserProfile,
  getFlowMeta,
  extractUserClaimsFromIdToken,
  resolveResourceEndpoint,
} from '@thunderid/node';
import {ThunderIDProviderProps} from '@thunderid/react';
import {FC, PropsWithChildren, ReactElement} from 'react';
import clearSession from './actions/clearSession';
import getSessionId from './actions/getSessionId';
import getSessionPayload from './actions/getSessionPayload';
import getUserAction from './actions/getUserAction';
import getUserProfileAction from './actions/getUserProfileAction';
import getUserSchemaAction from './actions/getUserSchemaAction';
import handleOAuthCallbackAction from './actions/handleOAuthCallbackAction';
import isSignedIn from './actions/isSignedIn';
import refreshToken from './actions/refreshToken';
import signInAction from './actions/signInAction';
import signOutAction from './actions/signOutAction';
import signUpAction from './actions/signUpAction';
import updateUserProfileAction from './actions/updateUserProfileAction';
import getClient from './getClient';
import ThunderIDClientProvider from '../client/contexts/ThunderID/ThunderIDProvider.js';
import {ThunderIDNextConfig} from '../models/config';
import logger from '../utils/logger';
import {pickManagementEndpoints} from '../utils/managementCollections';
import {SessionTokenPayload} from '../utils/SessionManager';

/**
 * Props interface of {@link ThunderIDServerProvider}
 */
export type ThunderIDServerProviderProps = Partial<ThunderIDProviderProps> & {
  clientSecret?: string;
  /**
   * Session cookie lifetime in seconds. Determines how long the session cookie
   * remains valid in the browser after sign-in.
   *
   * Resolution order (first defined value wins):
   *   1. This prop — set here when mounting the provider.
   *   2. `THUNDERID_SESSION_COOKIE_EXPIRY_TIME` environment variable.
   *   3. Built-in default of 86400 seconds (24 hours).
   *
   * @example
   * // 8-hour session cookie
   * <ThunderIDServerProvider sessionCookieExpiryTime={28800} ... />
   */
  sessionCookieExpiryTime?: number;
};

/**
 * Server-side provider component for ThunderID authentication.
 * Wraps the client-side provider and handles server-side authentication logic.
 * Uses the singleton ThunderIDNextClient instance for consistent authentication state.
 *
 * @param props - Props injected into the component.
 *
 * @example
 * ```tsx
 * <ThunderIDServerProvider config={thunderidConfig}>
 *   <YourApp />
 * </ThunderIDServerProvider>
 * ```
 *
 * @returns ThunderIDServerProvider component.
 */
const ThunderIDServerProvider: FC<PropsWithChildren<ThunderIDServerProviderProps>> = async ({
  children,
  afterSignInUrl,
  afterSignOutUrl,
  ..._config
}: PropsWithChildren<ThunderIDServerProviderProps>): Promise<ReactElement> => {
  const thunderIDClient = getClient();
  let config: Partial<ThunderIDNextConfig> = {};

  try {
    await thunderIDClient.initialize(_config as ThunderIDNextConfig);

    logger.debug('[ThunderIDServerProvider] ThunderID client initialized successfully.');

    config = await thunderIDClient.getConfiguration();
  } catch (error) {
    logger.error('[ThunderIDServerProvider] Failed to initialize ThunderID client:', error?.toString());

    throw new ThunderIDRuntimeError(
      `Failed to initialize ThunderID client: ${error?.toString()}`,
      'next-ConfigurationError-001',
      'next',
      'An error occurred while initializing the ThunderID client. Please check your configuration.',
    );
  }

  if (!thunderIDClient.isInitialized) {
    return <></>;
  }

  // Fetch flow metadata (design config + i18n bundle) server-side so `FlowMetaProvider` can seed
  // its state and skip a redundant client-side fetch — avoiding a flash of untranslated i18n keys
  // (e.g. raw `signin.forms.credentials.title`) while embedded flow components first render.
  let flowMeta: FlowMetadataResponse | null = null;
  try {
    flowMeta = await getFlowMeta({
      baseUrl: config?.baseUrl,
      url: resolveResourceEndpoint('flowMeta', config),
      ...(config?.applicationId ? {id: config.applicationId, type: FlowMetaType.App} : {}),
    });
  } catch (error) {
    logger.warn('[ThunderIDServerProvider] Failed to fetch flow metadata:', error?.toString());
  }

  // Try to get session information from JWT first, then fall back to legacy
  const sessionPayload: SessionTokenPayload | undefined = await getSessionPayload();
  const sessionId: string = sessionPayload?.sessionId || (await getSessionId()) || '';
  const signedIn: boolean = await isSignedIn(sessionId);

  let user: User = {};
  let userProfile: UserProfile = {
    flattenedProfile: {},
    profile: {},
  };
  let userSchema: Record<string, AttributeSchema> | null = null;

  const resolvedPreferences = {
    ...config?.preferences,
    ..._config.preferences,
    user: {
      ...config?.preferences?.user,
      ..._config.preferences?.user,
    },
  };

  if (signedIn) {
    let updatedBaseUrl: string | undefined = config?.baseUrl;

    if (sessionPayload?.organizationId) {
      updatedBaseUrl = `${config?.baseUrl}/o`;
      config = {...config, baseUrl: updatedBaseUrl};
    } else if (sessionId) {
      try {
        const idToken: IdToken = await thunderIDClient.getDecodedIdToken(sessionId);
        if (idToken?.['user_org']) {
          updatedBaseUrl = `${config?.baseUrl}/o`;
          config = {...config, baseUrl: updatedBaseUrl};
        }
      } catch {
        // Continue without organization info
      }
    }

    // Check if user profile fetching is enabled (default: true)
    const shouldFetchUserProfile: boolean = resolvedPreferences?.user?.fetchUserProfile !== false;

    if (shouldFetchUserProfile) {
      try {
        const userResponse: {
          data: {user: User | null};
          error: string | null;
          success: boolean;
        } = await getUserAction(sessionId);
        const userProfileResponse: {
          data: {userProfile: UserProfile};
          error: string | null;
          success: boolean;
        } = await getUserProfileAction(sessionId);
        const userSchemaResponse: {
          data: {userSchema: Record<string, AttributeSchema> | null};
          error: string | null;
          success: boolean;
        } = await getUserSchemaAction(sessionId);

        user = userResponse.data?.user || {};
        userProfile = userProfileResponse.data?.userProfile ?? userProfile;
        userSchema = userSchemaResponse.data?.userSchema ?? null;
      } catch (error) {
        logger.warn('[ThunderIDServerProvider] Failed to fetch user profile from /users/me:', error?.toString());
      }
    } else {
      try {
        const decodedIdToken: IdToken = await thunderIDClient.getDecodedIdToken(sessionId);
        const claims = extractUserClaimsFromIdToken(decodedIdToken);
        user = claims;
        userProfile = {
          flattenedProfile: claims,
          profile: claims,
        };
      } catch (error) {
        logger.warn('[ThunderIDServerProvider] Failed to extract user claims from ID token:', error?.toString());
      }
    }
  }

  return (
    <ThunderIDClientProvider
      organizationHandle={config?.organizationHandle}
      applicationId={config?.applicationId}
      baseUrl={config?.baseUrl}
      endpoints={pickManagementEndpoints(config?.endpoints)}
      initialMeta={flowMeta}
      signIn={signInAction}
      clearSession={clearSession}
      refreshToken={refreshToken}
      signOut={signOutAction}
      signUp={signUpAction}
      handleOAuthCallback={handleOAuthCallbackAction}
      signInUrl={config?.signInUrl}
      signUpUrl={config?.signUpUrl}
      preferences={resolvedPreferences}
      clientId={config?.clientId}
      user={user}
      userProfile={userProfile}
      userSchema={userSchema}
      updateProfile={updateUserProfileAction}
      isSignedIn={signedIn}
    >
      {children}
    </ThunderIDClientProvider>
  );
};

export default ThunderIDServerProvider;
