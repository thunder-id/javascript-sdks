// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {bem, withVendorCSSClassPrefix} from '@thunderid/browser';
import type {
  EmbeddedFlowComponent,
  FetchPagedOptions,
  PagedSelectOption,
  PagedSelectOptionDefaults,
  PagedSelectOptionMapping,
} from '@thunderid/browser';
import {
  type Component,
  type PropType,
  type Ref,
  type VNode,
  defineComponent,
  h,
  onMounted,
  onUnmounted,
  ref,
} from 'vue';
import useI18n from '../../../composables/useI18n';
import usePagedSelect, {type UsePagedSelectResult} from '../../../composables/usePagedSelect';
import {CheckIcon, ChevronDownIcon} from '../Icons';
import Spinner from '../Spinner';

const SCROLL_NEAR_BOTTOM_THRESHOLD_PX = 64;

export interface PagedSelectMessages {
  ariaLabel: string;
  empty: string;
  loaded: (count: number) => string;
  loadMore: string;
  loading: string;
  loadingMore: string;
  retry: string;
}

const DEFAULT_MESSAGES: PagedSelectMessages = {
  ariaLabel: 'Select an option',
  empty: 'No results found.',
  loaded: (count: number): string => `${count} result${count === 1 ? '' : 's'} loaded.`,
  loadMore: 'Load more',
  loading: 'Loading…',
  loadingMore: 'Loading more…',
  retry: 'Retry',
};

type PagedSelectProps = Readonly<{
  component?: EmbeddedFlowComponent;
  defaults?: PagedSelectOptionDefaults;
  disabled: boolean;
  error: string | undefined;
  /** Loads one page at a time. Nothing is requested while this is unset. */
  fetchOptions?: FetchPagedOptions;
  filter: string | undefined;
  helperText: string | undefined;
  id: string | undefined;
  label: string | undefined;
  /** Which field of each raw item is the label and which is the value. */
  mapping?: PagedSelectOptionMapping;
  messages?: Partial<PagedSelectMessages>;
  modelValue: string;
  name: string | undefined;
  pageSize: number | undefined;
  placeholder: string | undefined;
  required: boolean;
}>;

/**
 * Single-choice dropdown whose options load a page at a time from `fetchOptions`. Vue counterpart of the React `PagedSelect`; specialised pickers wrap it with their own loader and wording.
 */
