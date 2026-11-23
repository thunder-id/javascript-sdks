// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  type ConsentDetailInputAttributes,
  type ConsentDetailInputError,
  type ConsentDetailRow,
  getConsentDetailDescriptionId,
  getConsentDetailFewestItems,
  getConsentDetailInputAttributes,
  getConsentDetailInputError,
  getConsentInvalidKey,
  getConsentModifiedKey,
} from '@thunderid/browser';
import {useState} from 'react';
import resolveConsentText from '../../components/auth/flow/resolveConsentText';
import getConsentDetailListDisplay, {type ConsentDetailListDisplay} from '../../utils/getConsentDetailListDisplay';
import isConsentDetailPlainList from '../../utils/isConsentDetailPlainList';
import {UseTranslation} from '../useTranslation';

/**
 * How the user may change one field of an authorization detail on the consent screen: type a lower or
 * higher `number` or `date`, or toggle items of a list whose rule is `removeItems` or `addItems`.
 *
 * @experimental This type may change in future versions
 */
export type ConsentDetailInputKind = 'number' | 'date' | 'removeItems' | 'addItems';

/**
 * Outcome of the text a user entered into a `number` or `date` authorization detail field.
 *
 * @experimental This interface may change in future versions
 */
interface ConsentDetailInputResult {
  /** Why the text cannot be submitted, absent when it can. */
  error?: ConsentDetailInputError;
  /**
   * Form values to write, keyed by form key: the field's modified value, cleared when the text cannot be
   * submitted, and its invalid marker.
   */
  formValues: Record<string, string>;
  /** Whether the text may be submitted. */
  isValid: boolean;
}

/**
 * One item of a list field of an authorization detail, as the consent screen offers it.
 *
 * @experimental This interface may change in future versions
 */
