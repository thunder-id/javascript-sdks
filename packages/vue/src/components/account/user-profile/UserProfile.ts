// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AttributeVerificationConstants,
  Preferences,
  ThunderIDError,
  User,
  deepMerge,
  resolveResourceEndpoint,
  withVendorCSSClassPrefix,
} from '@thunderid/browser';
import {
  type Component,
  type PropType,
  type SetupContext,
  type VNode,
  computed,
  defineComponent,
  h,
  ref,
  type Ref,
} from 'vue';
import BaseUserProfile, {type BaseUserProfileVerificationSlotProps} from './BaseUserProfile';
import updateMeProfile from '../../../api/account/updateMeProfile';
import useI18n from '../../../composables/useI18n';
import useThunderID from '../../../composables/useThunderID';
import useUser from '../../../composables/useUser';
import VerifyAttribute from '../verify-attribute/VerifyAttribute';

type UserProfileProps = Readonly<{
  avatarSize: 'sm' | 'md' | 'lg';
  cardLayout: boolean;
  cardVariant: 'elevated' | 'outlined' | 'flat';
  className: string;
  compact: boolean;
  editable: boolean;
  hideFields: string[];
  preferences?: Preferences;
  showAvatar: boolean;
  showFields: string[];
  title: string;
  verificationFlowHandle: string;
}>;

const UserProfile: Component = defineComponent({
  name: 'UserProfile',
  props: {
    /** Avatar circle size. */
    avatarSize: {
      default: 'lg',
      type: String as PropType<'sm' | 'md' | 'lg'>,
    },
    /** Whether to render the component inside a Card wrapper. */
    cardLayout: {default: true, type: Boolean},
    /** Shadow / border style of the card wrapper. */
    cardVariant: {
      default: 'elevated',
      type: String as PropType<'elevated' | 'outlined' | 'flat'>,
    },
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** Tighter spacing — useful when embedded in a modal or dropdown. */
    compact: {default: false, type: Boolean},
    /** Whether fields can be edited inline. */
    editable: {default: true, type: Boolean},
    /** Fields to hide by name. */
    hideFields: {default: () => [], type: Array as PropType<string[]>},
    /** Component-level preferences to override global preferences. */
    preferences: {
      default: undefined,
      type: Object as PropType<Preferences>,
    },
    /** Whether to render the avatar hero section. */
    showAvatar: {default: true, type: Boolean},
    /** Fields to show exclusively (empty = show all). */
    showFields: {default: () => [], type: Array as PropType<string[]>},
    /** Card header title. */
    title: {default: 'Profile', type: String},
    /** Handle of the `SELF_SERVICE` flow that verifies an attribute. */
    verificationFlowHandle: {default: AttributeVerificationConstants.DEFAULT_FLOW_HANDLE, type: String},
  },
  setup(props: UserProfileProps, {slots}: SetupContext): () => VNode {
    const {baseUrl, endpoints, instanceId, preferences: contextPreferences} = useThunderID();
    const {flattenedProfile, profile, onUpdateProfile, updateProfile, userSchema} = useUser();
    const {t} = useI18n();

    const resolvedPreferences = computed(() => ({
      ...contextPreferences,
      ...props.preferences,
      user: {
        ...contextPreferences?.user,
        ...props.preferences?.user,
      },
    }));

    const isEditableProfile = computed(() =>
      resolvedPreferences.value?.user?.fetchUserProfile === false ? false : props.editable,
    );

    const error: Ref<string | null> = ref<string | null>(null);

    async function handleProfileUpdate(payload: any): Promise<void> {
      error.value = null;

      try {
        const rawProfile = profile?.value?.profile ?? profile?.value;
        const updatedAttributes: Record<string, unknown> = deepMerge(
          (rawProfile?.['attributes'] as Record<string, unknown>) ?? {},
          payload,
        );

        Object.keys(updatedAttributes).forEach((key) => {
          if (updatedAttributes[key] === undefined || updatedAttributes[key] === null) {
            delete updatedAttributes[key];
          }
        });

        if (updateProfile) {
          const res = await updateProfile({payload: updatedAttributes} as any);
          if (res && !res.success && res.error) {
            error.value = res.error;
          }
          return;
        }

        if (!baseUrl) return;

        const response: User = await updateMeProfile({
          baseUrl,
          url: resolveResourceEndpoint('usersMe', {endpoints}),
          instanceId,
          payload: updatedAttributes,
        });
        onUpdateProfile(response);
      } catch (caughtError: unknown) {
        let message: string = t('user.profile.update.generic.error') || 'Failed to update profile. Please try again.';

        if (caughtError instanceof ThunderIDError) {
          message = caughtError.message;
        }

        error.value = message;
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
        preferences: resolvedPreferences.value,
      });

    return (): VNode =>
      h(
        BaseUserProfile,
        {
          avatarSize: props.avatarSize,
          cardLayout: props.cardLayout,
          cardVariant: props.cardVariant,
          class: withVendorCSSClassPrefix('user-profile--styled'),
          className: props.className,
          compact: props.compact,
          editable: isEditableProfile.value,
          error: error.value,
          flattenedProfile: flattenedProfile?.value,
          hideFields: props.hideFields,
          onUpdate: isEditableProfile.value ? handleProfileUpdate : undefined,
          preferences: resolvedPreferences.value,
          profile: profile?.value?.profile ?? flattenedProfile?.value,
          showAvatar: props.showAvatar,
          showFields: props.showFields,
          t: t,
          title: props.title,
          userSchema: userSchema?.value,
        },
        isEditableProfile.value ? {verification: renderVerification, ...slots} : slots,
      );
  },
});

export default UserProfile;
