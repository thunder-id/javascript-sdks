// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type AccessibleOrganizationUnit, type Preferences, withVendorCSSClassPrefix} from '@thunderid/browser';
import {
  type Component,
  type PropType,
  type Ref,
  type SetupContext,
  type VNode,
  defineComponent,
  h,
  nextTick,
  onBeforeUnmount,
  ref,
  useId,
  watch,
} from 'vue';
import useAdminTranslation, {type AdminTranslate} from '../../management/shared/useAdminTranslation';
import Button from '../../primitives/Button/Button';
import {CheckIcon, ChevronDownIcon} from '../../primitives/Icons';
import Spinner from '../../primitives/Spinner/Spinner';

type BaseOrganizationUnitSwitcherProps = Readonly<{
  className: string;
  current: string | null;
  currentName: string | null;
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
  /** Name of the current organization unit, from the page or the session, or `null` when unknown. */
  currentName: string | null;
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
 * Organization unit picker: a field showing the current unit under a small label, which opens a menu of
 * the units to switch to. Holds no data of its own: pass the units and handle `switch` and `page-change`.
 * The default scoped slot replaces the built-in UI and receives {@link OrganizationUnitSwitcherRenderProps}.
 */
const BaseOrganizationUnitSwitcher: Component = defineComponent({
  name: 'BaseOrganizationUnitSwitcher',
  props: {
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** Identifier of the current organization unit. */
    current: {default: null, type: String as PropType<string | null>},
    /** Name of the current organization unit, shown when the page does not list it. */
    currentName: {default: null, type: String as PropType<string | null>},
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
    /** Overrides the small label above the current unit. An empty string omits it. */
    title: {default: undefined, type: String},
    /** Number of units the listing matches. */
    totalResults: {default: 0, type: Number},
  },
  setup(props: BaseOrganizationUnitSwitcherProps, {slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const listId: string = useId();
    const root: Ref<HTMLElement | null> = ref(null);
    const trigger: Ref<HTMLButtonElement | null> = ref(null);
    const isOpen: Ref<boolean> = ref(false);
    const activeIndex: Ref<number | null> = ref(null);
    const optionElements: (HTMLElement | null)[] = [];

    const currentIndex = (): number =>
      props.organizationUnits.findIndex((unit: AccessibleOrganizationUnit) => unit.id === props.current);

    const pageChange = (offset: number): void => {
      props.onPageChange?.(Math.max(0, offset));
    };
    const switchTo = (unit: AccessibleOrganizationUnit): void => {
      if (unit.id !== props.current && !props.switchingId) {
        props.onSwitch?.(unit);
      }
    };

    const close = (returnFocus = false): void => {
      isOpen.value = false;
      activeIndex.value = null;

      if (returnFocus) {
        trigger.value?.focus();
      }
    };

    const focusOption = (index: number): void => {
      const count: number = props.organizationUnits.length;

      if (count === 0) {
        return;
      }

      const target: number = ((index % count) + count) % count;
      activeIndex.value = target;

      if (optionElements[target]) {
        optionElements[target]?.focus();
      } else {
        void nextTick(() => optionElements[target]?.focus());
      }
    };

    const open = (focusIndex?: number): void => {
      if (props.switchingId) {
        return;
      }

      isOpen.value = true;

      if (focusIndex !== undefined) {
        focusOption(focusIndex);
      }
    };

    const pick = (unit: AccessibleOrganizationUnit): void => {
      close();
      switchTo(unit);
    };

    // Arrows move from the focused unit, or from the current one when none has focus yet.
    const arrow = (event: KeyboardEvent): boolean => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
        return false;
      }

      event.preventDefault();
      const count: number = props.organizationUnits.length;
      const down: boolean = event.key === 'ArrowDown';
      const step: number = down ? 1 : -1;
      const selected: number = currentIndex();
      // Moves start from the current unit, or from just outside the end of the list they enter from.
      let from: number = down ? -1 : count;

      if (selected >= 0) {
        from = selected;
      }

      if (!isOpen.value) {
        // Opening lands on the current unit, or on the first or last one.
        const start: number = selected >= 0 ? selected : from + step;
        open(count > 0 ? start : undefined);

        return true;
      }

      focusOption((activeIndex.value ?? from) + step);

      return true;
    };

    const onListKeydown = (event: KeyboardEvent): void => {
      if (arrow(event)) {
        return;
      }

      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        focusOption(event.key === 'Home' ? 0 : props.organizationUnits.length - 1);
      } else if (event.key === 'Tab') {
        close();
      }
    };

    const onDocumentMousedown = (event: MouseEvent): void => {
      if (!root.value?.contains(event.target as Node)) {
        close();
      }
    };
    const onDocumentKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
      }
    };
    const listen = (on: boolean): void => {
      const method: 'addEventListener' | 'removeEventListener' = on ? 'addEventListener' : 'removeEventListener';
      document[method]('mousedown', onDocumentMousedown as EventListener);
      document[method]('keydown', onDocumentKeydown as EventListener);
    };

    watch(isOpen, (value: boolean) => listen(value));
    watch(
      () => props.switchingId,
      (value: string | null) => {
        if (value) {
          close();
        }
      },
    );
    onBeforeUnmount(() => listen(false));

    const fieldValue = (currentName: string | null): string => {
      if (props.switchingId) {
        const target: AccessibleOrganizationUnit | undefined = props.organizationUnits.find(
          (unit: AccessibleOrganizationUnit) => unit.id === props.switchingId,
        );

        return t('organization_unit.switcher.switching', {name: target?.name ?? props.switchingId});
      }

      if (currentName) {
        return currentName;
      }

      return props.isLoading ? t('organization_unit.switcher.loading') : t('organization_unit.switcher.placeholder');
    };

    const menuContent = (label: string): VNode => {
      if (props.isLoading) {
        return h('div', {class: cls('__status'), role: 'status'}, [
          h('span', {'aria-hidden': 'true'}, [h(Spinner, {size: 'small'})]),
          h('span', t('organization_unit.switcher.loading')),
        ]);
      }

      if (props.organizationUnits.length === 0) {
        return h('p', {class: cls('__status')}, props.error ?? t('organization_unit.switcher.empty'));
      }

      optionElements.length = 0;

      return h(
        'div',
        {
          'aria-label': label || t('organization_unit.switcher.label'),
          class: cls('__list'),
          id: listId,
          onKeydown: onListKeydown,
          role: 'listbox',
        },
        props.organizationUnits.map((unit: AccessibleOrganizationUnit, index: number) => {
          const isCurrent: boolean = unit.id === props.current;

          return h(
            'button',
            {
              'aria-selected': isCurrent ? 'true' : 'false',
              class: [cls('__option'), isCurrent ? cls('__option--current') : ''].filter(Boolean).join(' '),
              'data-ou-id': unit.id,
              key: unit.id,
              onClick: (): void => pick(unit),
              ref: (element: unknown): void => {
                optionElements[index] = element as HTMLElement | null;
              },
              role: 'option',
              tabindex: activeIndex.value === index ? 0 : -1,
              type: 'button',
            },
            [
              h('span', {class: cls('__option-text')}, [
                h('span', {class: cls('__option-name')}, unit.name),
                h('span', {class: cls('__option-handle')}, unit.handle),
              ]),
              isCurrent ? h('span', {'aria-hidden': 'true', class: cls('__check')}, [h(CheckIcon)]) : null,
            ],
          );
        }),
      );
    };

    return (): VNode => {
      const rootClass: string = [cls(''), props.className].filter(Boolean).join(' ');
      const currentName: string | null = props.organizationUnits[currentIndex()]?.name ?? props.currentName;

      if (slots['default']) {
        const renderProps: OrganizationUnitSwitcherRenderProps = {
          current: props.current,
          currentName,
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

      const label: string = props.title ?? t('organization_unit.switcher.label');
      const menuOpen: boolean = isOpen.value && !props.switchingId;
      const hasPrevious: boolean = props.offset > 0;
      const hasNext: boolean = props.offset + props.limit < props.totalResults;

      return h('div', {class: rootClass, ref: root}, [
        h(
          'button',
          {
            'aria-controls': menuOpen ? listId : undefined,
            'aria-expanded': menuOpen ? 'true' : 'false',
            'aria-haspopup': 'listbox',
            class: cls('__field'),
            disabled: Boolean(props.switchingId),
            onClick: (): void => (isOpen.value ? close() : open()),
            onKeydown: arrow,
            ref: trigger,
            type: 'button',
          },
          [
            h('span', {class: cls('__field-text')}, [
              label ? h('span', {class: cls('__label')}, label) : null,
              h('span', {class: cls('__value')}, fieldValue(currentName)),
            ]),
            h(
              'span',
              {'aria-hidden': 'true', class: [cls('__chevron'), menuOpen ? cls('__chevron--open') : ''].join(' ')},
              [props.switchingId ? h(Spinner, {size: 'small'}) : h(ChevronDownIcon)],
            ),
          ],
        ),
        props.error ? h('div', {class: cls('__error'), role: 'alert'}, props.error) : null,
        menuOpen
          ? h('div', {class: cls('__menu')}, [
              menuContent(label),
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
            ])
          : null,
      ]);
    };
  },
});

export default BaseOrganizationUnitSwitcher;
