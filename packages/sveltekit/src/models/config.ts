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

import type {OAuthResponseMode} from '@thunderid/browser';
import type {SessionCookieConfig} from '@thunderid/node';
import type {HTTPAdapter} from '../adapters/HTTPAdapter';
export interface ThemePreferences {
  mode?: string;
  direction?: 'ltr' | 'rtl';
  inheritFromBranding?: boolean;
  overrides?: Record<string, any>;
}

export interface I18nPreferences {
  language?: string;
  fallbackLanguage?: string;
  bundles?: Record<string, any>;
  storageStrategy?: 'cookie' | 'localStorage' | 'none';
  storageKey?: string;
  cookieDomain?: string;
  urlParam?: string | false;
}

export interface ThunderIDSveltePreferences {
  theme?: ThemePreferences;
  i18n?: I18nPreferences;
  resolveFromMeta?: boolean;
  user?: {
    fetchUserProfile?: boolean;
  };
}

export interface ThunderIDSvelteKitConfig {
  afterSignInUrl?: string;
  afterSignOutUrl?: string;
  allowedExternalUrls?: string[];
  applicationId?: string;
  organizationHandle?: string;
  baseUrl?: string;
  clientId?: string;
  clientSecret?: string;
  discovery?: {
    wellKnown?: {
      enabled?: boolean;
    };
  };
  endpoints?: {
    authorization?: string;
    endSession?: string;
    introspection?: string;
    jwks?: string;
    token?: string;
    userInfo?: string;
    wellKnown?: string;
  };
  instanceId?: number;
  mode?: 'redirect' | 'embedded';

  platform?: string;
  preferences?: ThunderIDSveltePreferences;
  prompt?: string;
  responseMode?: OAuthResponseMode;
  scopes?: string | string[];
  sendCookiesInRequests?: boolean;
  sendIdTokenInLogoutRequest?: boolean;
  sessionCookie?: SessionCookieConfig;
  sessionSecret?: string;
  signInOptions?: Record<string, any>;
  signInUrl?: string;
  signOutOptions?: Record<string, unknown>;
  signUpOptions?: Record<string, unknown>;
  signUpUrl?: string;
  forgotPasswordUrl?: string;
  forgotUsernameUrl?: string;
  changePasswordUrl?: string;
  /** Custom storage backend. Pass a StorageAdapter implementation. */
  storage?: unknown;
  httpAdapter?: HTTPAdapter;
  syncSession?: boolean;
  tokenLifecycle?: {
    refreshToken?: {
      autoRefresh?: boolean;
    };
  };
  tokenRequest?: {
    authMethod?: 'client_secret_basic' | 'client_secret_post' | 'private_key_jwt' | 'none';
    params?: Record<string, unknown>;
  };
  tokenValidation?: {
    idToken?: {
      clockTolerance?: number;
      validate?: boolean;
      validateIssuer?: boolean;
    };
  };
}
