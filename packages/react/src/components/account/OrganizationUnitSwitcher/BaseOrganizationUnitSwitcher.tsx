// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {AccessibleOrganizationUnit, Preferences, bem, withVendorCSSClassPrefix} from '@thunderid/browser';
import {FC, ReactElement, ReactNode} from 'react';
import useStyles from './BaseOrganizationUnitSwitcher.styles';
import useTheme from '../../../contexts/Theme/useTheme';
import useTranslation from '../../../hooks/useTranslation';
import {cx} from '../../../styles/emotion';
import AlertPrimitive from '../../primitives/Alert/Alert';
import Button from '../../primitives/Button/Button';
import Spinner from '../../primitives/Spinner/Spinner';
import Typography from '../../primitives/Typography/Typography';

const BLOCK = 'organization-unit-switcher';

/**
 * Everything a custom render needs to draw the switcher.
 */
export interface OrganizationUnitSwitcherRenderProps {
  /**
   * Identifier of the unit the session is in, or `null` when it is not known.
   */
  current: string | null;
  /**
   * A translated message for the last failure, or `null`.
   */
  error: string | null;
  /**
   * Whether the units are loading.
   */
  isLoading: boolean;
  /**
   * The page size.
   */
  limit: number;
  /**
   * The zero-based offset of the page.
   */
  offset: number;
  /**
   * Moves to the page that starts at `offset`.
   */
  onPageChange: (offset: number) => void;
  /**
   * Switches to `unit` (or hands it to the app's `onSelect`).
   */
  onSwitch: (unit: AccessibleOrganizationUnit) => void;
  /**
   * The units of the page.
   */
  organizationUnits: AccessibleOrganizationUnit[];
  /**
   * Identifier of the unit a switch is in progress to, or `null`.
   */
  switchingId: string | null;
  /**
   * Number of units the listing matches.
   */
  totalResults: number;
}

export interface BaseOrganizationUnitSwitcherProps extends Partial<OrganizationUnitSwitcherRenderProps> {
  /**
   * Custom render. Replaces the built-in UI and receives the units, the current one, the loading and
   * error state, the paging and `onSwitch`.
   */
  children?: (props: OrganizationUnitSwitcherRenderProps) => ReactNode;
  /**
   * Additional CSS class names.
   */
  className?: string;
  /**
   * Component-level preference overrides, including i18n.
   */
  preferences?: Preferences;
  /**
   * Overrides the default heading. Pass an empty string to omit it.
   */
  title?: string;
}

/**
 * Presentational list of the organization units the signed-in user can access, with the current one
 * marked and a switch action on the others. Holds no SDK state and makes no request: pass the units and
 * the callbacks. Use {@link OrganizationUnitSwitcher} for the variant wired to the SDK.
 *
 * @example
 * ```tsx
 * <BaseOrganizationUnitSwitcher
 *   organizationUnits={units}
 *   current={currentId}
 *   totalResults={units.length}
 *   onSwitch={(unit) => switchTo(unit.id)}
 * />
 * ```
 */
