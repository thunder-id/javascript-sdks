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

import type {RequestEvent} from '@sveltejs/kit';
import {describe, it, expect, vi, beforeEach} from 'vitest';
import type {ThunderIDSSRData} from '../../models/session';

const mockRedirect = vi.fn();
vi.mock('@sveltejs/kit', () => ({
  redirect: mockRedirect,
}));

const {requireServerSession} = await import('../guard');

function createMockEvent(ssrData: ThunderIDSSRData | undefined): RequestEvent {
  return {locals: {thunderid: ssrData}} as unknown as RequestEvent;
}

describe('requireServerSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return SSR data when signed in', () => {
    const ssrData: ThunderIDSSRData = {
      brandingPreference: null,
      isSignedIn: true,
      myOrganizations: [],
      organization: null,
      resolvedBaseUrl: null,
      session: null,
      user: {id: 'u1'} as any,
      userProfile: null,
    };

    const result = requireServerSession(createMockEvent(ssrData));
    expect(result).toBe(ssrData);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('should throw redirect when not signed in', () => {
    const ssrData: ThunderIDSSRData = {
      brandingPreference: null,
      isSignedIn: false,
      myOrganizations: [],
      organization: null,
      resolvedBaseUrl: null,
      session: null,
      user: null,
      userProfile: null,
    };

    mockRedirect.mockImplementation(() => {
      throw new Error('redirect thrown');
    });

    expect(() => requireServerSession(createMockEvent(ssrData))).toThrow('redirect thrown');
    expect(mockRedirect).toHaveBeenCalledWith(307, '/api/auth/signin');
  });

  it('should throw redirect with custom redirectTo', () => {
    const ssrData: ThunderIDSSRData = {
      brandingPreference: null,
      isSignedIn: false,
      myOrganizations: [],
      organization: null,
      resolvedBaseUrl: null,
      session: null,
      user: null,
      userProfile: null,
    };

    mockRedirect.mockImplementation(() => {
      throw new Error('redirect thrown');
    });

    expect(() => requireServerSession(createMockEvent(ssrData), '/custom/signin')).toThrow('redirect thrown');
    expect(mockRedirect).toHaveBeenCalledWith(307, '/custom/signin');
  });

  it('should throw redirect when SSR data is undefined', () => {
    mockRedirect.mockImplementation(() => {
      throw new Error('redirect thrown');
    });

    const event = {locals: {}} as RequestEvent;
    expect(() => requireServerSession(event)).toThrow('redirect thrown');
  });
});