export interface ConsentDetailListItem {
  /**
   * Where the item comes from: `shown` in the requested detail, `added` by the user, or `offered` by the
   * type for the user to add.
   */
  origin: 'shown' | 'added' | 'offered';
  /** Whether the item is part of the value that would be granted. */
  selected: boolean;
  /** Whether the user may toggle the item. */
  toggleable: boolean;
  /** The item. */
  value: string | number | boolean;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type PlainItem = string | number | boolean;

/**
 * Tells how the user may change one field of an authorization detail on the consent screen. A number may
 * be lowered or raised, a date in `YYYY-MM-DD` form moved earlier or later, and items of a plain list
 * removed (when it has more than the fewest it must keep) or added. A date and time is never changed by the
 * user.
 *
 * @param row - The field.
 * @returns The kind of input the field takes, or `undefined` when the field is read-only.
 *
 * @example
 * ```typescript
 * getConsentDetailInputKind({label: 'Amount', modification: 'decrease', path: 'amount', value: 35}) // returns 'number'
 * ```
 */
const getConsentDetailInputKind = (row: ConsentDetailRow): ConsentDetailInputKind | undefined => {
  const isOrdered: boolean = row.modification === 'decrease' || row.modification === 'increase';

  if (isOrdered && typeof row.value === 'number') return 'number';
  if (isOrdered && row.as === 'date' && typeof row.value === 'string' && DATE_PATTERN.test(row.value)) return 'date';
  if (
    row.modification === 'removeItems' &&
    isConsentDetailPlainList(row.value) &&
    row.value.length > getConsentDetailFewestItems(row)
  )
    return 'removeItems';
  if (row.modification === 'addItems' && isConsentDetailPlainList(row.value)) return 'addItems';

  return undefined;
};

/**
 * Gives the text a `number` or `date` authorization detail field shows when the user is not typing into it:
 * the value the user chose, or the value that was shown when the user has not changed it.
 *
 * @param purposeId - The identifier of the consent purpose the authorization detail belongs to.
 * @param detailId - The identifier of the authorization detail, its consent element name.
 * @param row - The field.
 * @param formValues - Form values, holding the JSON text of each changed field under its modified key.
 * @returns The text to show.
 *
 * @example
 * ```typescript
 * getConsentDetailInputText('p1', 'd-1', amountRow, {'__consent_modified__p1__d-1__amount': '20'}) // returns '20'
 * ```
 */
const getConsentDetailInputText = (
  purposeId: string,
  detailId: string,
  row: ConsentDetailRow,
  formValues: Record<string, unknown>,
): string => {
  const raw: unknown = formValues[getConsentModifiedKey(purposeId, detailId, row.path)];
  if (typeof raw === 'string' && raw !== '') {
    try {
      const value: unknown = JSON.parse(raw);
      if (typeof value === 'number' || typeof value === 'string') return String(value);
    } catch {
      // Not a value the field wrote; show the value that was shown instead.
    }
  }

  return String(row.value);
};

/**
 * Turns the text a user entered into a `number` or `date` authorization detail field into the form values
 * to write. Text within the field's bound becomes the field's modified value. Any other text clears the
 * modified value, so a value entered earlier is never submitted in its place, and marks the field invalid,
 * which blocks approval until the user corrects it.
 *
 * @param purposeId - The identifier of the consent purpose the authorization detail belongs to.
 * @param detailId - The identifier of the authorization detail, its consent element name.
 * @param row - The field, carrying the shown value and its modification.
 * @param text - The text the user entered.
 * @returns The error, if any, and the form values to write.
 *
 * @example
 * ```typescript
 * parseConsentDetailInput('p1', 'd-1', amountRow, '20')
 * // returns {isValid: true, formValues: {'__consent_modified__p1__d-1__amount': '20', '__consent_invalid__p1__d-1__amount': ''}}
 * ```
 */
const parseConsentDetailInput = (
  purposeId: string,
  detailId: string,
  row: ConsentDetailRow,
  text: string,
): ConsentDetailInputResult => {
  const modifiedKey: string = getConsentModifiedKey(purposeId, detailId, row.path);
  const invalidKey: string = getConsentInvalidKey(purposeId, detailId, row.path);
  const error: ConsentDetailInputError | undefined = getConsentDetailInputError(row, text);

  if (error) {
    return {error, formValues: {[invalidKey]: 'true', [modifiedKey]: ''}, isValid: false};
  }

  const value: number | string = typeof row.value === 'number' ? Number(text) : text;

  return {formValues: {[invalidKey]: '', [modifiedKey]: JSON.stringify(value)}, isValid: true};
};

/**
 * Gives the form values that return an authorization detail field to the value that was shown: no
 * modified value and no invalid marker. A field the user left empty is reset this way when it loses focus.
 *
 * @param purposeId - The identifier of the consent purpose the authorization detail belongs to.
 * @param detailId - The identifier of the authorization detail, its consent element name.
 * @param path - Dot-separated location of the field within the detail.
 * @returns The form values to write, keyed by form key.
 *
 * @example
 * ```typescript
 * resetConsentDetailInput('p1', 'd-1', 'amount')
 * // returns {'__consent_modified__p1__d-1__amount': '', '__consent_invalid__p1__d-1__amount': ''}
 * ```
 */
const resetConsentDetailInput = (purposeId: string, detailId: string, path: string): Record<string, string> => ({
  [getConsentInvalidKey(purposeId, detailId, path)]: '',
  [getConsentModifiedKey(purposeId, detailId, path)]: '',
});

/**
 * Lists the items of a `removeItems` or `addItems` authorization detail field as the consent screen offers
 * them. For `removeItems`, every shown item is listed, selected while kept; a kept item can be removed
 * while more than the fewest the field must keep remain, and a removed item can be added back. For
 * `addItems`, the shown items are selected and fixed, the items the user added are selected and can be taken
 * out again, and the values the type allows are offered unselected, to add while the list holds fewer than
 * its `maxItems`.
 *
 * @param purposeId - The identifier of the consent purpose the authorization detail belongs to.
 * @param detailId - The identifier of the authorization detail, its consent element name.
 * @param row - The list field.
 * @param formValues - Form values, holding the JSON text of each changed field under its modified key.
 * @returns The items, in display order.
 *
 * @example
 * ```typescript
 * getConsentDetailListItems('p1', 'd-1', {label: 'Actions', modification: 'removeItems', path: 'actions', value: ['a', 'b']}, {})
 * // returns [{origin: 'shown', selected: true, toggleable: true, value: 'a'}, {origin: 'shown', selected: true, toggleable: true, value: 'b'}]
 * ```
 */
const getConsentDetailListItems = (
  purposeId: string,
  detailId: string,
  row: ConsentDetailRow,
  formValues: Record<string, unknown>,
): ConsentDetailListItem[] => {
  const shown: PlainItem[] = isConsentDetailPlainList(row.value) ? row.value : [];
  let current: PlainItem[] = shown;
  const raw: unknown = formValues[getConsentModifiedKey(purposeId, detailId, row.path)];
  if (typeof raw === 'string' && raw !== '') {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isConsentDetailPlainList(parsed)) current = parsed;
    } catch {
      // Not a list the field wrote; the shown list stands.
    }
  }

  if (row.modification === 'removeItems') {
    const keptCount: number = shown.filter((item: PlainItem) => current.includes(item)).length;
    const fewest: number = getConsentDetailFewestItems(row);
    return shown.map((value: PlainItem) => {
      const selected: boolean = current.includes(value);
      return {origin: 'shown', selected, toggleable: !selected || keptCount > fewest, value};
    });
  }

  const added: PlainItem[] = current.filter((item: PlainItem) => !shown.includes(item));
  const offered: PlainItem[] = (isConsentDetailPlainList(row.options) ? row.options : []).filter(
    (option: PlainItem) => !shown.includes(option) && !added.includes(option),
  );
  const canAdd: boolean = row.maxItems === undefined || shown.length + added.length < row.maxItems;

  return [
    ...shown.map(
      (value: PlainItem): ConsentDetailListItem => ({origin: 'shown', selected: true, toggleable: false, value}),
    ),
    ...added.map(
      (value: PlainItem): ConsentDetailListItem => ({origin: 'added', selected: true, toggleable: true, value}),
    ),
    ...offered.map(
      (value: PlainItem): ConsentDetailListItem => ({origin: 'offered', selected: false, toggleable: canAdd, value}),
    ),
  ];
};

