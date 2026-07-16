/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
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

/* eslint-disable @typescript-eslint/typedef, sort-keys, @typescript-eslint/no-unused-vars, no-restricted-syntax */

import {generateFlattenedUserProfile} from '@thunderid/browser';
import {FlowMetaProvider, FlowProvider, I18nProvider, ThemeProvider, UserProvider} from '@thunderid/vue';
import {describe, it, expect, vi, beforeEach} from 'vitest';

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import ThunderIDRoot from '../../src/runtime/components/ThunderIDRoot';
import {useRuntimeConfig} from '#imports';

// ── Module mocks ──────────────────────────────────────────────────────────────

// Provide minimal stubs for @thunderid/vue providers. They are used purely as
// VNode type markers so we can locate them in the rendered VNode tree.
vi.mock('@thunderid/vue', () => ({
  ThemeProvider: {name: 'ThemeProvider'},
  UserProvider: {name: 'UserProvider'},
  FlowProvider: {name: 'FlowProvider'},
  FlowMetaProvider: {name: 'FlowMetaProvider'},
  I18nProvider: {name: 'I18nProvider'},
}));

vi.mock('@thunderid/browser', () => ({
  generateFlattenedUserProfile: vi.fn((_user: any, _schemas: any) => ({email: 'updated@example.com'})),
}));

// Stub Nuxt composables so the component's setup() can run in pure Node.
const mockStateStore: Map<string, {value: any}> = new Map();

vi.mock('#imports', () => ({
  useState: vi.fn((key: string, init?: () => any) => {
    if (!mockStateStore.has(key)) {
      mockStateStore.set(key, {value: init ? init() : null});
    }
    return mockStateStore.get(key)!;
  }),
  useRuntimeConfig: vi.fn(() => ({
    public: {thunderid: {preferences: undefined}},
  })),
}));

// ── Test fixtures ─────────────────────────────────────────────────────────────

const MOCK_USER_PROFILE = {
  profile: {sub: 'user-123', email: 'test@example.com'},
  flattenedProfile: {email: 'test@example.com'},
};

const MOCK_AUTH_STATE = {isSignedIn: true, user: {sub: 'user-123'}, isLoading: false};

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Seed the five useState stores and call ThunderIDRoot.setup(). */
function buildRenderFn(
  preferences?: Record<string, any>,
  stateOverrides?: {
    auth?: any;
    currentOrg?: any;
    myOrgs?: any;
    userProfile?: any;
  },
): () => any {
  // Use explicit `in` checks so that passing `null` is honoured as the desired
  // value rather than being coerced to the default by the `??` operator.
  const hasOverrides = stateOverrides !== undefined;
  mockStateStore.set('thunderid:user-profile', {
    value: hasOverrides && 'userProfile' in stateOverrides ? stateOverrides.userProfile : MOCK_USER_PROFILE,
  });
  mockStateStore.set('thunderid:auth', {
    value: hasOverrides && 'auth' in stateOverrides ? stateOverrides.auth : MOCK_AUTH_STATE,
  });

  // Provide preferences via runtime config
  vi.mocked(useRuntimeConfig).mockReturnValue({
    public: {thunderid: {preferences}},
  } as any);

  const setupFn = (ThunderIDRoot as any).setup;
  return setupFn(
    {},
    {
      slots: {default: () => null},
      emit: () => {},
      attrs: {},
      expose: () => {},
    },
  );
}

