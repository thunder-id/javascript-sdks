// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {BaseUserSelect} from '@thunderid/vue';
import {type Component, type SetupContext, type VNode, defineComponent, h} from 'vue';
import fetchUsersFromServer from '../../utils/fetchUsersFromServer';

/**
 * Nuxt-specific UserSelect container.
 *
 * Loads users through `GET /api/auth/users` with the signed-in user's server-held session, so the
 * access token never reaches the browser. It takes no data source; for a custom one use
 * `PagedSelect`. All other props (`v-model`, `label`, `mapping`, ...) go to the Vue component.
 *
 * @example
 * ```vue
 * <UserSelect v-model="ownerId" label="Owner" />
 * ```
 */
const UserSelect: Component = defineComponent({
  name: 'UserSelect',
  inheritAttrs: false,
  setup(_props: Record<string, never>, {attrs}: SetupContext): () => VNode {
    return (): VNode => h(BaseUserSelect, {...attrs, fetchUsers: fetchUsersFromServer});
  },
});

export default UserSelect;
