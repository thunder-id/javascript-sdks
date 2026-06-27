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
  AllOrganizationsApiResponse,
  HttpRequestConfig,
  HttpResponse,
  IdToken,
  Organization,
  SignInOptions,
  StorageManager,
  TokenExchangeRequestConfig,
  TokenResponse,
  User,
  UserProfile,
} from '@thunderid/browser';
import type {ThunderIDSvelteConfig} from './config';
import type ThunderIDSvelteClient from '../ThunderIDSvelteClient';

export interface ThunderIDContext {
  afterSignInUrl: string | undefined;
  applicationId: string | undefined;
  baseUrl: string | undefined;
  clearSession: (...args: any[]) => void;
  clientId: string | undefined;
  scopes: string | string[] | undefined;

  exchangeToken: (config: TokenExchangeRequestConfig) => Promise<TokenResponse | Response>;
  getAccessToken: () => Promise<string>;
  getDecodedIdToken: () => Promise<IdToken>;
  getIdToken: () => Promise<string>;
  getStorageManager: () => StorageManager<any>;
  http: {
    request: (requestConfig?: HttpRequestConfig) => Promise<HttpResponse<any>>;
    requestAll: (requestConfigs?: HttpRequestConfig[]) => Promise<HttpResponse<any>[]>;
  };

  instanceId: number;
  isInitialized: boolean;
  isLoading: boolean;
  isSignedIn: boolean;

  organization: Organization | null;
  organizationHandle: string | undefined;

  reInitialize: (config: Partial<ThunderIDSvelteConfig>) => Promise<boolean>;

  signIn: (...args: any[]) => Promise<any>;
  signInOptions: SignInOptions | undefined;
  signInSilently: (options?: SignInOptions) => Promise<any>;
  signInUrl: string | undefined;
  signOut: (...args: any[]) => Promise<any>;
  signUp: (...args: any[]) => Promise<any>;
  signUpUrl: string | undefined;
  storage: ThunderIDSvelteConfig['storage'] | undefined;

  switchOrganization: ThunderIDSvelteClient['switchOrganization'];

  user: User | null;
  userProfile: UserProfile | null;
}

export interface UserContextValue {
  flattenedProfile: User | null;
  onUpdateProfile: (payload: User) => void;
  profile: UserProfile | null;
  revalidateProfile: () => Promise<void>;
  schemas: any[] | null;
  updateProfile: (requestConfig: any, sessionId?: string) => Promise<any>;
}
