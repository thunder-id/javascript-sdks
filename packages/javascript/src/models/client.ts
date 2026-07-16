/**
 * Copyright (c) 2025-2026, WSO2 LLC. (https://www.wso2.com).
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

import type {CIBAInitiateOptions, CIBAInitiateResponse, CIBAPollOptions} from './ciba';
import {SignInOptions, SignOutOptions, SignUpOptions} from './config';
import {Storage} from './store';
import {TokenExchangeRequestConfig, TokenResponse} from './token';
import {User, UserProfile} from './user';

/**
 * Interface defining the core functionality for ThunderID authentication clients.
 *
 * @example
 * ```typescript
 * class ThunderIDNodeClient implements ThunderIDClient<NodeConfig> {
 *   // Implement interface methods
 * }
 * ```
 */
export interface ThunderIDClient<T> {
  /**
   * Clears the session for the specified session ID.
   * @param sessionId - Optional session ID to clear the session for.
   */
  clearSession(sessionId?: string): void;

  /**
   * Decodes a JWT token and returns its payload.
   * @param token - The JWT token to be decoded.
   * @returns A promise that resolves to the decoded token payload.
   */
  decodeJwtToken<R = Record<string, unknown>>(token: string): Promise<R>;

  /**
   * Swaps the current access token with a new one based on the provided configuration (with a grant type).
   * @param config - Configuration for the token exchange request.
   * @param sessionId - Optional session ID to be used for the token exchange.
   */
  exchangeToken(config: TokenExchangeRequestConfig, sessionId?: string): Promise<TokenResponse | Response | User>;

  /**
   * Retrieves the access token for the current session.
   * @param sessionId - Optional session ID to retrieve the access token for a specific session.
   * @returns A promise that resolves to the access token string.
   */
  getAccessToken(sessionId?: string): Promise<string>;

  /**
   * Gets the client configuration.
   * @returns The client configuration.
   */
  getConfiguration(): T;

  /**
   * Gets user information from the session.
   *
   * @returns User object containing user details.
   */
  getUser(options?: any): Promise<User>;

  /**
   * Initiates a CIBA backchannel authentication request (CIBA Core 1.0 §7.1).
   * Exactly one of loginHint, loginHintToken, or idTokenHint must be set.
   */
  initiateCIBA(options: CIBAInitiateOptions): Promise<CIBAInitiateResponse>;

  /**
   * Polls the token endpoint until the user approves, denies, or the request expires.
   * Applies the mandatory interval increase on slow_down (CIBA Core 1.0 §7.3).
   * On approval, stores the token in the SDK session and resolves with a TokenResponse.
   *
   * @param authReqId - The auth_req_id from initiateCIBA.
   * @param interval  - Initial polling interval in seconds from initiateCIBA.
   */
  pollCIBA(authReqId: string, interval: number, options?: CIBAPollOptions): Promise<TokenResponse>;

  /**
   * Fetches the user profile along with its schemas and a flattened version of the profile.
   *
   * @returns A promise resolving to a UserProfile object containing the user's profile information.
   */
  getUserProfile(options?: any): Promise<UserProfile>;

  /**
   * Initializes the authentication client with provided configuration.
   *
   * @param config - SDK Client instance configuration options.
   * @param storage - Optional storage instance to persist data (e.g., session, user profile).
   * @returns Promise resolving to boolean indicating success.
   */
  initialize(config: T, storage?: Storage): Promise<boolean>;

  /**
   * Checks if the client is currently loading.
   * This can be used to determine if the client is in the process of initializing or fetching user data.
   *
   * @returns Boolean indicating if the client is loading.
   */
  isLoading(): boolean;

  /**
   * Checks if a user is signed in.
   * FIXME: This should be integrated with the existing isSignedIn method which returns a Promise.
   *
   * @returns Boolean indicating sign-in status.
   */
  isSignedIn(): Promise<boolean>;

  /**
   * Re-initializes the client with a new configuration.
   *
   * @remarks
   * This can be partial configuration to update only specific fields.
   *
   * @param config - New configuration to re-initialize the client with.
   * @returns Promise resolving to boolean indicating success.
   */
  reInitialize(config: Partial<T>): Promise<boolean>;

  recover(): Promise<void>;

  /**
   * Sets the session data for the specified session ID.
   * @param sessionData - The session data to be set.
   * @param sessionId - Optional session ID to set the session data for.
   */
  setSession(sessionData: Record<string, unknown>, sessionId?: string): Promise<void>;

  /**
   * Initiates the sign-in process for the user.
   *
   * @param options - Optional sign-in options like additional parameters to be sent in the authorize request, etc.
   * @param sessionId - Optional session ID to be used for sign-in.
   * @param onSignInSuccess - Callback function to be executed upon successful sign-in.
   * @returns Promise resolving the user upon successful sign in.
   */
  signIn(
    options?: SignInOptions,
    sessionId?: string,
    onSignInSuccess?: (afterSignInUrl: string) => void,
  ): Promise<User | TokenResponse | undefined>;

  /**
   * Try signing in silently in the background without any user interactions.
   *
   * @remarks This approach uses a passive auth request (prompt=none) sent from an iframe which might pose issues in cross-origin scenarios.
   * Make sure you are aware of the limitations and browser compatibility issues.
   *
   * @param options - Optional sign-in options like additional parameters to be sent in the authorize request, etc.
   * @returns A promise that resolves to the user if sign-in is successful, or false if not.
   */
  signInSilently(options?: SignInOptions): Promise<User | boolean | undefined>;

  /**
   * Signs out the currently signed-in user.
   *
   * @param options - Optional sign-out options like additional parameters to be sent in the sign-out request, etc.
   * @param afterSignOut - Callback function to be executed after sign-out is complete.
   * @returns A promise that resolves to true if sign-out is successful
   */
  signOut(options?: SignOutOptions, afterSignOut?: (afterSignOutUrl: string) => void): Promise<string | boolean>;

  /**
   * Signs out the currently signed-in user with an optional session ID.
   *
   * @param options - Optional sign-out options like additional parameters to be sent in the sign-out request, etc.
   * @param sessionId - Optional session ID to be used for sign-out.
   *                    This can be useful in scenarios where multiple sessions are managed.
   * @param afterSignOut - Callback function to be executed after sign-out is complete.
   * @returns A promise that resolves to the sign-out URL or true if sign-out is successful.
   */
  signOut(
    options?: SignOutOptions,
    sessionId?: string,
    afterSignOut?: (afterSignOutUrl: string) => void,
  ): Promise<string | boolean>;

  /**
   * Initiates the sign-up process for the user.
   *
   * @param options - Optional sign-up options like additional parameters to be sent in the sign-up request, etc.
   * @returns Promise resolving when sign-up is complete.
   */
  signUp(options?: SignUpOptions): Promise<void>;

  /**
   * Updates the user profile with the provided payload.
   * @param payload - The new user profile data.
   * @param userId - Optional user ID to specify which user's profile to update.
   */
  updateUserProfile(payload: any, userId?: string): Promise<User>;
}
