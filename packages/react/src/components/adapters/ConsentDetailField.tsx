// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {bem, type ConsentDetailRow, withVendorCSSClassPrefix} from '@thunderid/browser';
import {type ChangeEvent, FC, type KeyboardEvent, ReactElement, ReactNode} from 'react';
import useStyles from './ConsentDetailField.styles';
import ConsentDetailText, {ConsentDetailToggle} from './ConsentDetailText';
import resolveConsentText from './resolveConsentText';
import useTheme from '../../contexts/Theme/useTheme';
import useConsentDetailField, {
  type ConsentDetailListItem,
  type UseConsentDetailFieldResult,
} from '../../hooks/useConsentDetailField';
import {UseTranslation} from '../../hooks/useTranslation';
import {cx} from '../../styles/emotion';
import formatConsentDetailValue from '../../utils/formatConsentDetailValue';
import {CONSENT_DETAIL_DISPLAY_LIMITS} from '../../utils/getConsentDetailLayout';
import isConsentDetailPlainList from '../../utils/isConsentDetailPlainList';
import isConsentDetailStructured from '../../utils/isConsentDetailStructured';
import TextField from '../primitives/TextField/TextField';

/**
 * Props for the ConsentDetailField component.
 */
export interface ConsentDetailFieldProps {
  /** Side the value is aligned to: `end` beside its label, `start` when stacked below it. Defaults to `end`. */
  align?: 'start' | 'end';
  /**
   * Render-props callback. When provided, the default field UI is replaced with whatever it returns, given
   * the field's headless state from `useConsentDetailField`.
   */
  children?: (field: UseConsentDetailFieldResult) => ReactNode;
  /** Current form values, holding the JSON text of each field the user changed. */
  formValues: Record<string, string>;
  /** Callback invoked with a consent form key and its new value. */
  onInputChange: (name: string, value: string) => void;
  /** The identifier of the authorization detail the field belongs to. */
  detailId: string;
  /** The identifier of the consent purpose the authorization detail belongs to. */
  purposeId: string;
  /** The field to render. */
  row: ConsentDetailRow;
  /** translation data */
  t?: UseTranslation['t'];
}

/**
 * Renders one field of an authorization detail. A field the user may modify before
 * approving is editable, bounded by the value that was shown: a number or a date can only move in
 * the allowed direction, and items can only be removed from, or added to, a list as its rule allows. Every other field is read-only.
 * A number or a date the user enters outside its bound, or that is not a value at all, is shown with an error and
 * is not submitted: the field's modification is cleared and the field is marked invalid, which blocks approval
 * until the user corrects it. The server checks whatever is submitted.
 */
