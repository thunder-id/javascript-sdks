// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type ComputedRef, computed, inject} from 'vue';
import {USER_KEY} from '../../../../keys';
import type {UserContextValue} from '../../../../models/contexts';

/**
 * Resolves the organization unit a new resource is created in: the one passed in, otherwise the
 * signed-in user's own organization unit.
 *
 * @param ouId - Getter for the organization unit chosen by the caller.
 * @returns The organization unit identifier, or `undefined` when neither is known.
 */
const useDefaultOuId = (ouId: () => string | undefined): ComputedRef<string | undefined> => {
  const user: UserContextValue | null = inject(USER_KEY, null);

  return computed(() => {
    const explicit: string | undefined = ouId();

    if (explicit) {
      return explicit;
    }

    const source: Record<string, unknown> = (user?.flattenedProfile?.value ?? user?.profile?.value ?? {}) as Record<
      string,
      unknown
    >;
    const fromProfile: unknown = source['ouId'];

    return typeof fromProfile === 'string' ? fromProfile : undefined;
  });
};

export default useDefaultOuId;
