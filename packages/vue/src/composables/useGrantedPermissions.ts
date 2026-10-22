// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {getTokenPermissions, hasPermission} from '@thunderid/browser';
import {type ComputedRef, type Ref, computed, getCurrentScope, onScopeDispose, shallowRef, watch} from 'vue';
import useThunderID from './useThunderID';

/**
 * The permissions the signed-in user's access token grants.
 */
export interface GrantedPermissions {
  /**
   * Whether the granted permissions cover a required one. A permission covers everything under it,
   * so `system:user` covers `system:user:view`. Use it to decide what to show; the server still
   * checks every request. Reactive when read in a render function, template or `computed`.
   */
  can: (required: string) => boolean;
  isLoading: ComputedRef<boolean>;
  permissions: ComputedRef<string[]>;
}

/**
 * Reads the permissions the signed-in user's access token grants, for example to hide a page the
 * user cannot use.
 *
 * @returns The granted permissions and a `can` check.
 *
 * @example
 * ```vue
 * <script setup>
 * import {useGrantedPermissions, GroupList} from '@thunderid/vue';
 * const {can} = useGrantedPermissions();
 * </script>
 * <template>
 *   <GroupList v-if="can('system:group:view')" />
 * </template>
 * ```
 */
const useGrantedPermissions = (): GrantedPermissions => {
  const {getAccessToken, isSignedIn} = useThunderID();
  const granted: Ref<string[] | null> = shallowRef<string[] | null>(null);
  let generation = 0;

  watch(
    () => isSignedIn.value,
    (signedIn: boolean): void => {
      generation += 1;
      const current: number = generation;

      if (!signedIn) {
        granted.value = null;

        return;
      }

      void getAccessToken()
        .then((token: string) => getTokenPermissions(token))
        .catch((): string[] => [])
        .then((tokenPermissions: string[]) => {
          if (current === generation) {
            granted.value = tokenPermissions;
          }
        });
    },
    {immediate: true},
  );

  if (getCurrentScope()) {
    onScopeDispose(() => {
      generation += 1;
    });
  }

  const permissions: ComputedRef<string[]> = computed(() => (isSignedIn.value ? (granted.value ?? []) : []));
  const isLoading: ComputedRef<boolean> = computed(() => isSignedIn.value && granted.value === null);

  const can = (required: string): boolean => hasPermission(permissions.value, required);

  return {can, isLoading, permissions};
};

export default useGrantedPermissions;
