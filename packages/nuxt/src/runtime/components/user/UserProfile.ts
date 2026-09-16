// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {deepMerge, withVendorCSSClassPrefix} from '@thunderid/browser';
import {BaseUserProfile} from '@thunderid/vue';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';
import {useUser} from '#imports';

/**
 * Nuxt-specific UserProfile container.
 *
 * Reads user profile data from `useUser()` (Nuxt auto-import, re-exported
 * from `@thunderid/vue`) and delegates rendering to {@link BaseUserProfile}
 * from `@thunderid/vue`.
 *
 * Preserves the same prop/slot API as the Vue SDK's `UserProfile` component
 * so consumers don't need to change their templates.
 *
 * @example
 * ```vue
 * <UserProfile :editable="true" title="My Profile" />
 * ```
 */
const UserProfile: Component = defineComponent({
  name: 'UserProfile',
  props: {
    cardLayout: {default: true, type: Boolean},
    className: {default: '', type: String},
    editable: {default: true, type: Boolean},
    hideFields: {default: () => [], type: Array as PropType<string[]>},
    showFields: {default: () => [], type: Array as PropType<string[]>},
    title: {default: 'Profile', type: String},
  },
  setup(
    props: Readonly<{
      cardLayout: boolean;
      className: string;
      editable: boolean;
      hideFields: string[];
      showFields: string[];
      title: string;
    }>,
    {slots}: SetupContext,
  ): () => VNode {
    const {flattenedProfile, profile, updateProfile, userSchema} = useUser();

    // `BaseUserProfile` saves one field at a time (`onUpdate({fieldName: value})`), but
    // `PATCH /api/auth/user/profile` -> the backend's `PUT /users/me` validates the submitted
    // attributes against the full schema, including fields the caller didn't touch. Merge the
    // edited field onto the rest of the stored profile before sending, the same way
    // `@thunderid/react`'s and `@thunderid/vue`'s own `UserProfile` containers do, so a
    // single-field edit doesn't get rejected for omitting every other required attribute.
    async function handleProfileUpdate(payload: Record<string, unknown>): Promise<void> {
      if (!updateProfile) return;

      const rawProfile = (profile?.value?.profile ?? profile?.value) as Record<string, unknown> | undefined;
      const updatedAttributes: Record<string, unknown> = deepMerge(
        (rawProfile?.attributes as Record<string, unknown>) ?? {},
        payload,
      );

      Object.keys(updatedAttributes).forEach((key) => {
        if (updatedAttributes[key] === undefined || updatedAttributes[key] === null) {
          delete updatedAttributes[key];
        }
      });

      await updateProfile({payload: updatedAttributes} as any);
    }

    return (): VNode =>
      h(
        BaseUserProfile,
        {
          cardLayout: props.cardLayout,
          class: withVendorCSSClassPrefix('user-profile--styled'),
          className: props.className,
          editable: props.editable,
          flattenedProfile: flattenedProfile?.value,
          hideFields: props.hideFields,
          onUpdate: updateProfile ? handleProfileUpdate : undefined,
          profile: profile?.value?.profile ?? flattenedProfile?.value,
          showFields: props.showFields,
          title: props.title,
          userSchema: userSchema?.value,
        },
        slots,
      );
  },
});

export default UserProfile;
