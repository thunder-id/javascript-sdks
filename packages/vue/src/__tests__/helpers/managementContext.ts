// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {createResourceInvalidator} from '@thunderid/browser';
import {getDefaultI18nBundles, substituteTranslationParams} from '@thunderid/browser';
import {type Mock, vi} from 'vitest';
import {ref} from 'vue';
import {I18N_KEY, THUNDERID_KEY, USER_KEY} from '../../keys';

/** A JSON `Response` stand-in, as the core management API functions read it. */
export const jsonResponse = (data: unknown, status = 200): Response =>
  ({
    json: () => Promise.resolve(data),
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    text: () => Promise.resolve(JSON.stringify(data)),
  }) as Response;

/** The transport the management composables call, mocked. */
export type MockFetcher = Mock<(url: string, init: RequestInit) => Promise<Response>>;

export const translate = (key: string, params?: Record<string, string | number>): string => {
  const translations = getDefaultI18nBundles()['en-US']?.translations as unknown as Record<string, string>;
  const value: string = translations?.[key] ?? key;

  return params ? substituteTranslationParams(value, params) : value;
};

/** The injected contexts, plus handles on the mocks a test asserts on. */
export interface ManagementTestContext {
  fetcher: MockFetcher;
  provide: Record<symbol, unknown>;
  thunderID: {getAccessToken: Mock<() => Promise<string>>};
}

/**
 * Builds the injected contexts the management composables and admin components read, with a mock
 * `fetcher` standing in for the network.
 */
export const createManagementContext = ({
  endpoints,
  fetcher = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(),
  isSignedIn = true,
  accessToken = 'token',
}: {
  accessToken?: string;
  endpoints?: Record<string, string>;
  fetcher?: MockFetcher;
  isSignedIn?: boolean;
} = {}): ManagementTestContext => {
  const thunderID = {
    baseUrl: 'https://thunder.example',
    endpoints,
    getAccessToken: vi.fn(() => Promise.resolve(accessToken)),
    http: {fetcher, request: vi.fn(), requestAll: vi.fn()},
    instanceId: 0,
    invalidator: createResourceInvalidator(),
    isSignedIn: ref(isSignedIn),
  };
  const i18n = {
    bundles: ref({}),
    currentLanguage: ref('en-US'),
    fallbackLanguage: 'en-US',
    injectBundles: vi.fn(),
    setLanguage: vi.fn(),
    t: translate,
  };
  const user = {
    flattenedProfile: ref({ouId: 'ou-1'}),
    onUpdateProfile: vi.fn(),
    profile: ref(null),
    revalidateProfile: vi.fn(),
  };

  return {
    fetcher,
    provide: {
      [I18N_KEY as symbol]: i18n,
      [THUNDERID_KEY as symbol]: thunderID,
      [USER_KEY as symbol]: user,
    },
    thunderID,
  };
};
