// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import useUser from '../../../../contexts/User/useUser';

/**
 * Resolves the organization unit a new resource is created in: the one passed in, otherwise the
 * signed-in user's own organization unit.
 *
 * @param ouId - The organization unit chosen by the caller.
 * @returns The organization unit identifier, or `undefined` when neither is known.
 */
const useDefaultOuId = (ouId?: string): string | undefined => {
  const {profile, flattenedProfile} = useUser();
  const source: Record<string, unknown> = (flattenedProfile ?? profile ?? {}) as Record<string, unknown>;
  const fromProfile: unknown = source['ouId'];

  return ouId ?? (typeof fromProfile === 'string' ? fromProfile : undefined);
};

export default useDefaultOuId;