const BaseOrganizationUnitSwitcher: FC<BaseOrganizationUnitSwitcherProps> = ({
  children = undefined,
  className = '',
  current = null,
  error = null,
  isLoading = false,
  limit = 10,
  offset = 0,
  onPageChange = (): void => undefined,
  onSwitch = (): void => undefined,
  organizationUnits = [],
  preferences = undefined,
  switchingId = null,
  title = undefined,
  totalResults = undefined,
}: BaseOrganizationUnitSwitcherProps): ReactElement => {
  const {theme, colorScheme}: ReturnType<typeof useTheme> = useTheme();
  const styles: Record<string, string> = useStyles(theme, colorScheme);
  const {t} = useTranslation(preferences?.i18n);

  const resolvedTotal: number = totalResults ?? organizationUnits.length;

  const renderProps: OrganizationUnitSwitcherRenderProps = {
    current,
    error,
    isLoading,
    limit,
    offset,
    onPageChange,
    onSwitch,
    organizationUnits,
    switchingId,
    totalResults: resolvedTotal,
  };

  if (children) {
    return <>{children(renderProps)}</>;
  }

  const resolvedTitle: string = title ?? t('organization_unit.switcher.heading');
  const hasPrevious: boolean = offset > 0;
  const hasNext: boolean = offset + organizationUnits.length < resolvedTotal;

  return (
    <div className={cx(withVendorCSSClassPrefix(BLOCK), styles['root'], className)}>
      {resolvedTitle && (
        <Typography variant="h5" className={cx(withVendorCSSClassPrefix(bem(BLOCK, 'heading')), styles['heading'])}>
          {resolvedTitle}
        </Typography>
      )}

      {error && (
        <AlertPrimitive variant="error" className={withVendorCSSClassPrefix(bem(BLOCK, 'alert'))}>
          <AlertPrimitive.Description>{error}</AlertPrimitive.Description>
        </AlertPrimitive>
      )}

      {isLoading && (
        <div role="status" className={withVendorCSSClassPrefix(bem(BLOCK, 'loading'))}>
          <Spinner size="small" />
          <Typography variant="body2" component="span">
            {t('organization_unit.switcher.loading')}
          </Typography>
        </div>
      )}

      {!isLoading && organizationUnits.length === 0 && !error && (
        <Typography variant="body2" className={withVendorCSSClassPrefix(bem(BLOCK, 'empty'))}>
          {t('organization_unit.switcher.empty')}
        </Typography>
      )}

      {!isLoading && organizationUnits.length > 0 && (
        <ul
          aria-label={t('organization_unit.switcher.label')}
          className={cx(withVendorCSSClassPrefix(bem(BLOCK, 'list')), styles['list'])}
        >
          {organizationUnits.map((unit: AccessibleOrganizationUnit) => {
            const isCurrent: boolean = unit.id === current;

            return (
              <li
                key={unit.id}
                aria-current={isCurrent ? 'true' : undefined}
                className={cx(
                  withVendorCSSClassPrefix(bem(BLOCK, 'item', isCurrent ? 'current' : undefined)),
                  styles['item'],
                  isCurrent ? styles['itemCurrent'] : '',
                )}
              >
                <span className={styles['itemText']}>
                  <Typography variant="body1" component="span">
                    {unit.name}
                  </Typography>
                  <Typography variant="body2" component="span" className={styles['handle']}>
                    {unit.handle}
                  </Typography>
                </span>
                {isCurrent ? (
                  <span className={cx(withVendorCSSClassPrefix(bem(BLOCK, 'badge')), styles['badge'])}>
                    {t('organization_unit.switcher.current')}
                  </span>
                ) : (
                  <Button
                    size="small"
                    variant="outline"
                    color="primary"
                    loading={switchingId === unit.id}
                    disabled={switchingId !== null}
                    aria-label={`${t('organization_unit.switcher.switch')} ${unit.name}`}
                    onClick={(): void => onSwitch(unit)}
                  >
                    {switchingId === unit.id
                      ? t('organization_unit.switcher.switching')
                      : t('organization_unit.switcher.switch')}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {(hasPrevious || hasNext) && (
        <div className={cx(withVendorCSSClassPrefix(bem(BLOCK, 'pagination')), styles['pagination'])}>
          <Button
            size="small"
            variant="text"
            disabled={!hasPrevious || isLoading}
            onClick={(): void => onPageChange(Math.max(0, offset - limit))}
          >
            {t('organization_unit.switcher.previous')}
          </Button>
          <Button
            size="small"
            variant="text"
            disabled={!hasNext || isLoading}
            onClick={(): void => onPageChange(offset + limit)}
          >
            {t('organization_unit.switcher.next')}
          </Button>
        </div>
      )}
    </div>
  );
};

export default BaseOrganizationUnitSwitcher;