/**
 * Toggles one item of a `removeItems` or `addItems` authorization detail field: a selected item is taken
 * out and an unselected one put in, within what the field's rule allows.
 *
 * @param purposeId - The identifier of the consent purpose the authorization detail belongs to.
 * @param detailId - The identifier of the authorization detail, its consent element name.
 * @param row - The list field.
 * @param formValues - Form values, holding the JSON text of each changed field under its modified key.
 * @param item - The item to toggle.
 * @returns The form values to write, keyed by form key, or `undefined` when the item cannot be toggled.
 *
 * @example
 * ```typescript
 * toggleConsentDetailListItem('p1', 'd-1', actionsRow, {}, 'status') // returns {'__consent_modified__p1__d-1__actions': '["initiate"]'}
 * ```
 */
const toggleConsentDetailListItem = (
  purposeId: string,
  detailId: string,
  row: ConsentDetailRow,
  formValues: Record<string, unknown>,
  item: string | number | boolean,
): Record<string, string> | undefined => {
  const items: ConsentDetailListItem[] = getConsentDetailListItems(purposeId, detailId, row, formValues);
  const target: ConsentDetailListItem | undefined = items.find((entry: ConsentDetailListItem) => entry.value === item);
  if (!target?.toggleable) return undefined;

  const next: (string | number | boolean)[] = items
    .filter((entry: ConsentDetailListItem) => (entry === target ? !entry.selected : entry.selected))
    .map((entry: ConsentDetailListItem) => entry.value);

  return {[getConsentModifiedKey(purposeId, detailId, row.path)]: JSON.stringify(next)};
};

/**
 * Adds a typed value to an `addItems` authorization detail field whose type allows any value. The text is
 * trimmed, and read as a number when every shown item is a number.
 *
 * @param purposeId - The identifier of the consent purpose the authorization detail belongs to.
 * @param detailId - The identifier of the authorization detail, its consent element name.
 * @param row - The list field.
 * @param formValues - Form values, holding the JSON text of each changed field under its modified key.
 * @param text - The text the user typed.
 * @returns The form values to write, keyed by form key, or `undefined` when the text is empty, not a
 * number where one is needed, already listed, the list already holds its `maxItems`, or the field does not
 * take typed values.
 *
 * @example
 * ```typescript
 * addConsentDetailListItem('p1', 'd-1', blockedRow, {}, ' y ') // returns {'__consent_modified__p1__d-1__blocked': '["x","y"]'}
 * ```
 */
