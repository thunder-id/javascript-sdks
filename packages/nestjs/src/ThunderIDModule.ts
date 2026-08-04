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

import {DynamicModule, Module} from '@nestjs/common';
import {THUNDERID_CONFIG} from './constants/InjectionTokens';
import ThunderIDGuard from './guards/ThunderIDGuard';
import {ThunderIDNestConfig} from './models/config';
import ThunderIDService from './ThunderIDService';

/**
 * ThunderID module for NestJS. Register once in the root module:
 *
 * ```ts
 * @Module({
 *   imports: [
 *     ThunderIDModule.forRoot({
 *       clientId: process.env.THUNDERID_CLIENT_ID,
 *       baseUrl: process.env.THUNDERID_BASE_URL,
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * The module is global — `ThunderIDService` and `ThunderIDGuard` are
 * injectable everywhere without re-importing.
 */
@Module({})
class ThunderIDModule {
  public static forRoot(config: ThunderIDNestConfig): DynamicModule {
    return {
      exports: [ThunderIDService, ThunderIDGuard],
      global: true,
      module: ThunderIDModule,
      providers: [{provide: THUNDERID_CONFIG, useValue: config}, ThunderIDService, ThunderIDGuard],
    };
  }
}

export default ThunderIDModule;
