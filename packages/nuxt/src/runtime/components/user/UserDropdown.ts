// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {withVendorCSSClassPrefix} from '@thunderid/browser';
import {BaseUserDropdown, type DropdownMenuItem, UserProfile as UserProfileComponent} from '@thunderid/vue';
import {type Component, type PropType, type Ref, type VNode, defineComponent, h, ref} from 'vue';
import {useThunderID, useUser} from '#imports';

/**
 * Nuxt-specific UserDropdown container.
 *
 * Reads `user` and `signOut` from `useThunderID()` (Nuxt auto-import) and
 * profile data from `useUser()`, then delegates rendering to
 * {@link BaseUserDropdown} from `@thunderid/vue`.
 *
 * The `signOut` action comes from the Nuxt plugin's THUNDERID_KEY so it uses
 * `navigateTo` for the redirect instead of `window.location`.
 *
 * The embedded profile modal renders the Nuxt-specific `UserProfile` so that
 * profile update handlers are also wired through the Nuxt auto-import layer.
 *
 * @example With a custom account page instead of the built-in profile popup
 * ```vue
 * <UserDropdown :menu-items="menuItems" profile-label="Manage Account" :on-manage-profile="() => router.push('/account')" />
 * ```
 */
const UserDropdown: Component = defineComponent({
  emits: ['profileClick'],
  name: 'UserDropdown',
  props: {
    className: {default: '', type: String},
    menuAlign: {default: 'auto', type: String as PropType<'auto' | 'left' | 'right'>},
    menuItems: {default: () => [], type: Array as PropType<DropdownMenuItem[]>},
    /**
     * Called instead of opening the built-in profile popup when the profile menu item is
     * clicked. Use this when the app has its own account page to navigate to.
     */
    onManageProfile: {default: undefined, type: Function as PropType<() => void>},
    profileLabel: {default: 'Profile', type: String},
    showChevron: {default: true, type: Boolean},
    showTriggerLabel: {default: false, type: Boolean},
    size: {default: 'md', type: String as PropType<'sm' | 'md' | 'lg'>},
  },
  setup(
    props: Readonly<{
      className: string;
      menuAlign: 'auto' | 'left' | 'right';
      menuItems: DropdownMenuItem[];
      onManageProfile?: () => void;
      profileLabel: string;
      showChevron: boolean;
      showTriggerLabel: boolean;
      size: 'sm' | 'md' | 'lg';
    }>,
    {slots, emit}: {emit: any; slots: any},
  ): () => VNode | VNode[] | null {
    const {user, signOut} = useThunderID();
    const {revalidateProfile} = useUser();
    const isProfileModalOpen: Ref<boolean> = ref(false);

    return (): VNode | VNode[] | null =>
      h(
        BaseUserDropdown,
        {
          class: withVendorCSSClassPrefix('user-dropdown--styled'),
          className: props.className,
          isProfileModalOpen: isProfileModalOpen.value,
          menuAlign: props.menuAlign,
          menuItems: props.menuItems,
          onProfileClick: (): void => {
            if (props.onManageProfile) {
              props.onManageProfile();
              return;
            }
            isProfileModalOpen.value = true;
            void revalidateProfile();
            emit('profileClick');
          },
          onProfileModalClose: (): void => {
            isProfileModalOpen.value = false;
          },
          onSignOut: (): void => {
            // signOut from the Nuxt plugin uses navigateTo — SSR-safe.
            signOut();
          },
          // Inline profile content avoids creating a circular dependency on the
          // Nuxt UserProfile container; UserProfileComponent from @thunderid/vue
          // reads its data from the OrganizationProvider / UserProvider context
          // wired up by ThunderIDRoot, so it works identically.
          profileContent:
            !props.onManageProfile && isProfileModalOpen.value
              ? h(UserProfileComponent, {
                  cardLayout: false,
                  editable: true,
                })
              : null,
          profileLabel: props.profileLabel,
          showChevron: props.showChevron,
          showTriggerLabel: props.showTriggerLabel,
          size: props.size,
          user: user.value,
        },
        slots,
      );
  },
});

export default UserDropdown;
