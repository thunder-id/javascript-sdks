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

import type {BrandingPreference, Organization, User, UserProfile} from '@thunderid/node';

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
  myOrganizations: Organization[];
  organization: Organization | null;
  organizationHandle?: string;
  resolvedBaseUrl: string;
  scopes?: string | string[];
  signInUrl?: string;
  signUpUrl?: string;
  user: User | null;
  userProfile: UserProfile | null;

  signIn: (...args: any[]) => Promise<any>;
  signOut: (...args: any[]) => Promise<any>;
  signUp: (...args: any[]) => Promise<any>;
}

export interface UserContextValue {
  flattenedProfile: User | null;
  profile: UserProfile | null;
  schemas: any[] | null;
}
