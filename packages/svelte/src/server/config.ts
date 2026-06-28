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

import type {ThunderIDSvelteConfig} from '../models/config';

export function resolveConfig(config?: ThunderIDSvelteConfig): ThunderIDSvelteConfig {
  return {
    afterSignInUrl: config?.afterSignInUrl ?? '/',
    afterSignOutUrl: config?.afterSignOutUrl ?? '/',
    baseUrl: config?.baseUrl || process.env['THUNDERID_BASE_URL'],
    clientId: config?.clientId || process.env['THUNDERID_CLIENT_ID'],
    clientSecret: config?.clientSecret || process.env['THUNDERID_CLIENT_SECRET'],
    enablePKCE: config?.enablePKCE ?? true,
    scopes: config?.scopes ?? ['openid', 'profile'],
    sessionSecret: config?.sessionSecret || process.env['THUNDERID_SESSION_SECRET'],
    tokenRequest: config?.tokenRequest ?? {authMethod: 'client_secret_post'},
    signInUrl: config?.signInUrl,
    signUpUrl: config?.signUpUrl,
    applicationId: config?.applicationId,
    preferences: config?.preferences,
  };
}