const addConsentDetailListItem = (
  purposeId: string,
  detailId: string,
  row: ConsentDetailRow,
  formValues: Record<string, unknown>,
  text: string,
): Record<string, string> | undefined => {
  if (row.modification !== 'addItems' || row.options !== undefined || !Array.isArray(row.value)) return undefined;
  const trimmed: string = text.trim();
  if (!trimmed) return undefined;

  const numeric: boolean = row.value.length > 0 && row.value.every((item: unknown) => typeof item === 'number');
  const value: string | number = numeric ? Number(trimmed) : trimmed;
  const selected: (string | number | boolean)[] = getConsentDetailListItems(purposeId, detailId, row, formValues)
    .filter((entry: ConsentDetailListItem) => entry.selected)
    .map((entry: ConsentDetailListItem) => entry.value);
  if ((numeric && !Number.isFinite(value)) || selected.includes(value)) return undefined;
  if (row.maxItems !== undefined && selected.length >= row.maxItems) return undefined;

  return {[getConsentModifiedKey(purposeId, detailId, row.path)]: JSON.stringify([...selected, value])};
};

/**
 * Props for the useConsentDetailField hook.
 */
export interface UseConsentDetailFieldProps {
  /** The identifier of the consent purpose the authorization detail belongs to. */
  purposeId: string;
  /** The identifier of the authorization detail the field belongs to, its consent element name. */
  detailId: string;
  /** Current consent form values. */
  formValues: Record<string, string>;
  /** Callback that writes one consent form value. */
  onInputChange: (name: string, value: string) => void;
  /** The field. */
  row: ConsentDetailRow;
  /** Translator for the error message; the SDK's default bundle is used without one. */
  t?: UseTranslation['t'];
}

/**
 * Error of a field, with its message resolved.
 */
export interface ConsentDetailFieldError extends ConsentDetailInputError {
  /** Translated message. */
  message: string;
}

/**
 * State and handlers of one authorization detail field, for drawing it in any UI.
 */
export interface UseConsentDetailFieldResult {
  /** Description the type declares for the field, to show with it as a hint. */
  description?: string;
  /**
   * Identifier for the element that shows the description, for the field's controls to reference with
   * `aria-describedby`; absent when the field has no description.
   */
  descriptionId?: string;
  /** Why the text shown cannot be submitted, absent when it can. */
  error?: ConsentDetailFieldError;
  /** Adds a typed item to an `addItems` list that takes typed values; returns whether it was added. */
  handleAdd: (text: string) => boolean;
  /** Call when the field loses focus: an empty field returns to the value that was shown. */
  handleBlur: () => void;
  /** Call with the text the user entered into a `number` or `date` field, or the item typed into a list. */
  handleChange: (text: string) => void;
  /** Expands or collapses the field's list. */
  handleListToggle: (expanded: boolean) => void;
  /** Toggles an item of a list field, within what its rule allows. */
  handleToggle: (item: string | number | boolean) => void;
  /** Identifier for the field's input element. */
  inputId: string;
  /** Whether the user expanded the field's list past `CONSENT_DETAIL_DISPLAY_LIMITS.listItems`. */
  isListExpanded: boolean;
  /** Whether the field's value is a list of plain values, shown as a list rather than as structured JSON. */
  isPlainList: boolean;
  /** Whether an item of a list field is part of the value that would be granted. */
  isSelected: (item: string | number | boolean) => boolean;
  /** Whether the user may toggle an item of a list field. */
  isToggleable: (item: string | number | boolean) => boolean;
  /**
   * Whether the field takes typed items: an `addItems` list whose type offers no fixed values, while it holds
   * fewer than its `maxItems`.
   */
  isTypedItemAllowed: boolean;
  /** Whether the field's text may be submitted. Always true for a list or a read-only field. */
  isValid: boolean;
  /** Items of a list field, in display order; empty for any other field. */
  items: ConsentDetailListItem[];
  /** How the user may change the field, or `undefined` when it is read-only. */
  kind?: ConsentDetailInputKind;
  /** Label of the field. */
  label: string;
  /**
   * How many items of the field's list to show and hide: the items of a list the user may change, or the
   * values of a read-only plain list. Nothing is hidden for any other field.
   */
  listDisplay: ConsentDetailListDisplay;
  /**
   * Upper bound of a `number` or `date` field: the value that was shown when the field may be decreased, or
   * the field's maximum, whichever is lower.
   */
  max?: string;
  /**
   * Lower bound of a `number` or `date` field: the value that was shown when the field may be increased, or
   * the field's minimum, whichever is higher. With a step, the lowest multiple of the step the field accepts.
   */
  min?: string;
  /** Step a `number` field moves by, its `multipleOf`; absent when any number is allowed. */
  step?: string;
  /** Text to show: the typed text of a `number` or `date` field, or the item being typed into a list. */
  text: string;
}

