// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {hasPermission} from '@thunderid/node';
import type {GrantedPermissions} from '@thunderid/react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import getGrantedPermissionsAction from '../../server/actions/getGrantedPermissionsAction';
import useThunderID from '../contexts/ThunderID/useThunderID';

/**
 * Reads the permissions the signed-in user's access token grants, for example to hide a page the
 * user cannot use. The token stays on the server: only the list of permissions is sent to the
 * browser, through a server action. Same shape as `useGrantedPermissions` in `@thunderid/react`.
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
  const {isSignedIn} = useThunderID();
  const [granted, setGranted] = useState<string[] | null>(null);

  useEffect(() => {
    if (!isSignedIn) {
      return undefined;
    }

    let active = true;

    void getGrantedPermissionsAction()
      .catch((): string[] => [])
      .then((tokenPermissions: string[]) => {
        if (active) {
          setGranted(tokenPermissions);
        }
      });

    return (): void => {
      active = false;
    };
  }, [isSignedIn]);

  const permissions: string[] = useMemo(() => (isSignedIn ? (granted ?? []) : []), [granted, isSignedIn]);
  const isLoading: boolean = !!isSignedIn && granted === null;

  const can: (required: string) => boolean = useCallback(
    (required: string): boolean => hasPermission(permissions, required),
    [permissions],
  );

  return {can, isLoading, permissions};
};

export default useGrantedPermissions;
