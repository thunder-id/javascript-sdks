// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {generateFlattenedUserProfile} from '@thunderid/browser';
import type {AttributeSchema, FlowMetadataResponse, UpdateMeProfileConfig, User, UserProfile} from '@thunderid/node';
import {FlowMetaProvider, FlowProvider, I18nProvider, ThemeProvider, UserProvider} from '@thunderid/vue';
import {defineComponent, h, type Component, type Ref, type SetupContext, type VNode} from 'vue';
import NuxtAPIRoutes from '../constants/NuxtAPIRoutes';
import type {ThunderIDAuthState, ThunderIDNuxtConfig} from '../types';
import {getAuthStateKey, getFlowMetaStateKey, getUserProfileStateKey, getUserSchemaStateKey} from '../utils/stateKeys';
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
 * - {@link UserProvider}      ← `profile`, `flattenedProfile`, `userSchema`,
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
    const userSchemaState: Ref<Record<string, AttributeSchema> | null> = useState<Record<
      string,
      AttributeSchema
    > | null>(getUserSchemaStateKey(vendor));
    // Used by onUpdateProfile to keep the top-level auth user claim in sync.
    const authState: Ref<ThunderIDAuthState> = useState<ThunderIDAuthState>(getAuthStateKey(vendor));
    const flowMetaState: Ref<FlowMetadataResponse | null> = useState<FlowMetadataResponse | null>(
      getFlowMetaStateKey(vendor),
    );

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
     * successful profile PATCH without an extra server round-trip.
     */
    const onUpdateProfile = (payload: User): void => {
      const prev: UserProfile | null = userProfileState.value;
      userProfileState.value = prev
        ? {
            ...prev,
            flattenedProfile: generateFlattenedUserProfile(payload),
            profile: payload,
          }
        : {
            flattenedProfile: generateFlattenedUserProfile(payload),
            profile: payload,
          };
      // Keep THUNDERID_KEY `user` ref in sync so `useThunderID().user` reflects
      // the update immediately.
      authState.value = {...authState.value, user: payload};
    };

    /**
     * profile PATCH via the `NuxtAPIRoutes.USER_PROFILE` Nitro route.
     * Signature matches `UserProvider.updateProfile` exactly.
     *
     * On success, applies an optimistic local update via `onUpdateProfile`
     * so consumers of `useUser()` (e.g. `<UserProfile>`) and
     * `useThunderID().user` (e.g. `<User>`) reflect the new value
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
        const result: {data: {user: User}; error: string; success: boolean} = await $fetch(NuxtAPIRoutes.USER_PROFILE, {
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
     * Re-fetch the full user profile (and its attribute schema) from `NuxtAPIRoutes.USER_PROFILE`.
     */
    const revalidateProfile = async (): Promise<void> => {
      try {
        const res: (UserProfile & {userSchema?: Record<string, AttributeSchema> | null}) | null = await $fetch<
          UserProfile & {userSchema?: Record<string, AttributeSchema> | null}
        >(NuxtAPIRoutes.USER_PROFILE);
        if (res) {
          const {userSchema: fetchedSchema, ...profile} = res;
          userProfileState.value = profile as UserProfile;
          userSchemaState.value = fetchedSchema ?? null;
        }
      } catch {
        // Non-fatal — profile stays stale until the next navigation.
      }
    };

    /**
     * Fetches flow metadata via the `NuxtAPIRoutes.META` Nitro route instead of `FlowMetaProvider`'s
     * default direct browser-to-`baseUrl` fetch — so the browser never talks to the ThunderID
     * server directly and no CORS configuration is required there. Used for both the initial
     * fetch (when SSR seeding via `flowMetaState` didn't happen, e.g. it failed server-side) and
     * subsequent `switchLanguage()` calls.
     */
    const fetchMeta = async (params: {applicationId?: string; language?: string}): Promise<FlowMetadataResponse> =>
      $fetch<FlowMetadataResponse>(NuxtAPIRoutes.META, {
        query: {...(params.language ? {language: params.language} : {})},
      });

    // ── Render tree — mirrors ThunderIDClientProvider (Next.js) ─────────────
    return (): VNode =>
      h(
        I18nProvider,
        {preferences: prefs?.i18n},
        {
          default: (): VNode =>
            h(
              FlowMetaProvider,
              {enabled: true, fetchMeta, initialMeta: flowMetaState.value},
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
                                // skips profile fetches, so we must also pass empty values
                                // here to keep SSR and client in sync.
                                flattenedProfile: shouldFetchProfile
                                  ? (userProfileState.value?.flattenedProfile ?? null)
                                  : null,
                                onUpdateProfile: shouldFetchProfile ? onUpdateProfile : undefined,
                                profile: shouldFetchProfile ? userProfileState.value : null,
                                revalidateProfile: shouldFetchProfile ? revalidateProfile : undefined,
                                updateProfile: shouldFetchProfile ? updateProfile : undefined,
                                userSchema: shouldFetchProfile ? userSchemaState.value : null,
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
