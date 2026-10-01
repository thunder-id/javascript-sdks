// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset as floatingOffset,
  shift,
  size as floatingSize,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
  useRole,
} from '@floating-ui/react';
import type {MiddlewareState} from '@floating-ui/react';
import {bem, withVendorCSSClassPrefix} from '@thunderid/browser';
import type {
  EmbeddedFlowComponent,
  FetchPagedOptions,
  PagedSelectOption,
  PagedSelectOptionDefaults,
  PagedSelectOptionMapping,
} from '@thunderid/browser';
import {FC, UIEvent, useMemo, useRef, useState} from 'react';
import useStyles from './PagedSelect.styles';
import useTheme from '../../../contexts/Theme/useTheme';
import usePagedSelect from '../../../hooks/usePagedSelect';
import useTranslation from '../../../hooks/useTranslation';
import {cx} from '../../../styles/emotion';
import FormControl from '../FormControl/FormControl';
import Check from '../Icons/Check';
import ChevronDown from '../Icons/ChevronDown';
import InputLabel from '../InputLabel/InputLabel';
import Spinner from '../Spinner/Spinner';

const SCROLL_NEAR_BOTTOM_THRESHOLD_PX = 64;

export interface PagedSelectChangeEvent {
  target: {value: string};
}

export interface PagedSelectMessages {
  ariaLabel: string;
  empty: string;
  loaded: (count: number) => string;
  loadMore: string;
  loading: string;
  loadingMore: string;
  retry: string;
}

export interface PagedSelectProps {
  className?: string;
  component?: EmbeddedFlowComponent;
  defaults?: PagedSelectOptionDefaults;
  disabled?: boolean;
  error?: string;
  /** Loads one page at a time. Nothing is requested while this is unset. */
  fetchOptions?: FetchPagedOptions;
  filter?: string;
  helperText?: string;
  id?: string;
  label?: string;
  /** Which field of each raw item is the label and which is the value. */
  mapping?: PagedSelectOptionMapping;
  messages?: Partial<PagedSelectMessages>;
  name?: string;
  onBlur?: () => void;
  onChange?: (event: PagedSelectChangeEvent) => void;
  pageSize?: number;
  placeholder?: string;
  required?: boolean;
  /** The selected value, or an empty string when nothing is selected. */
  value?: string;
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

/**
 * Single-choice dropdown whose options load a page at a time from `fetchOptions`. Specialised
 * pickers (users, emails, ...) wrap it with their own loader, defaults, and wording.
 */
const PagedSelect: FC<PagedSelectProps> = ({
  className,
  component,
  defaults,
  disabled = false,
  error,
  fetchOptions,
  filter,
  helperText,
  id,
  label,
  mapping,
  messages,
  name,
  onBlur,
  onChange,
  pageSize,
  placeholder,
  required,
  value = '',
}: PagedSelectProps) => {
  const {theme, colorScheme}: ReturnType<typeof useTheme> = useTheme();
  const {t} = useTranslation();
  const hasError = !!error;
  const styles: Record<string, string> = useStyles(theme, colorScheme, disabled, hasError);
  const text: PagedSelectMessages = {
    ariaLabel: t('elements.fields.paged_select.aria_label') || DEFAULT_MESSAGES.ariaLabel,
    empty: t('elements.fields.paged_select.empty') || DEFAULT_MESSAGES.empty,
    loaded: (count: number): string =>
      t('elements.fields.paged_select.loaded', {count}) || DEFAULT_MESSAGES.loaded(count),
    loadMore: t('elements.fields.paged_select.load_more') || DEFAULT_MESSAGES.loadMore,
    loading: t('elements.fields.paged_select.loading') || DEFAULT_MESSAGES.loading,
    loadingMore: t('elements.fields.paged_select.loading_more') || DEFAULT_MESSAGES.loadingMore,
    retry: t('elements.fields.paged_select.retry') || DEFAULT_MESSAGES.retry,
    ...messages,
  };

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const listRef = useRef<(HTMLElement | null)[]>([]);

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
  } = usePagedSelect({component, defaults, fetchOptions, fieldId: id ?? name, filter, mapping, pageSize});

  const {refs, floatingStyles, context} = useFloating({
    middleware: [
      floatingOffset(4),
      flip(),
      shift(),
      floatingSize({
        apply({rects, elements}: MiddlewareState): void {
          Object.assign(elements.floating.style, {width: `${rects.reference.width}px`});
        },
      }),
    ],
    onOpenChange: (open: boolean): void => {
      setIsOpen(open);
      if (open) {
        loadInitial();
      } else {
        abort();
        setActiveIndex(null);
      }
    },
    open: isOpen,
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
  });

  const disabledIndices: number[] = useMemo(
    () => options.reduce<number[]>((acc, option, index) => (option.disabled ? [...acc, index] : acc), []),
    [options],
  );

