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

import {generateFlattenedUserProfile} from '@thunderid/browser';
import type {UpdateMeProfileConfig, User, UserProfile} from '@thunderid/node';
import {FlowMetaProvider, FlowProvider, I18nProvider, ThemeProvider, UserProvider} from '@thunderid/vue';
import {defineComponent, h, type Component, type Ref, type SetupContext, type VNode} from 'vue';
import type {ThunderIDAuthState, ThunderIDNuxtConfig} from '../types';
import {getAuthStateKey, getUserProfileStateKey} from '../utils/stateKeys';
import {useState, useRuntimeConfig} from '#imports';

/**
 * Nuxt root wrapper that mounts the full ThunderID Vue provider tree.
 *
 * Mirrors `ThunderIDClientProvider` in the Next.js SDK — reads the SSR-hydrated
 * `useState` keys written by the universal Nuxt plugin and passes the resolved
 * data as props to each Vue provider:
 *
 * - {@link I18nProvider}      ← `preferences.i18n`
 * - {@link ThemeProvider}     ← `mode`
 * - {@link FlowProvider}
 * - {@link UserProvider}      ← `profile`, `flattenedProfile`, `schemas`,
 *                               `updateProfile`, `revalidateProfile`, `onUpdateProfile`
 *
 * The `THUNDERID_KEY` (config + auth state + actions) is still provided at the
 * app level by the Nuxt plugin; this component only supplies the auxiliary
 * provider contexts so downstream composables (`useUser`, `useTheme`,
 * `useThunderIDI18n`) receive real data.
 *
 * @example
 * ```vue
 * <!-- app.vue -->
 * <template>
 *   <ThunderIDRoot>
 *     <NuxtPage />
 *   </ThunderIDRoot>
 * </template>
 * ```
 */
