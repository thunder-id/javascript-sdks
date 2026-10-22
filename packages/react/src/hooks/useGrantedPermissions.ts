// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {getTokenPermissions, hasPermission} from '@thunderid/browser';
import {useCallback, useEffect, useMemo, useState} from 'react';
import useThunderID from '../contexts/ThunderID/useThunderID';

/**
 * The permissions the signed-in user's access token grants.
 */
export interface GrantedPermissions {
  /**
   * Whether the granted permissions cover a required one. A permission covers everything under it,
   * so `system:user` covers `system:user:view`. Use it to decide what to show; the server still
   * checks every request.
   */
  can: (required: string) => boolean;
  isLoading: boolean;
  permissions: string[];
}

/**
 * Reads the permissions the signed-in user's access token grants, for example to hide a page the
 * user cannot use.
 *
 * @returns The granted permissions and a `can` check.
 *
 * @example
 * ```tsx
 * const {can} = useGrantedPermissions();
 * return can('system:group:view') ? <GroupList /> : null;
 * ```
 */
const useGrantedPermissions = (): GrantedPermissions => {
  const {getAccessToken, isSignedIn} = useThunderID();
  const [granted, setGranted] = useState<string[] | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      return undefined;
    }

    let active = true;

    void getAccessToken()
      .then((token: string) => getTokenPermissions(token))
      .catch((): string[] => [])
      .then((tokenPermissions: string[]) => {
        if (active) {
          setGranted(tokenPermissions);
        }
      });

    return (): void => {
      active = false;
    };
  }, [getAccessToken, isSignedIn]);

  const permissions: string[] = useMemo(() => (isSignedIn ? (granted ?? []) : []), [granted, isSignedIn]);
  const isLoading: boolean = isSignedIn && granted === null;

  const can: (required: string) => boolean = useCallback(
    (required: string): boolean => hasPermission(permissions, required),
    [permissions],
  );

  return {can, isLoading, permissions};
};

export default useGrantedPermissions;
