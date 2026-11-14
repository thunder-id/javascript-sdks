// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type PermissionMatching, hasPermission} from '@thunderid/browser';
import {type ComputedRef, type Ref, computed, getCurrentScope, onScopeDispose, shallowRef, watch} from 'vue';
import useThunderID from '../useThunderID';

/**
 * The permissions the signed-in user's access token grants.
 */
export interface GrantedPermissions {
  /**
   * Whether the granted permissions cover a required one. A permission covers everything under it,
   * so `system:user` covers `system:user:view`. Use it to decide what to show; the server still
   * checks every request. Reactive when read in a render function, template or `computed`. Pass
   * `matching` for a permission of your own resource server.
   */
  can: (required: string, matching?: PermissionMatching) => boolean;
  isLoading: ComputedRef<boolean>;
  permissions: ComputedRef<string[]>;
}

/**
 * Reads the permissions the signed-in user's access token grants, for example to hide a page the
 * user cannot use. In backend mode they come from the backend's session, so the token stays on the
 * backend.
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
  const {getGrantedPermissions, isSignedIn} = useThunderID();
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

      void getGrantedPermissions()
        .catch((): string[] => [])
        .then((grantedPermissions: string[]) => {
          if (current === generation) {
            granted.value = grantedPermissions;
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

  const can = (required: string, matching?: PermissionMatching): boolean =>
    hasPermission(permissions.value, required, matching);

  return {can, isLoading, permissions};
};

export default useGrantedPermissions;
