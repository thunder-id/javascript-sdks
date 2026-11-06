// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AccessibleOrganizationUnit,
  AccessibleOrganizationUnitList,
  AccessibleOrganizationUnitScope,
  SwitchOrganizationUnitOptions,
  User,
  resolveResourceEndpoint,
} from '@thunderid/browser';
import {FC, ReactElement, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import BaseOrganizationUnitSwitcher, {BaseOrganizationUnitSwitcherProps} from './BaseOrganizationUnitSwitcher';
import getAccessibleOrganizationUnits from '../../../api/account/getAccessibleOrganizationUnits';
import useThunderID from '../../../contexts/ThunderID/useThunderID';
import useTranslation from '../../../hooks/useTranslation';
import getOrganizationUnitSwitchErrorKey from '../../../utils/getOrganizationUnitSwitchErrorKey';

export interface OrganizationUnitSwitcherProps
  extends Omit<
    BaseOrganizationUnitSwitcherProps,
    | 'current'
    | 'error'
    | 'isLoading'
    | 'offset'
    | 'onPageChange'
    | 'onSwitch'
    | 'organizationUnits'
    | 'switchingId'
    | 'totalResults'
  > {
  /**
   * Called when a switch or a load fails, with the SDK error. The message is shown either way.
   */
  onError?: (error: unknown) => void;
  /**
   * Takes over a pick: called with the unit instead of switching to it, so the app decides what
   * happens (for example navigating to a unit-specific entry point).
   */
  onSelect?: (unit: AccessibleOrganizationUnit) => void;
  /**
   * Called after a switch completed in place, with the refreshed user. A switch that leaves the page
   * completes on the callback instead.
   */
  onSwitch?: (unit: AccessibleOrganizationUnit, user: User) => void;
  /**
   * Narrows the list relative to the current unit. `siblings` lists the current unit and the units that
   * share its parent. Omit to list every accessible unit.
   */
  scope?: AccessibleOrganizationUnitScope;
  /**
   * Options passed to `switchOrganizationUnit`, such as `redirect: false`.
   */
  switchOptions?: SwitchOrganizationUnitOptions;
}

/**
 * Lists the organization units the signed-in user can access (`/users/me/ous`), marks the current one,
 * and switches the session to another: it signs in again bounded to that unit through
 * `switchOrganizationUnit`, which reuses the SSO session so normally no credentials are asked. A failed
 * switch keeps the session as it was and shows a translated message.
 *
 * @example
 * ```tsx
 * <OrganizationUnitSwitcher scope="siblings" />
 *
 * // Let the app take over the pick
 * <OrganizationUnitSwitcher onSelect={(unit) => navigate(`/orgs/${unit.handle}`)} />
 *
 * // Custom rendering
 * <OrganizationUnitSwitcher>
 *   {({organizationUnits, current, onSwitch}) => (
 *     <select value={current ?? ''} onChange={(e) => onSwitch(organizationUnits.find((u) => u.id === e.target.value)!)}>
 *       {organizationUnits.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
 *     </select>
 *   )}
 * </OrganizationUnitSwitcher>
 * ```
 */
const OrganizationUnitSwitcher: FC<OrganizationUnitSwitcherProps> = ({
  limit = 10,
  onError = undefined,
  onSelect = undefined,
  onSwitch = undefined,
  preferences = undefined,
  scope = undefined,
  switchOptions = undefined,
  ...rest
}: OrganizationUnitSwitcherProps): ReactElement => {
  const {
    baseUrl,
    currentOrganizationUnit,
    endpoints,
    instanceId,
    isSignedIn,
    preferences: contextPreferences,
    switchOrganizationUnit,
  } = useThunderID();

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

      try {
        const page: AccessibleOrganizationUnitList = await getAccessibleOrganizationUnits({
          baseUrl,
          instanceId,
          limit,
          offset: pageOffset,
          scope,
          url: resolveResourceEndpoint('usersMeOrganizationUnits', {endpoints}),
        });

        if (requestRef.current === request) {
          setList(page);
        }
      } catch (caught: unknown) {
        if (requestRef.current === request) {
          setError(latestRef.current.t('organization_unit.switcher.error.load'));
          latestRef.current.onError?.(caught);
        }
      } finally {
        if (requestRef.current === request) {
          setIsLoading(false);
        }
      }
    },
    [baseUrl, endpoints, instanceId, limit, scope],
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