const PagedSelect: Component = defineComponent({
  name: 'PagedSelect',
  props: {
    component: {default: undefined, type: Object as PropType<EmbeddedFlowComponent>},
    defaults: {default: undefined, type: Object as PropType<PagedSelectOptionDefaults>},
    disabled: {default: false, type: Boolean},
    error: {default: undefined, type: String},
    fetchOptions: {default: undefined, type: Function as PropType<FetchPagedOptions>},
    filter: {default: undefined, type: String},
    helperText: {default: undefined, type: String},
    id: {default: undefined, type: String},
    label: {default: undefined, type: String},
    mapping: {default: undefined, type: Object as PropType<PagedSelectOptionMapping>},
    messages: {default: undefined, type: Object as PropType<Partial<PagedSelectMessages>>},
    modelValue: {default: '', type: String},
    name: {default: undefined, type: String},
    pageSize: {default: undefined, type: Number},
    placeholder: {default: undefined, type: String},
    required: {default: false, type: Boolean},
  },
  emits: ['update:modelValue'],
  setup(props: PagedSelectProps, {emit, attrs}): () => VNode {
    const {t} = useI18n();
    const px: typeof withVendorCSSClassPrefix = withVendorCSSClassPrefix;

    const isOpen: Ref<boolean> = ref(false);
    const activeIndex: Ref<number | null> = ref(null);
    const containerRef: Ref<HTMLElement | null> = ref(null);
    const panelRef: Ref<HTMLElement | null> = ref(null);
    const optionRefs: Ref<(HTMLElement | null)[]> = ref([]);

    const {
      abort,
      error: loadError,
      hasMore,
      isLoading,
      isLoadingMore,
      loadInitial,
      loadMore,
      options,
      retry,
    }: UsePagedSelectResult = usePagedSelect({
      component: props.component,
      defaults: props.defaults,
      fetchOptions: props.fetchOptions,
      fieldId: props.id ?? props.name,
      filter: props.filter,
      mapping: props.mapping,
      pageSize: props.pageSize,
    });

    const text = (): PagedSelectMessages => ({
      ariaLabel: t('elements.fields.paged_select.aria_label') || DEFAULT_MESSAGES.ariaLabel,
      empty: t('elements.fields.paged_select.empty') || DEFAULT_MESSAGES.empty,
      loaded: (count: number): string =>
        t('elements.fields.paged_select.loaded', {count}) || DEFAULT_MESSAGES.loaded(count),
      loadMore: t('elements.fields.paged_select.load_more') || DEFAULT_MESSAGES.loadMore,
      loading: t('elements.fields.paged_select.loading') || DEFAULT_MESSAGES.loading,
      loadingMore: t('elements.fields.paged_select.loading_more') || DEFAULT_MESSAGES.loadingMore,
      retry: t('elements.fields.paged_select.retry') || DEFAULT_MESSAGES.retry,
      ...props.messages,
    });

    const closePanel = (): void => {
      isOpen.value = false;
      activeIndex.value = null;
      abort();
    };

    const openPanel = (): void => {
      if (props.disabled) return;
      isOpen.value = true;
      loadInitial();
    };

    const togglePanel = (): void => {
      if (isOpen.value) {
        closePanel();
      } else {
        openPanel();
      }
    };

    const handleClickOutside = (event: MouseEvent): void => {
      if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
        closePanel();
      }
    };

    const focusOption = (index: number): void => {
      activeIndex.value = index;
      optionRefs.value[index]?.focus();
    };

    const moveActive = (delta: number): void => {
      if (options.value.length === 0) return;
      const enabledIndices: number[] = options.value
        .map((option: PagedSelectOption, index: number) => (option.disabled ? -1 : index))
        .filter((index: number) => index >= 0);
      if (enabledIndices.length === 0) return;

      const currentPos: number = activeIndex.value === null ? -1 : enabledIndices.indexOf(activeIndex.value);
      const nextPos: number = (currentPos + delta + enabledIndices.length) % enabledIndices.length;
      focusOption(enabledIndices[nextPos]);
    };

    const handleSelect = (option: PagedSelectOption): void => {
      if (option.disabled) return;
      emit('update:modelValue', option.value);
      closePanel();
      containerRef.value?.querySelector<HTMLElement>(`.${px('paged-select__trigger')}`)?.focus();
    };

    const handleTriggerKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (!isOpen.value) {
          openPanel();
        } else if (event.key === 'ArrowDown') {
          moveActive(1);
        } else if (event.key === 'ArrowUp') {
          moveActive(-1);
        }
      } else if (event.key === 'Escape' && isOpen.value) {
        event.preventDefault();
        closePanel();
      }
    };

    const handlePanelKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveActive(1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveActive(-1);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        closePanel();
        containerRef.value?.querySelector<HTMLElement>(`.${px('paged-select__trigger')}`)?.focus();
      } else if (event.key === 'Enter' || event.key === ' ') {
        if (activeIndex.value !== null) {
          event.preventDefault();
          const option: PagedSelectOption | undefined = options.value[activeIndex.value];
          if (option) handleSelect(option);
        }
      }
    };

    const handleScroll = (event: Event): void => {
      const target = event.currentTarget as HTMLElement;
      if (target.scrollHeight - target.scrollTop - target.clientHeight <= SCROLL_NEAR_BOTTOM_THRESHOLD_PX) {
        loadMore();
      }
    };

    onMounted((): void => {
      document.addEventListener('click', handleClickOutside);
    });

    onUnmounted((): void => {
      document.removeEventListener('click', handleClickOutside);
      abort();
    });

    return (): VNode => {
      const messages: PagedSelectMessages = text();
      const hasError = !!props.error;
      const selectedOption: PagedSelectOption | undefined = options.value.find(
        (option: PagedSelectOption) => option.value === props.modelValue,
      );
      const triggerLabel: string = props.modelValue ? (selectedOption?.label ?? props.modelValue) : '';
      const errorText: string | null = loadError.value
        ? (loadError.value.message ?? t(loadError.value.messageKey))
        : null;
      const statusMessage: string = isLoading.value
        ? messages.loading
        : (errorText ?? messages.loaded(options.value.length));

      const wrapperClass: string = [
        withVendorCSSClassPrefix(bem('paged-select')),
        hasError ? withVendorCSSClassPrefix(bem('paged-select', undefined, 'error')) : '',
        (attrs.class as string) || '',
      ]
        .filter(Boolean)
        .join(' ');

      const panelChildren: (VNode | null)[] = [];

      if (isLoading.value && options.value.length === 0) {
        panelChildren.push(
          h('div', {class: px('paged-select__status-row')}, [h(Spinner, {size: 'small'}), messages.loading]),
        );
      }

      if (!isLoading.value && errorText && options.value.length === 0) {
        panelChildren.push(
          h('div', {class: px('paged-select__status-row')}, [
            h('span', null, errorText),
            h('button', {class: px('paged-select__retry'), onClick: retry, type: 'button'}, messages.retry),
          ]),
        );
      }

      if (!isLoading.value && !errorText && options.value.length === 0 && !hasMore.value) {
        panelChildren.push(h('div', {class: px('paged-select__status-row')}, messages.empty));
      }

      options.value.forEach((option: PagedSelectOption, index: number) => {
        const isSelected: boolean = option.value === props.modelValue;
        panelChildren.push(
          h(
            'button',
            {
              'aria-selected': isSelected,
              class: [
                px('paged-select__option'),
                isSelected ? px('paged-select__option--selected') : '',
                activeIndex.value === index ? px('paged-select__option--active') : '',
              ]
                .filter(Boolean)
                .join(' '),
              disabled: option.disabled,
              key: option.value,
              onClick: () => handleSelect(option),
              ref: (el) => {
                optionRefs.value[index] = el as HTMLElement | null;
              },
              role: 'option',
              tabindex: activeIndex.value === index ? 0 : -1,
              type: 'button',
            },
            [isSelected ? h(CheckIcon) : null, h('span', {class: px('paged-select__option-label')}, option.label)],
          ),
        );
      });

      if (isLoadingMore.value) {
        panelChildren.push(
          h('div', {class: px('paged-select__status-row')}, [h(Spinner, {size: 'small'}), messages.loadingMore]),
        );
      }

      if (!isLoadingMore.value && errorText && options.value.length > 0) {
        panelChildren.push(
          h('div', {class: px('paged-select__status-row')}, [
            h('span', null, errorText),
            h('button', {class: px('paged-select__retry'), onClick: retry, type: 'button'}, messages.retry),
          ]),
        );
      }

      if (!isLoadingMore.value && !errorText && hasMore.value) {
        panelChildren.push(
          h('button', {class: px('paged-select__load-more'), onClick: loadMore, type: 'button'}, messages.loadMore),
        );
      }

      return h('div', {class: wrapperClass}, [
        props.label
          ? h('label', {class: px('paged-select__label'), for: props.name}, [
              props.label,
              props.required ? h('span', {class: px('paged-select__required')}, ' *') : null,
            ])
          : null,
        h('div', {ref: containerRef, style: {position: 'relative'}}, [
          h(
            'button',
            {
              'aria-expanded': isOpen.value,
              'aria-haspopup': 'listbox',
              'aria-label': props.label ?? props.placeholder ?? messages.ariaLabel,
              class: px('paged-select__trigger'),
              disabled: props.disabled,
              id: props.id,
              name: props.name,
              onClick: togglePanel,
              onKeydown: handleTriggerKeyDown,
              type: 'button',
            },
            [
              h('span', {class: px('paged-select__trigger-label')}, triggerLabel || props.placeholder),
              h('span', {class: px('paged-select__chevron')}, [h(ChevronDownIcon)]),
            ],
          ),
          isOpen.value
            ? h(
                'div',
                {
                  'aria-label': props.label ?? messages.ariaLabel,
                  class: px('paged-select__panel'),
                  onKeydown: handlePanelKeyDown,
                  onScroll: handleScroll,
                  ref: panelRef,
                  role: 'listbox',
                },
                panelChildren.filter(Boolean),
              )
            : null,
        ]),
        hasError
          ? h('span', {class: px('paged-select__error')}, props.error)
          : props.helperText
            ? h('span', {class: px('paged-select__helper')}, props.helperText)
            : null,
        h('span', {'aria-live': 'polite', class: px('paged-select__visually-hidden')}, statusMessage),
      ]);
    };
  },
});

export default PagedSelect;
export type {PagedSelectProps};
