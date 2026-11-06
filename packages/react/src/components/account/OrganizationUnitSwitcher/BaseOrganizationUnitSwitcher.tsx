// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  type MiddlewareState,
  offset as floatingOffset,
  shift,
  size,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
} from '@floating-ui/react';
import {AccessibleOrganizationUnit, Preferences, bem, withVendorCSSClassPrefix} from '@thunderid/browser';
import {FC, ReactElement, ReactNode, useId, useRef, useState} from 'react';
import useStyles from './BaseOrganizationUnitSwitcher.styles';
import useTheme from '../../../contexts/Theme/useTheme';
import useTranslation from '../../../hooks/useTranslation';
import {cx} from '../../../styles/emotion';
import Button from '../../primitives/Button/Button';
import Check from '../../primitives/Icons/Check';
import ChevronDown from '../../primitives/Icons/ChevronDown';
import Spinner from '../../primitives/Spinner/Spinner';

const BLOCK = 'organization-unit-switcher';

export interface OrganizationUnitSwitcherRenderProps {
  /**
   * Identifier of the unit the session is in, or `null` when it is not known.
   */
  current: string | null;
  /**
   * Name of the unit the session is in, from the page or the session, or `null` when it is not known.
   */
  currentName: string | null;
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
   * Overrides the small label above the current unit. Pass an empty string to omit it.
   */
  title?: string;
}

/**
 * Presentational organization unit picker: a field showing the current unit under a small label, which
 * opens a menu of the units the signed-in user can access. Holds no SDK state and makes no request: pass
 * the units and the callbacks. Use {@link OrganizationUnitSwitcher} for the variant wired to the SDK.
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
  currentName = null,
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
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const listRef = useRef<(HTMLElement | null)[]>([]);
  const listId: string = useId();

  const isSwitching: boolean = switchingId !== null;
  const open: boolean = isOpen && !isSwitching;
  const currentIndex: number = organizationUnits.findIndex((unit: AccessibleOrganizationUnit) => unit.id === current);
  const resolvedCurrentName: string | null = organizationUnits[currentIndex]?.name ?? currentName;
  const resolvedTotal: number = totalResults ?? organizationUnits.length;

  const {context, floatingStyles, refs} = useFloating({
    middleware: [
      floatingOffset(4),
      flip(),
      shift({padding: 8}),
      size({
        apply({elements, rects}: MiddlewareState): void {
          elements.floating.style.minWidth = `${rects.reference.width}px`;
        },
      }),
    ],
    onOpenChange: setIsOpen,
    open,
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
  });
  const click: ReturnType<typeof useClick> = useClick(context, {enabled: !isSwitching});
  const dismiss: ReturnType<typeof useDismiss> = useDismiss(context);
  const listNavigation: ReturnType<typeof useListNavigation> = useListNavigation(context, {
    activeIndex,
    listRef,
    loop: true,
    onNavigate: setActiveIndex,
    selectedIndex: currentIndex >= 0 ? currentIndex : null,
  });
  const {getFloatingProps, getItemProps, getReferenceProps} = useInteractions([click, dismiss, listNavigation]);

  const renderProps: OrganizationUnitSwitcherRenderProps = {
    current,
    currentName: resolvedCurrentName,
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

  const label: string = title ?? t('organization_unit.switcher.label');
  const hasPrevious: boolean = offset > 0;
  const hasNext: boolean = offset + organizationUnits.length < resolvedTotal;

  const fieldValue = (): string => {
    if (isSwitching) {
      const target: AccessibleOrganizationUnit | undefined = organizationUnits.find(
        (unit: AccessibleOrganizationUnit) => unit.id === switchingId,
      );

      return t('organization_unit.switcher.switching', {name: target?.name ?? switchingId ?? ''});
    }

    if (resolvedCurrentName) {
      return resolvedCurrentName;
    }

    return isLoading ? t('organization_unit.switcher.loading') : t('organization_unit.switcher.placeholder');
  };

  const pick = (unit: AccessibleOrganizationUnit): void => {
    setIsOpen(false);

    if (unit.id !== current) {
      onSwitch(unit);
    }
  };

  const menuContent = (): ReactNode => {
    if (isLoading) {
      return (
        <div role="status" className={cx(withVendorCSSClassPrefix(bem(BLOCK, 'loading')), styles['status'])}>
          <span aria-hidden="true">
            <Spinner size="small" />
          </span>
          <span>{t('organization_unit.switcher.loading')}</span>
        </div>
      );
    }

    if (organizationUnits.length === 0) {
      return (
        <p className={cx(withVendorCSSClassPrefix(bem(BLOCK, 'empty')), styles['status'])}>
          {error ?? t('organization_unit.switcher.empty')}
        </p>
      );
    }

    return (
      <div
        id={listId}
        role="listbox"
        aria-label={label || t('organization_unit.switcher.label')}
        className={cx(withVendorCSSClassPrefix(bem(BLOCK, 'list')), styles['list'])}
      >
        {organizationUnits.map((unit: AccessibleOrganizationUnit, index: number) => {
          const isCurrent: boolean = unit.id === current;

          return (
            <button
              key={unit.id}
              ref={(node: HTMLButtonElement | null): void => {
                listRef.current[index] = node;
              }}
              type="button"
              role="option"
              aria-selected={isCurrent}
              tabIndex={index === activeIndex ? 0 : -1}
              className={cx(
                withVendorCSSClassPrefix(bem(BLOCK, 'option', isCurrent ? 'current' : undefined)),
                styles['option'],
                isCurrent ? styles['optionCurrent'] : '',
              )}
              {...getItemProps({onClick: (): void => pick(unit)})}
            >
              <span className={styles['optionText']}>
                <span className={styles['optionName']}>{unit.name}</span>
                <span className={styles['optionHandle']}>{unit.handle}</span>
              </span>
              {isCurrent && (
                <span aria-hidden="true" className={styles['check']}>
                  <Check />
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className={cx(withVendorCSSClassPrefix(BLOCK), styles['root'], className)}>
      <button
        ref={refs.setReference}
        type="button"
        aria-controls={open ? listId : undefined}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={isSwitching}
        {...getReferenceProps()}
        className={cx(withVendorCSSClassPrefix(bem(BLOCK, 'field')), styles['field'])}
      >
        <span className={styles['fieldText']}>
          {label && <span className={cx(withVendorCSSClassPrefix(bem(BLOCK, 'label')), styles['label'])}>{label}</span>}
          <span className={cx(withVendorCSSClassPrefix(bem(BLOCK, 'value')), styles['value'])}>{fieldValue()}</span>
        </span>
        <span aria-hidden="true" className={cx(styles['chevron'], open ? styles['chevronOpen'] : '')}>
          {isSwitching ? <Spinner size="small" /> : <ChevronDown />}
        </span>
      </button>

      {error && (
        <div role="alert" className={cx(withVendorCSSClassPrefix(bem(BLOCK, 'error')), styles['error'])}>
          {error}
        </div>
      )}

      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} initialFocus={-1} modal={false}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className={cx(withVendorCSSClassPrefix(bem(BLOCK, 'menu')), styles['menu'])}
            >
              {menuContent()}
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
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </div>
  );
};

export default BaseOrganizationUnitSwitcher;
