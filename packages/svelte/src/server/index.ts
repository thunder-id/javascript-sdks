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

export {resolveConfig} from './config';
export {createThunderIDHandle} from './hooks';
export {loadThunderID} from './load';
export {getClient, resetClient} from './getClient';
export {
  createSessionToken,
  createTempSessionToken,
  verifySessionToken,
  verifyTempSessionToken,
  issueSessionCookie,
  getSessionCookieName,
  getTempSessionCookieName,
  getSessionCookieOptions,
  getTempSessionCookieOptions,
} from './session';
export {maybeRefreshToken, getValidAccessToken} from './refresh';
export {requireServerSession} from './guard';
export {createSignInHandler, createCallbackHandler, createSignOutHandler, createOrgSwitchHandler} from './routes';
