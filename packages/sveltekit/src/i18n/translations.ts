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

import type {I18nPreferences} from '../models/config';

export type TranslationBundle = Record<string, string>;

export interface TranslationBundles {
  [locale: string]: TranslationBundle;
}

export const DEFAULT_BUNDLES: TranslationBundles = {
  en: {
    'signIn.button': 'Sign In',
    'signIn.loading': 'Signing in...',
    'signIn.title': 'Sign In',
    'signIn.error': 'Sign in failed: {{error}}',
    'signOut.button': 'Sign Out',
    'signOut.loading': 'Signing out...',
    'signUp.button': 'Sign Up',
    'signUp.loading': 'Redirecting...',
    'signUp.title': 'Create Account',
    'signUp.error': 'Sign up failed: {{error}}',
    'user.notSignedIn': 'Not signed in',
    'user.displayName': 'User',
    'userProfile.empty': 'No user profile available.',
    'callback.signingIn': 'Signing you in...',
    'callback.signedIn': 'Signed in successfully! Redirecting...',
    'callback.signInFailed': 'Sign-in failed: {{error}}',
    'callback.noCode': 'No authorization code received.',
    'acceptInvite.title': 'Accept Invitation',
    'acceptInvite.button': 'Accept Invitation',
    'acceptInvite.loading': 'Accepting...',
    'inviteUser.title': 'Invite User',
    'inviteUser.button': 'Send Invitation',
    'inviteUser.loading': 'Sending...',
    'inviteUser.emailPlaceholder': 'email@example.com',
    'userDropdown.signOut': 'Sign Out',
  },
};

export function createTranslator(preferences?: I18nPreferences): (key: string, params?: Record<string, string | number>) => string {
  const lang = preferences?.language ?? 'en';
  const fallback = preferences?.fallbackLanguage ?? 'en';
  const userBundles = preferences?.bundles ?? {};
  const mergedBundles: TranslationBundles = {};

  for (const locale of new Set([...Object.keys(DEFAULT_BUNDLES), ...Object.keys(userBundles)])) {
    mergedBundles[locale] = {...DEFAULT_BUNDLES[locale], ...userBundles[locale]};
  }

  return (key: string, params?: Record<string, string | number>): string => {
    let text = mergedBundles[lang]?.[key] ?? mergedBundles[fallback]?.[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{{${k}}}`, String(v));
      }
    }
    return text;
  };
}
