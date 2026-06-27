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

export interface ThunderIDSvelteConfig {
  /** URL to redirect to after sign-in (default: '/') */
  afterSignInUrl?: string;
  /** URL to redirect to after sign-out (default: '/') */
  afterSignOutUrl?: string;
  /**
   * ThunderID application id (`spId`) — appended to the redirect-based sign-up
   * URL when present.
   */
  applicationId?: string;
  /** Base URL of the ThunderID org tenant (e.g. https://localhost:8090) */
  baseUrl?: string;
  /** OAuth2 Client ID */
  clientId?: string;
  /** OAuth2 Client Secret (server-only, use THUNDERID_CLIENT_SECRET env var) */
  clientSecret?: string;
  /** The auth method to use for the token request. */
  enablePKCE?: boolean;
  /** OAuth2 scopes to request */
  scopes?: string | string[];
  /** Secret for signing session JWTs (use THUNDERID_SESSION_SECRET env var) */
  sessionSecret?: string;
  /** Custom sign-in URL (overrides the default authorize endpoint URL) */
  signInUrl?: string;
  /** Custom sign-up URL */
  signUpUrl?: string;
  /** Controls which server-side data fetches to perform on every SSR request */
  preferences?: {
    user?: {
      /** Whether to fetch the user's organizations during SSR (default: true) */
      fetchOrganizations?: boolean;
      /** Whether to fetch the SCIM2 user profile during SSR (default: true) */
      fetchUserProfile?: boolean;
    };
  };
}
