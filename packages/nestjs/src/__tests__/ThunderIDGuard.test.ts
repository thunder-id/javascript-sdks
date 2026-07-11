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

import 'reflect-metadata';
import {ExecutionContext, UnauthorizedException} from '@nestjs/common';
import {User} from '@thunderid/express';
import {describe, expect, it, vi} from 'vitest';
import ThunderIDGuard from '../guards/ThunderIDGuard';
import {ThunderIDNestConfig, ThunderIDRequest} from '../models/config';
import ThunderIDModule from '../ThunderIDModule';
import ThunderIDService from '../ThunderIDService';

const contextFor = (req: Partial<ThunderIDRequest>): ExecutionContext =>
  ({
    switchToHttp: () => ({getRequest: () => req}),
  }) as unknown as ExecutionContext;

describe('ThunderIDGuard', () => {
  it('rejects unauthenticated requests with UnauthorizedException', async () => {
    const service = {getUser: vi.fn(), isSignedIn: vi.fn().mockResolvedValue(false)} as unknown as ThunderIDService;
    const guard = new ThunderIDGuard(service);

    await expect(guard.canActivate(contextFor({}))).rejects.toThrow(UnauthorizedException);
  });

  it('allows authenticated requests and attaches the user', async () => {
    const user = {id: 'user-1'} as unknown as User;
    const service = {
      getUser: vi.fn().mockResolvedValue(user),
      isSignedIn: vi.fn().mockResolvedValue(true),
    } as unknown as ThunderIDService;
    const guard = new ThunderIDGuard(service);
    const req: Partial<ThunderIDRequest> = {};

    await expect(guard.canActivate(contextFor(req))).resolves.toBe(true);
    expect(req.thunderIDUser).toBe(user);
  });
});

describe('ThunderIDService.isSignOutSuccess', () => {
  it('handles string, array, and missing state query values', () => {
    const service = Object.create(ThunderIDService.prototype) as ThunderIDService;
    const requestWithState = (state: unknown): ThunderIDRequest => ({query: {state}}) as unknown as ThunderIDRequest;

    expect(service.isSignOutSuccess(requestWithState('sign_out_success'))).toBe(true);
    expect(service.isSignOutSuccess(requestWithState(['sign_out_success', 'other']))).toBe(false);
    expect(service.isSignOutSuccess(requestWithState(undefined))).toBe(false);
  });
});

describe('ThunderIDModule', () => {
  it('forRoot registers the config provider, service, and guard globally', () => {
    const config = {clientId: 'client-1'} as unknown as ThunderIDNestConfig;
    const dynamicModule = ThunderIDModule.forRoot(config);

    expect(dynamicModule.global).toBe(true);
    expect(dynamicModule.providers).toContainEqual({provide: 'THUNDERID_CONFIG', useValue: config});
    expect(dynamicModule.providers).toContain(ThunderIDService);
    expect(dynamicModule.providers).toContain(ThunderIDGuard);
  });
});
