// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AttributeVerificationConstants, deepMerge, withVendorCSSClassPrefix} from '@thunderid/browser';
import {BaseUserProfile, type BaseUserProfileVerificationSlotProps, useI18n} from '@thunderid/vue';
import {type Component, type PropType, type Ref, type SetupContext, type VNode, defineComponent, h, ref} from 'vue';
import VerifyAttribute from './VerifyAttribute';
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
    /** Handle of the `SELF_SERVICE` flow that verifies an attribute. */
    verificationFlowHandle: {default: AttributeVerificationConstants.DEFAULT_FLOW_HANDLE, type: String},
  },
  setup(
    props: Readonly<{
      cardLayout: boolean;
      className: string;
      editable: boolean;
      hideFields: string[];
      showFields: string[];
      title: string;
      verificationFlowHandle: string;
    }>,
    {slots}: SetupContext,
  ): () => VNode {
    const {flattenedProfile, profile, updateProfile, userSchema} = useUser();
    const {t} = useI18n();

    // A failed save is shown, and drops the verification the save would have opened.
    const error: Ref<string | null> = ref<string | null>(null);

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

      error.value = null;
      const result: Awaited<ReturnType<NonNullable<typeof updateProfile>>> = await updateProfile({
        payload: updatedAttributes,
      } as any);
      // `result.error` carries the route and server text, which is not meant for the user.
      if (result && !result.success) {
        error.value = t('user.profile.update.generic.error');
      }
    }

    const renderVerification = ({
      attribute,
      attributeDisplayName,
      onCancel,
    }: BaseUserProfileVerificationSlotProps): VNode =>
      h(VerifyAttribute, {
        attribute,
        attributeDisplayName,
        flowHandle: props.verificationFlowHandle,
        key: attribute,
        onCancel,
        onDone: onCancel,
      });

    return (): VNode =>
      h(
        BaseUserProfile,
        {
          cardLayout: props.cardLayout,
          class: withVendorCSSClassPrefix('user-profile--styled'),
          className: props.className,
          editable: props.editable,
          error: error.value,
          flattenedProfile: flattenedProfile?.value,
          hideFields: props.hideFields,
          onUpdate: updateProfile ? handleProfileUpdate : undefined,
          profile: profile?.value?.profile ?? flattenedProfile?.value,
          showFields: props.showFields,
          t,
          title: props.title,
          userSchema: userSchema?.value,
        },
        updateProfile ? {verification: renderVerification, ...slots} : slots,
      );
  },
});

export default UserProfile;