const ConsentDetailField: FC<ConsentDetailFieldProps> = ({
  align = 'end',
  children = undefined,
  formValues,
  onInputChange,
  detailId,
  purposeId,
  row,
  t = undefined,
}: ConsentDetailFieldProps): ReactElement => {
  const field: UseConsentDetailFieldResult = useConsentDetailField({
    detailId,
    formValues,
    onInputChange,
    purposeId,
    row,
    t,
  });
  const {inputId, label, listDisplay} = field;
  const {theme, colorScheme}: ReturnType<typeof useTheme> = useTheme();
  const styles: Record<string, string> = useStyles(theme, colorScheme, align);
  const fieldClass: string = withVendorCSSClassPrefix(bem('consent-detail-field'));
  const collapse = (items: ReactNode[]): ReactNode[] => items.slice(0, listDisplay.visibleCount);
  const listToggle: ReactNode = listDisplay.isCollapsible && (
    <ConsentDetailToggle
      expanded={field.isListExpanded}
      hiddenCount={listDisplay.hiddenCount}
      onToggle={field.handleListToggle}
      t={t}
    />
  );
  const chipClass = (modifier: 'kept' | 'removed' | 'offered'): string =>
    cx(
      withVendorCSSClassPrefix(bem('consent-detail-field', 'chip')),
      withVendorCSSClassPrefix(bem('consent-detail-field', 'chip', modifier)),
      styles[`${modifier}Chip`],
    );
  const chipLabelClass: string = cx(
    withVendorCSSClassPrefix(bem('consent-detail-field', 'chip-label')),
    styles['chipLabel'],
  );
  const chipsClass: string = cx(
    fieldClass,
    withVendorCSSClassPrefix(bem('consent-detail-field', 'chips')),
    styles['chips'],
  );
  const inputClass: string = cx(
    fieldClass,
    withVendorCSSClassPrefix(bem('consent-detail-field', 'input')),
    styles['input'],
  );
  const valueClass: string = cx(fieldClass, withVendorCSSClassPrefix(bem('consent-detail-field', 'value')));

  if (children) {
    return <>{children(field)}</>;
  }

  if (field.kind === 'number' || field.kind === 'date') {
    return (
      <TextField
        id={inputId}
        className={inputClass}
        type={field.kind}
        step={field.kind === 'number' ? 'any' : undefined}
        aria-label={label}
        max={field.max}
        min={field.min}
        value={field.text}
        error={field.error?.message}
        onChange={(e: ChangeEvent<HTMLInputElement>): void => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      />
    );
  }

  if (field.kind === 'removeItems') {
    // A kept item can be removed, except the last one: to grant none of them the user declines the
    // detail instead. A removed item stays visible so the user can add it back.
    return (
      <div className={chipsClass} role="group" aria-label={label}>
        {collapse(
          field.items.map(({selected, toggleable, value}: ConsentDetailListItem, index: number) => (
            <button
              key={String(value)}
              id={`${inputId}_${index}`}
              type="button"
              className={chipClass(selected ? 'kept' : 'removed')}
              title={String(value)}
              aria-pressed={selected}
              aria-label={resolveConsentText(
                t,
                selected ? 'consent.authorization_details.remove_item' : 'consent.authorization_details.add_back_item',
                {item: String(value)},
              )}
              disabled={!toggleable}
              onClick={(): void => field.handleToggle(value)}
            >
              <span className={chipLabelClass}>{String(value)}</span>
              {selected && toggleable && <span aria-hidden="true">×</span>}
            </button>
          )),
        )}
        {listToggle}
      </div>
    );
  }

  if (field.kind === 'addItems') {
    // The items shown cannot be removed, since removing one would grant more. Items the user adds can be
    // taken out again before approving.
    return (
      <div className={chipsClass} role="group" aria-label={label}>
        {collapse(
          field.items.map(({origin, value}: ConsentDetailListItem, index: number) => {
            if (origin === 'shown') {
              return (
                <span
                  key={String(value)}
                  id={`${inputId}_${index}`}
                  className={chipClass('kept')}
                  title={String(value)}
                >
                  <span className={chipLabelClass}>{String(value)}</span>
                </span>
              );
            }
            return (
              <button
                key={`${origin}-${String(value)}`}
                id={`${inputId}_${origin}_${String(value)}`}
                type="button"
                className={chipClass(origin === 'added' ? 'kept' : 'offered')}
                title={String(value)}
                aria-label={resolveConsentText(
                  t,
                  origin === 'added'
                    ? 'consent.authorization_details.remove_item'
                    : 'consent.authorization_details.add_item',
                  {item: String(value)},
                )}
                onClick={(): void => field.handleToggle(value)}
              >
                <span className={chipLabelClass}>
                  {origin === 'offered' && '+ '}
                  {String(value)}
                </span>
                {origin === 'added' && <span aria-hidden="true">×</span>}
              </button>
            );
          }),
        )}
        {listToggle}
        {field.isTypedItemAllowed && (
          <TextField
            id={`${inputId}_new`}
            className={inputClass}
            aria-label={resolveConsentText(t, 'consent.authorization_details.new_item', {label})}
            value={field.text}
            onChange={(e: ChangeEvent<HTMLInputElement>): void => field.handleChange(e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>): void => {
              if (e.key === 'Enter') {
                e.preventDefault();
                field.handleAdd(e.currentTarget.value);
              }
            }}
          />
        )}
      </div>
    );
  }

  const textAlign: 'left' | 'right' = align === 'end' ? 'right' : 'left';

  // A long list of plain values shows its first items, the rest behind a toggle.
  if (isConsentDetailPlainList(row.value) && listDisplay.isCollapsible) {
    const items: (string | number | boolean)[] = row.value.slice(0, listDisplay.visibleCount);
    return (
      <div
        className={cx(fieldClass, withVendorCSSClassPrefix(bem('consent-detail-field', 'list')), styles['listText'])}
      >
        <ConsentDetailText
          align={textAlign}
          fontWeight="bold"
          maxChars={Number.POSITIVE_INFINITY}
          maxLines={Number.POSITIVE_INFINITY}
          text={formatConsentDetailValue(items)}
        />
        {listToggle}
      </div>
    );
  }

  // Structured JSON reads as an indented block rather than one long line.
  if (isConsentDetailStructured(row.value)) {
    return (
      <ConsentDetailText
        className={valueClass}
        monospace
        maxChars={Number.POSITIVE_INFINITY}
        maxLines={CONSENT_DETAIL_DISPLAY_LIMITS.structuredLines}
        t={t}
        text={formatConsentDetailValue(row.value, 2)}
      />
    );
  }

  return (
    <ConsentDetailText
      className={valueClass}
      align={textAlign}
      fontWeight="bold"
      maxChars={CONSENT_DETAIL_DISPLAY_LIMITS.valueChars}
      maxLines={CONSENT_DETAIL_DISPLAY_LIMITS.valueLines}
      t={t}
      text={formatConsentDetailValue(row.value)}
    />
  );
};

export default ConsentDetailField;