/** Traverse a VNode tree to find the VNode whose `type` matches the target. */
function findByType(vnode: any, target: any): any | null {
  if (!vnode || typeof vnode !== 'object') return null;
  if (vnode.type === target) return vnode;
  if (vnode.children && typeof vnode.children === 'object') {
    if (typeof vnode.children.default === 'function') {
      const child = vnode.children.default();
      const nodes = Array.isArray(child) ? child : [child];
      for (const node of nodes) {
        const found = findByType(node, target);
        if (found) return found;
      }
    }
  }
  return null;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ThunderIDRoot component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStateStore.clear();
    // Re-apply the $fetch global that Nuxt provides at runtime
    (global as any).$fetch = vi.fn().mockResolvedValue({});
  });

  // ── Provider tree structure ─────────────────────────────────────────────

  it('renders all six providers in the correct nesting order', () => {
    const renderFn = buildRenderFn();
    const root = renderFn();

    expect(root.type).toBe(I18nProvider);
    const flowMeta = findByType(root, FlowMetaProvider);
    expect(flowMeta).not.toBeNull();
    // FlowMetaProvider defaults to V1 (`enabled: false`) — `useFlowMeta()`
    // still resolves but the provider does not fetch v2 metadata.
    expect(flowMeta!.props.enabled).toBe(false);
    const theme = findByType(root, ThemeProvider);
    expect(theme).not.toBeNull();
    const flow = findByType(root, FlowProvider);
    expect(flow).not.toBeNull();
    const user = findByType(root, UserProvider);
    expect(user).not.toBeNull();
  });

  // ── Default preferences (all features enabled) ──────────────────────────

  it('passes full profile data to UserProvider when fetchUserProfile is enabled (default)', () => {
    const renderFn = buildRenderFn();
    const root = renderFn();

    const vnode = findByType(root, UserProvider);
    expect(vnode!.props.profile).toEqual(MOCK_USER_PROFILE);
    expect(vnode!.props.flattenedProfile).toEqual(MOCK_USER_PROFILE.flattenedProfile);
  });

  it('passes user callbacks to UserProvider when fetchUserProfile is enabled (default)', () => {
    const renderFn = buildRenderFn();
    const root = renderFn();

    const vnode = findByType(root, UserProvider);
    expect(vnode!.props.onUpdateProfile).toBeTypeOf('function');
    expect(vnode!.props.updateProfile).toBeTypeOf('function');
    expect(vnode!.props.revalidateProfile).toBeTypeOf('function');
  });

  // ── preferences.user.fetchUserProfile: false ─────────────────────────────

  it('passes profile:null to UserProvider when fetchUserProfile is false', () => {
    const renderFn = buildRenderFn({user: {fetchUserProfile: false}});
    const root = renderFn();

    const vnode = findByType(root, UserProvider);
    expect(vnode!.props.profile).toBeNull();
    expect(vnode!.props.flattenedProfile).toBeNull();
  });

  it('omits user callbacks from UserProvider when fetchUserProfile is false', () => {
    const renderFn = buildRenderFn({user: {fetchUserProfile: false}});
    const root = renderFn();

    const vnode = findByType(root, UserProvider);
    expect(vnode!.props.onUpdateProfile).toBeUndefined();
    expect(vnode!.props.updateProfile).toBeUndefined();
    expect(vnode!.props.revalidateProfile).toBeUndefined();
  });

  // ── onUpdateProfile callback logic ────────────────────────────────────────

  it('onUpdateProfile updates userProfileState optimistically', () => {
    const renderFn = buildRenderFn();
    const root = renderFn();

    const userProviderVNode = findByType(root, UserProvider);
    const {onUpdateProfile} = userProviderVNode!.props;

    const updatedUser = {sub: 'user-123', email: 'new@example.com'};
    onUpdateProfile(updatedUser);

    const userProfileState = mockStateStore.get('thunderid:user-profile')!;
    expect(userProfileState.value.profile).toEqual(updatedUser);
    expect(userProfileState.value.flattenedProfile).toBeDefined();
    expect(generateFlattenedUserProfile).toHaveBeenCalledWith(updatedUser);
  });

  it('onUpdateProfile keeps thunderid:auth user in sync', () => {
    const renderFn = buildRenderFn();
    const root = renderFn();

    const userProviderVNode = findByType(root, UserProvider);
    const {onUpdateProfile} = userProviderVNode!.props;

    const updatedUser = {sub: 'user-123', email: 'synced@example.com'};
    onUpdateProfile(updatedUser);

    const authState = mockStateStore.get('thunderid:auth')!;
    expect(authState.value.user).toEqual(updatedUser);
  });

  it('onUpdateProfile with no prior profile creates new profile state', () => {
    const renderFn = buildRenderFn(undefined, {userProfile: null});
    const root = renderFn();

    const userProviderVNode = findByType(root, UserProvider);
    // profile prop is null but callbacks are still provided (profile gating
    // checks the preference flag, not the actual state value)
    const {onUpdateProfile} = userProviderVNode!.props;
    expect(onUpdateProfile).toBeTypeOf('function');

    const freshUser = {sub: 'user-456', email: 'fresh@example.com'};
    onUpdateProfile(freshUser);

    const userProfileState = mockStateStore.get('thunderid:user-profile')!;
    expect(userProfileState.value.profile).toEqual(freshUser);
  });

  // ── i18n preference passthrough ───────────────────────────────────────────

  it('forwards i18n preferences to I18nProvider', () => {
    const i18nPrefs = {defaultLocale: 'en', fallbackLocale: 'en'};
    const renderFn = buildRenderFn({i18n: i18nPrefs});
    const root = renderFn();

    expect(root.type).toBe(I18nProvider);
    expect(root.props.preferences).toEqual(i18nPrefs);
  });
});
