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

// Module
export {default as ThunderIDModule} from './ThunderIDModule';

// Service
export {default as ThunderIDService} from './ThunderIDService';

// Guards
export {default as ThunderIDGuard} from './guards/ThunderIDGuard';

// Decorators
export {default as CurrentUser} from './decorators/CurrentUser';

// Models
export type {ThunderIDNestConfig, ThunderIDRequest} from './models/config';

// Constants
export {THUNDERID_CONFIG} from './constants/InjectionTokens';

// Re-export everything from the Express SDK (includes the Node and JavaScript SDK re-exports)
export * from '@thunderid/express';
