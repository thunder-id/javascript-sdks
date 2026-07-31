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

import type {
  BrandingPreference,
  GetBrandingPreferenceConfig,
  IdToken,
  SPATokenExchangeConfig,
  TokenResponse,
  User,
  UserProfile,
} from '@thunderid/browser';
import type {IdTokenValidationResult} from '../validation/IdTokenValidator';
import type {ThunderIDSvelteKitConfig} from './config';

export type NavigateFn = (url: string) => void;
export type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

export interface ThunderIDContext {
  afterSignInUrl?: string;
  afterSignOutUrl?: string;
  applicationId?: string;
  baseUrl?: string;
  brandingPreference: BrandingPreference | null;
  clientId?: string;
  isInitialized: boolean;
  isLoading: boolean;
  isSignedIn: boolean;

  resolvedBaseUrl: string;
  scopes?: string | string[];
  signInUrl?: string;
  signUpUrl?: string;
  user: User | null;
  userProfile: UserProfile | null;
  locale: string;

  t: TranslateFn;

  signIn: (options?: Record<string, unknown>) => Promise<void>;
  signOut: (options?: Record<string, unknown>) => Promise<void>;
  signUp: (options?: Record<string, unknown>) => Promise<void>;

  getAccessToken: (sessionId?: string) => Promise<string>;
  getIdToken: (sessionId?: string) => Promise<string>;
  getDecodedIdToken: (sessionId?: string, idToken?: string) => Promise<IdToken>;

  getUser: (sessionId?: string) => Promise<User>;
  getUserProfile: (sessionId?: string) => Promise<UserProfile>;
  updateUserProfile: (payload: Record<string, unknown>, userId?: string) => Promise<User>;
  getUserInfo: (sessionId?: string) => Promise<User>;
  verifyIdToken: (
    idToken: string,
    options?: {
      clientId?: string;
      issuer?: string;
      clockTolerance?: number;
      validateIssuer?: boolean;
      nonce?: string;
    },
  ) => Promise<IdTokenValidationResult>;
  getBrandingPreference: (config: GetBrandingPreferenceConfig) => Promise<BrandingPreference>;
  revokeAccessToken: (userId?: string) => Promise<Response | boolean>;

  exchangeToken: (config: SPATokenExchangeConfig) => Promise<Response | User>;
  signInSilently: (options?: Record<string, unknown>) => Promise<User | boolean>;
  reInitialize: (config: Partial<ThunderIDSvelteKitConfig>) => Promise<boolean>;
  reset: () => Promise<void>;
  getConfiguration: () => ThunderIDSvelteKitConfig;
}

export interface UserContextValue {
  flattenedProfile: User | null;
  profile: UserProfile | null;
  schemas: any[] | null;
}
