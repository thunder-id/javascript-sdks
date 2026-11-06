// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {AccessibleOrganizationUnit, AccessibleOrganizationUnitList, User} from '@thunderid/node';
import {
  BaseOrganizationUnitSwitcher,
  OrganizationUnitSwitcherProps as ReactOrganizationUnitSwitcherProps,
  getOrganizationUnitSwitchErrorKey,
  useTranslation,
} from '@thunderid/react';
import {FC, ReactElement, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import getAccessibleOrganizationUnitsAction, {
  GetAccessibleOrganizationUnitsActionResult,
} from '../../../../server/actions/account/getAccessibleOrganizationUnitsAction';
import useThunderID from '../../../contexts/ThunderID/useThunderID';

/**
 * Props for the OrganizationUnitSwitcher component. Mirrors `@thunderid/react`'s
 * `OrganizationUnitSwitcherProps`, so a consumer moving between the React and Next.js SDKs calls it the
 * same way.
 */
export type OrganizationUnitSwitcherProps = ReactOrganizationUnitSwitcherProps;

/**
 * Lists the organization units the signed-in user can access, marks the current one, and switches the
 * session to another.
 *
 * This is the Next.js implementation: it renders `BaseOrganizationUnitSwitcher` from `@thunderid/react`,
 * reads the units through `getAccessibleOrganizationUnitsAction` (a server action, so the access token
 * stays on the server), and switches through the provider's `switchOrganizationUnit`.
 *
 * @example
 * ```tsx
 * <OrganizationUnitSwitcher scope="siblings" />
 * ```
 */
const OrganizationUnitSwitcher: FC<OrganizationUnitSwitcherProps> = ({
  limit = 10,
  onError,
  onSelect,
  onSwitch,
  preferences,
  scope,
  switchOptions,
  ...rest
}: OrganizationUnitSwitcherProps): ReactElement => {
  const {currentOrganizationUnit, isSignedIn, preferences: contextPreferences, switchOrganizationUnit} = useThunderID();

  const resolvedPreferences = useMemo(
    () => ({...contextPreferences, ...preferences}),
    [contextPreferences, preferences],
  );
  const {t} = useTranslation(resolvedPreferences?.i18n);

  const [list, setList] = useState<AccessibleOrganizationUnitList | null>(null);
  const [offset, setOffset] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const requestRef = useRef<number>(0);
  // The latest callbacks, read when a load settles, so a new `onError` on each render does not reload.
  const latestRef = useRef<{onError?: (error: unknown) => void; t: typeof t}>({onError, t});
  latestRef.current = {onError, t};

  const load = useCallback(
    async (pageOffset: number): Promise<void> => {
      const request: number = requestRef.current + 1;
      requestRef.current = request;
      setIsLoading(true);
      setError(null);

      const result: GetAccessibleOrganizationUnitsActionResult = await getAccessibleOrganizationUnitsAction({
        limit,
        offset: pageOffset,
        scope,
      });

      if (requestRef.current !== request) {
        return;
      }

      if (result.success) {
        setList(result.data);
      } else {
        setError(latestRef.current.t('organization_unit.switcher.error.load'));
        latestRef.current.onError?.(result);
      }

      setIsLoading(false);
    },
    [limit, scope],
  );

  useEffect(() => {
    if (isSignedIn) {
      void load(offset);
    }
  }, [isSignedIn, load, offset]);

  const handleSwitch = async (unit: AccessibleOrganizationUnit): Promise<void> => {
    if (onSelect) {
      onSelect(unit);

      return;
    }

    if (!switchOrganizationUnit) {
      return;
    }

    setError(null);
    setSwitchingId(unit.id);

    try {
      const user: User | undefined = await switchOrganizationUnit(unit.id, switchOptions);

      if (user) {
        onSwitch?.(unit, user);
        await load(offset);
      }
    } catch (caught: unknown) {
      setError(t(getOrganizationUnitSwitchErrorKey(caught), {name: unit.name}));
      onError?.(caught);
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <BaseOrganizationUnitSwitcher
      {...rest}
      current={(list?.current === '' ? undefined : list?.current) ?? currentOrganizationUnit?.id ?? null}
      error={error}
      isLoading={isLoading}
      limit={limit}
      offset={offset}
      organizationUnits={list?.organizationUnits ?? []}
      preferences={resolvedPreferences}
      switchingId={switchingId}
      totalResults={list?.totalResults ?? 0}
      onPageChange={setOffset}
      onSwitch={(unit: AccessibleOrganizationUnit): void => {
        void handleSwitch(unit);
      }}
    />
  );
};

export default OrganizationUnitSwitcher;