/**
 * Headless state of one authorization detail field on the consent screen. A `number` or `date` field keeps
 * the text the user typed, writes it to the decision only while it stays within the field's bound, and
 * otherwise clears the field's modification and marks the field invalid, which blocks approval (see
 * `isConsentApprovalBlocked`). A list field exposes its items and toggles them as its rule allows.
 *
 * @param props - The field and the consent form state.
 * @returns The field's state and handlers.
 *
 * @example
 * ```tsx
 * const field = useConsentDetailField({purposeId, detailId, row, formValues, onInputChange});
 * <input value={field.text} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} />
 * ```
 */
const useConsentDetailField = ({
  detailId,
  formValues,
  onInputChange,
  purposeId,
  row,
  t,
}: UseConsentDetailFieldProps): UseConsentDetailFieldResult => {
  // The text the user typed, kept as typed even when it cannot be submitted.
  const [draft, setDraft] = useState<string | undefined>(undefined);
  const [isListExpanded, setListExpanded] = useState<boolean>(false);
  const kind: ConsentDetailInputKind | undefined = getConsentDetailInputKind(row);
  const isScalar: boolean = kind === 'number' || kind === 'date';
  const isList: boolean = kind === 'removeItems' || kind === 'addItems';
  const items: ConsentDetailListItem[] = isList ? getConsentDetailListItems(purposeId, detailId, row, formValues) : [];
  const isPlainList: boolean = isConsentDetailPlainList(row.value);
  let listCount = 0;
  if (isList) {
    listCount = items.length;
  } else if (isConsentDetailPlainList(row.value)) {
    listCount = row.value.length;
  }
  const find = (item: string | number | boolean): ConsentDetailListItem | undefined =>
    items.find((entry: ConsentDetailListItem) => entry.value === item);

  const write = (values: Record<string, string> | undefined): void => {
    Object.entries(values ?? {}).forEach(([name, value]: [string, string]) => onInputChange(name, value));
  };

  const inputError: ConsentDetailInputError | undefined =
    isScalar && draft !== undefined ? getConsentDetailInputError(row, draft) : undefined;
  const attributes: ConsentDetailInputAttributes = isScalar ? getConsentDetailInputAttributes(row) : {};
  const isBelowMostItems: boolean =
    row.maxItems === undefined || items.filter((entry: ConsentDetailListItem) => entry.selected).length < row.maxItems;

  return {
    description: row.description,
    descriptionId: row.description ? getConsentDetailDescriptionId(purposeId, detailId, row.path) : undefined,
    error: inputError && {...inputError, message: resolveConsentText(t, inputError.key, inputError.params)},
    handleAdd: (text: string): boolean => {
      const values: Record<string, string> | undefined = addConsentDetailListItem(
        purposeId,
        detailId,
        row,
        formValues,
        text,
      );
      write(values);
      if (values) setDraft(undefined);
      return Boolean(values);
    },
    handleBlur: (): void => {
      if (!isScalar || draft === undefined) return;
      if (draft.trim() === '') {
        write(resetConsentDetailInput(purposeId, detailId, row.path));
        setDraft(undefined);
      } else if (!getConsentDetailInputError(row, draft)) {
        setDraft(undefined);
      }
    },
    handleChange: (text: string): void => {
      setDraft(text);
      if (isScalar) write(parseConsentDetailInput(purposeId, detailId, row, text).formValues);
    },
    handleListToggle: setListExpanded,
    handleToggle: (item: string | number | boolean): void => {
      write(toggleConsentDetailListItem(purposeId, detailId, row, formValues, item));
    },
    inputId: `consent_modify_${purposeId}_${detailId}_${row.path}`,
    isListExpanded,
    isPlainList,
    isSelected: (item: string | number | boolean): boolean => Boolean(find(item)?.selected),
    isToggleable: (item: string | number | boolean): boolean => Boolean(find(item)?.toggleable),
    isTypedItemAllowed: kind === 'addItems' && row.options === undefined && isBelowMostItems,
    isValid: !inputError,
    items,
    kind,
    label: row.label || row.path,
    listDisplay: getConsentDetailListDisplay(listCount, isListExpanded),
    max: attributes.max,
    min: attributes.min,
    step: attributes.step,
    text: draft ?? (isScalar ? getConsentDetailInputText(purposeId, detailId, row, formValues) : ''),
  };
};

export default useConsentDetailField;