const ThunderIDRoot: Component = defineComponent({
  name: 'ThunderIDRoot',
  setup(_props: Record<string, unknown>, {slots}: SetupContext): () => VNode {
    // ── Vendor namespace from runtime config ────────────────────────────────
    // Must resolve the same `vendor` as `runtime/plugins/thunderid.ts` and
    // `runtime/middleware/defineThunderIDMiddleware.ts` so all three read/write
    // the same `useState` keys.
    const runtimeThunderIDConfig: {
      preferences?: ThunderIDNuxtConfig['preferences'];
      vendor?: string;
    } = useRuntimeConfig().public.thunderid as {
      preferences?: ThunderIDNuxtConfig['preferences'];
      vendor?: string;
    };
    const vendor: string | undefined = runtimeThunderIDConfig?.vendor;

    // ── Read SSR-hydrated state keys (seeded by the Nuxt plugin) ────────────
    const userProfileState: Ref<UserProfile | null> = useState<UserProfile | null>(getUserProfileStateKey(vendor));
    // Used by onUpdateProfile to keep the top-level auth user claim in sync.
    const authState: Ref<ThunderIDAuthState> = useState<ThunderIDAuthState>(getAuthStateKey(vendor));

    // ── Preferences from runtime config ────────────────────────────────────
    const prefs: ThunderIDNuxtConfig['preferences'] | undefined = runtimeThunderIDConfig?.preferences;

    // Gate flags — mirror the same checks in thunderid-ssr.ts so client props
    // always agree with what the Nitro plugin decided to fetch server-side.
    const shouldFetchProfile: boolean = prefs?.user?.fetchUserProfile !== false;
    // Defaults to 'light' — matches the Vue SDK's ThunderIDProvider, which
    // passes no mode and therefore uses ThemeProvider's `DEFAULT_THEME`.
    const themeMode: string = prefs?.theme?.mode ?? 'light';

    // ── Callbacks ──────────────────────────────────────────────────────────

    /**
     * Optimistic local update — mirrors `handleProfileUpdate` in
     * `ThunderIDClientProvider` (Next.js). Keeps reactive state fresh after a
     * successful SCIM2 PATCH without an extra server round-trip.
     */
    const onUpdateProfile = (payload: User): void => {
      const prev: UserProfile | null = userProfileState.value;
      userProfileState.value = prev
        ? {
            ...prev,
            flattenedProfile: generateFlattenedUserProfile(payload, prev.schemas),
            profile: payload,
          }
        : {
            flattenedProfile: generateFlattenedUserProfile(payload, []),
            profile: payload,
            schemas: [],
          };
      // Keep THUNDERID_KEY `user` ref in sync so `useThunderID().user` reflects
      // the update immediately.
      authState.value = {...authState.value, user: payload};
    };

    /**
     * SCIM2 PATCH via the `/api/auth/user/profile` Nitro route.
     * Signature matches `UserProvider.updateProfile` exactly.
     *
     * On success, applies an optimistic local update via `onUpdateProfile`
     * so consumers of `useUser()` (e.g. `<ThunderIDUserProfile>`) and
     * `useThunderID().user` (e.g. `<ThunderIDUser>`) reflect the new value
     * without waiting for the next navigation/SSR refetch.
     */
    const updateProfile = async (
      requestConfig: UpdateMeProfileConfig,
      _sessionId?: string,
    ): Promise<{data: {user: User}; error: string; success: boolean}> => {
      if (_sessionId) {
        // no-op: session is resolved server-side
      }
      try {
        const result: {data: {user: User}; error: string; success: boolean} = await $fetch('/api/auth/user/profile', {
          body: requestConfig,
          method: 'PATCH',
        });
        if (result?.success && result.data?.user) {
          onUpdateProfile(result.data.user);
        }
        return result;
      } catch (err) {
        return {data: {user: {} as User}, error: String(err), success: false};
      }
    };

    /**
     * Re-fetch the full user profile from `/api/auth/user/profile`.
     */
    const revalidateProfile = async (): Promise<void> => {
      try {
        const res: UserProfile = await $fetch<UserProfile>('/api/auth/user/profile');
        if (res) userProfileState.value = res;
      } catch {
        // Non-fatal — profile stays stale until the next navigation.
      }
    };

    // ── Render tree — mirrors ThunderIDClientProvider (Next.js) ─────────────
    //
    // FlowMetaProvider is mounted unconditionally with `enabled: false` (V1
    // platform default). It still provides `FLOW_META_KEY` to descendants so
    // `useFlowMeta()` (called by `BaseSignUp`, v2 `BaseSignIn`,
    // `BaseAcceptInvite`, `BaseInviteUser`) returns a real context with
    // `meta: null` instead of throwing. When the Nuxt SDK gains a `platform`
    // config option, derive `enabled` from it the same way `ThunderIDProvider`
    // does (`enabled: platform === Platform.ThunderID`).
    return (): VNode =>
      h(
        I18nProvider,
        {preferences: prefs?.i18n},
        {
          default: (): VNode =>
            h(
              FlowMetaProvider,
              {enabled: false},
              {
                default: (): VNode =>
                  h(
                    ThemeProvider,
                    {
                      mode: themeMode as any,
                    },
                    {
                      default: (): VNode =>
                        h(FlowProvider, null, {
                          default: (): VNode =>
                            h(
                              UserProvider,
                              {
                                // When fetchUserProfile is false the Nitro plugin
                                // skips SCIM calls, so we must also pass empty values
                                // here to keep SSR and client in sync.
                                flattenedProfile: shouldFetchProfile
                                  ? (userProfileState.value?.flattenedProfile ?? null)
                                  : null,
                                onUpdateProfile: shouldFetchProfile ? onUpdateProfile : undefined,
                                profile: shouldFetchProfile ? userProfileState.value : null,
                                revalidateProfile: shouldFetchProfile ? revalidateProfile : undefined,
                                schemas: shouldFetchProfile ? (userProfileState.value?.schemas ?? null) : null,
                                updateProfile: shouldFetchProfile ? updateProfile : undefined,
                              },
                              {
                                default: (): VNode | VNode[] | undefined => slots.default?.(),
                              },
                            ),
                        }),
                    },
                  ),
              },
            ),
        },
      );
  },
});

export default ThunderIDRoot;
