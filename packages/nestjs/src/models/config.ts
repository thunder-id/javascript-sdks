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

import {ThunderIDNodeConfig, User} from '@thunderid/express';
import type express from 'express';

/**
 * Configuration type for the ThunderID NestJS SDK.
 *
 * `afterSignInUrl` and `afterSignOutUrl` are optional. When omitted, the SDK
 * infers them from the first incoming request's origin combined with
 * `/login` and `/logout` respectively.
 *
 * Unlike the Express SDK, response handling hooks (`onSignIn`, `onError`, …)
 * are not part of the config — in NestJS the controller that calls
 * `ThunderIDService` decides how to respond.
 */
export type ThunderIDNestConfig = ThunderIDNodeConfig;

/**
 * Express request extended with the ThunderID user attached by `ThunderIDGuard`.
 */
export interface ThunderIDRequest extends express.Request {
  /** Authenticated user attached by `ThunderIDGuard`; read it with `@CurrentUser()`. */
  thunderIDUser?: User;
}