  const click: ReturnType<typeof useClick> = useClick(context, {enabled: !disabled});
  const dismiss: ReturnType<typeof useDismiss> = useDismiss(context);
  const role: ReturnType<typeof useRole> = useRole(context, {role: 'listbox'});
  const listNavigation: ReturnType<typeof useListNavigation> = useListNavigation(context, {
    activeIndex,
    disabledIndices,
    listRef,
    loop: true,
    onNavigate: setActiveIndex,
  });
  const {getReferenceProps, getFloatingProps, getItemProps} = useInteractions([click, dismiss, role, listNavigation]);

  const handleScroll = (event: UIEvent<HTMLDivElement>): void => {
    const target = event.currentTarget;

    if (target.scrollHeight - target.scrollTop - target.clientHeight <= SCROLL_NEAR_BOTTOM_THRESHOLD_PX) {
      loadMore();
    }
  };

  const handleSelect = (option: PagedSelectOption): void => {
    if (option.disabled) {
      return;
    }
    onChange?.({target: {value: option.value}});
    setIsOpen(false);
  };

  const selectedOption: PagedSelectOption | undefined = options.find(
    (option: PagedSelectOption) => option.value === value,
  );
  const triggerLabel: string = value ? (selectedOption?.label ?? value) : '';
  const errorText: string | null = loadError ? (loadError.message ?? t(loadError.messageKey)) : null;
  const statusMessage: string = isLoading ? text.loading : (errorText ?? text.loaded(options.length));

  return (
    <FormControl
      error={error}
      helperText={helperText}
      className={cx(withVendorCSSClassPrefix(bem('paged-select')), className)}
    >
      {label && (
        <InputLabel required={required} error={hasError}>
          {label}
        </InputLabel>
      )}
      <div className={styles['root']}>
        <button
          ref={refs.setReference}
          type="button"
          id={id}
          name={name}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-label={label ?? placeholder ?? text.ariaLabel}
          {...getReferenceProps({onBlur})}
          className={cx(
            withVendorCSSClassPrefix(bem('paged-select', 'trigger')),
            styles['trigger'],
            hasError && styles['triggerError'],
            disabled && styles['triggerDisabled'],
          )}
        >
          <span className={styles['triggerLabel']}>{triggerLabel || placeholder}</span>
          <ChevronDown />
        </button>

        {isOpen && (
          <FloatingPortal>
            {/* initialFocus={-1}: options are roving-tabindex (-1), so the default "first tabbable" would be the Load more button, and focusing it scrolls the list to the bottom and pages in more results. */}
            <FloatingFocusManager context={context} initialFocus={-1} modal={false}>
              <div
                ref={refs.setFloating}
                style={floatingStyles}
                {...getFloatingProps({onScroll: handleScroll})}
                className={styles['content']}
                role="listbox"
                aria-label={label ?? text.ariaLabel}
              >
                {isLoading && options.length === 0 && (
                  <div className={styles['statusRow']}>
                    <Spinner size="small" /> {text.loading}
                  </div>
                )}

                {!isLoading && errorText && options.length === 0 && (
                  <div className={styles['statusRow']}>
                    <span>{errorText}</span>
                    <button type="button" className={styles['retryButton']} onClick={retry}>
                      {text.retry}
                    </button>
                  </div>
                )}

                {!isLoading && !errorText && options.length === 0 && !hasMore && (
                  <div className={styles['statusRow']}>{text.empty}</div>
                )}

                {options.map((option: PagedSelectOption, index: number) => (
                  <button
                    key={option.value}
                    ref={(node: HTMLButtonElement | null) => {
                      listRef.current[index] = node;
                    }}
                    type="button"
                    role="option"
                    disabled={option.disabled}
                    aria-selected={option.value === value}
                    tabIndex={activeIndex === index ? 0 : -1}
                    className={cx(styles['option'], option.value === value && styles['optionActive'])}
                    {...getItemProps({onClick: () => handleSelect(option)})}
                  >
                    {option.value === value && <Check />}
                    <span className={styles['optionLabel']}>{option.label}</span>
                  </button>
                ))}

                {isLoadingMore && (
                  <div className={styles['statusRow']}>
                    <Spinner size="small" /> {text.loadingMore}
                  </div>
                )}

                {!isLoadingMore && errorText && options.length > 0 && (
                  <div className={styles['statusRow']}>
                    <span>{errorText}</span>
                    <button type="button" className={styles['retryButton']} onClick={retry}>
                      {text.retry}
                    </button>
                  </div>
                )}

                {!isLoadingMore && !errorText && hasMore && (
                  <button type="button" className={styles['loadMore']} onClick={loadMore}>
                    {text.loadMore}
                  </button>
                )}
              </div>
            </FloatingFocusManager>
          </FloatingPortal>
        )}
      </div>
      <span aria-live="polite" className={styles['visuallyHidden']}>
        {statusMessage}
      </span>
    </FormControl>
  );
};

export default PagedSelect;
