// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type AccessibleOrganizationUnit, type Preferences, withVendorCSSClassPrefix} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';
import useAdminTranslation, {type AdminTranslate} from '../../management/shared/useAdminTranslation';
import Alert from '../../primitives/Alert/Alert';
import Button from '../../primitives/Button/Button';
import Spinner from '../../primitives/Spinner/Spinner';

type BaseOrganizationUnitSwitcherProps = Readonly<{
  className: string;
  current: string | null;
  error: string | null;
  isLoading: boolean;
  limit: number;
  offset: number;
  onPageChange: ((offset: number) => void) | undefined;
  onSwitch: ((unit: AccessibleOrganizationUnit) => void) | undefined;
  organizationUnits: AccessibleOrganizationUnit[];
  preferences: Preferences | undefined;
  switchingId: string | null;
  title: string | undefined;
  totalResults: number;
}>;

export type {BaseOrganizationUnitSwitcherProps};

/**
 * What the switcher hands its default scoped slot, so the units can be drawn with any UI while the
 * component keeps the loading, paging and switching.
 */
export interface OrganizationUnitSwitcherRenderProps {
  /** Identifier of the current organization unit, or `null` when unknown. */
  current: string | null;
  /** An error message, already translated. */
  error: string | null;
  isLoading: boolean;
  limit: number;
  offset: number;
  /** Loads the page starting at `offset`. */
  onPageChange: (offset: number) => void;
  /** Switches to the unit (or hands it to `onSelect`, when the app takes over). */
  onSwitch: (unit: AccessibleOrganizationUnit) => void;
  organizationUnits: AccessibleOrganizationUnit[];
  /** Identifier of the unit a switch is in progress to, or `null`. */
  switchingId: string | null;
  totalResults: number;
}

const cls = (element: string): string => withVendorCSSClassPrefix(`organization-unit-switcher${element}`);

/**
 * Lists organization units, marks the current one, and offers a switch to each of the others. Holds no
 * data of its own: pass the units and handle `switch` and `page-change`. The default scoped slot replaces
 * the built-in UI and receives {@link OrganizationUnitSwitcherRenderProps}.
 */
const BaseOrganizationUnitSwitcher: Component = defineComponent({
  name: 'BaseOrganizationUnitSwitcher',
  props: {
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** Identifier of the current organization unit. */
    current: {default: null, type: String as PropType<string | null>},
    /** An error message, already translated. */
    error: {default: null, type: String as PropType<string | null>},
    isLoading: {default: false, type: Boolean},
    /** Page size. */
    limit: {default: 10, type: Number},
    /** Zero-based offset of the page shown. */
    offset: {default: 0, type: Number},
    /** Loads another page. Also available as `@page-change`. */
    onPageChange: {default: undefined, type: Function as PropType<(offset: number) => void>},
    /** Switches to a unit. Also available as `@switch`. */
    onSwitch: {default: undefined, type: Function as PropType<(unit: AccessibleOrganizationUnit) => void>},
    /** The units to list. */
    organizationUnits: {default: () => [], type: Array as PropType<AccessibleOrganizationUnit[]>},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    /** Identifier of the unit a switch is in progress to. */
    switchingId: {default: null, type: String as PropType<string | null>},
    /** Overrides the default heading. An empty string omits it. */
    title: {default: undefined, type: String},
    /** Number of units the listing matches. */
    totalResults: {default: 0, type: Number},
  },
  setup(props: BaseOrganizationUnitSwitcherProps, {slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);

    const pageChange = (offset: number): void => {
      props.onPageChange?.(Math.max(0, offset));
    };
    const switchTo = (unit: AccessibleOrganizationUnit): void => {
      if (unit.id !== props.current && !props.switchingId) {
        props.onSwitch?.(unit);
      }
    };

    return (): VNode => {
      const rootClass: string = [cls(''), props.className].filter(Boolean).join(' ');

      if (slots['default']) {
        const renderProps: OrganizationUnitSwitcherRenderProps = {
          current: props.current,
          error: props.error,
          isLoading: props.isLoading,
          limit: props.limit,
          offset: props.offset,
          onPageChange: pageChange,
          onSwitch: switchTo,
          organizationUnits: props.organizationUnits,
          switchingId: props.switchingId,
          totalResults: props.totalResults,
        };

        return h('div', {class: rootClass}, slots['default'](renderProps));
      }

      const heading: string = props.title ?? t('organization_unit.switcher.heading');
      const hasPrevious: boolean = props.offset > 0;
      const hasNext: boolean = props.offset + props.limit < props.totalResults;

      return h('section', {'aria-label': t('organization_unit.switcher.label'), class: rootClass}, [
        heading ? h('h2', {class: cls('__heading')}, heading) : null,
        props.error ? h(Alert, {severity: 'error'}, {default: (): string[] => [props.error!]}) : null,
        props.isLoading
          ? h('span', {class: cls('__status'), role: 'status'}, [
              h(Spinner, {'aria-hidden': 'true', size: 'small'}),
              t('organization_unit.switcher.loading'),
            ])
          : null,
        !props.isLoading && props.organizationUnits.length === 0 && !props.error
          ? h('p', {class: cls('__empty')}, t('organization_unit.switcher.empty'))
          : null,
        props.organizationUnits.length > 0
          ? h(
              'ul',
              {class: cls('__list')},
              props.organizationUnits.map((unit: AccessibleOrganizationUnit) => {
                const isCurrent: boolean = unit.id === props.current;
                const isSwitching: boolean = unit.id === props.switchingId;

                return h(
                  'li',
                  {
                    'aria-current': isCurrent ? 'true' : undefined,
                    class: [cls('__item'), isCurrent ? cls('__item--current') : ''].filter(Boolean).join(' '),
                    'data-ou-id': unit.id,
                    key: unit.id,
                  },
                  [
                    h('span', {class: cls('__names')}, [
                      h('span', {class: cls('__name')}, unit.name),
                      h('span', {class: cls('__handle')}, unit.handle),
                    ]),
                    isCurrent
                      ? h('span', {class: cls('__current')}, t('organization_unit.switcher.current'))
                      : h(
                          Button,
                          {
                            disabled: Boolean(props.switchingId),
                            loading: isSwitching,
                            onClick: (): void => switchTo(unit),
                            size: 'small',
                            variant: 'outline',
                          },
                          {
                            default: (): string =>
                              isSwitching
                                ? t('organization_unit.switcher.switching')
                                : t('organization_unit.switcher.switch'),
                          },
                        ),
                  ],
                );
              }),
            )
          : null,
        hasPrevious || hasNext
          ? h('div', {class: cls('__pagination')}, [
              h(
                Button,
                {
                  disabled: !hasPrevious || props.isLoading,
                  onClick: (): void => pageChange(props.offset - props.limit),
                  size: 'small',
                  variant: 'text',
                },
                {default: (): string => t('organization_unit.switcher.previous')},
              ),
              h(
                Button,
                {
                  disabled: !hasNext || props.isLoading,
                  onClick: (): void => pageChange(props.offset + props.limit),
                  size: 'small',
                  variant: 'text',
                },
                {default: (): string => t('organization_unit.switcher.next')},
              ),
            ])
          : null,
      ]);
    };
  },
});

export default BaseOrganizationUnitSwitcher;
