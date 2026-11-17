// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {ConsentValidityOption, ConsentValidityUnit} from './getConsentValidityOptions';

/**
 * Names of the texts a validity option is described with. Each UI maps a name to its own translation key.
 */
export type ConsentValidityTextKey =
  | 'custom_label'
  | 'custom_unit_label'
  | 'hint_custom'
  | 'hint_custom_max'
  | 'hint_expires'
  | 'hint_never'
  | 'hint_once'
  | 'option_custom'
  | 'option_never';

/**
 * Returns the text for a name, with the given values put in place of its placeholders.
 */
export type ConsentValidityTranslate = (key: ConsentValidityTextKey, params?: Record<string, string>) => string;

/**
 * What the user reads for a validity option.
 */
export interface ConsentValidityOptionText {
  /** Sentence below the choice saying when the consent expires. */
  hint: string;
  /** Name of the choice. Empty for the option that is not remembered, which is a checkbox state and not a choice. */
  label: string;
}

const withLocale = (locale: string | undefined, format: (locale?: string) => string): string => {
  try {
    return format(locale);
  } catch {
    return format(undefined);
  }
};

const formatDuration = (option: ConsentValidityOption, locale: string | undefined): string =>
  withLocale(locale, (resolved?: string): string =>
    new Intl.NumberFormat(resolved, {style: 'unit', unit: option.unit, unitDisplay: 'long'}).format(option.amount ?? 0),
  );

/**
 * Writes the name of a unit for the locale, such as "minutes".
 *
 * @param unit - The unit to name.
 * @param locale - Locale for the name. The runtime default is used when absent or not valid.
 * @returns The name of the unit.
 *
 * @example
 * ```typescript
 * getConsentValidityUnitLabel('hour', 'en-US') // returns 'hours'
 * ```
 */
export const getConsentValidityUnitLabel = (
  unit: ConsentValidityUnit,
  locale: string | undefined = undefined,
): string =>
  withLocale(
    locale,
    (resolved?: string): string =>
      new Intl.NumberFormat(resolved, {style: 'unit', unit, unitDisplay: 'long'})
        .formatToParts(2)
        .find((part: Intl.NumberFormatPart): boolean => part.type === 'unit')?.value ?? unit,
  );

/**
 * Builds the name and the hint the user reads for a validity option. Durations are written for the locale; the
 * words around them come from `translate`.
 *
 * @param option - The validity option to describe.
 * @param translate - Returns the translated text for a name, with the given values in place of its placeholders.
 * @param locale - Locale for durations. The runtime default is used when absent or not valid.
 * @returns The label and the hint of the option.
 *
 * @example
 * ```typescript
 * getConsentValidityOptionText({amount: 7, id: '604800', kind: 'period', seconds: 604800, unit: 'day', value: '604800'}, translate, 'en-US')
 * // returns {label: '7 days', hint: 'Your consent expires in 7 days.'}
 * ```
 */
const getConsentValidityOptionText = (
  option: ConsentValidityOption,
  translate: ConsentValidityTranslate,
  locale: string | undefined = undefined,
): ConsentValidityOptionText => {
  if (option.kind === 'once') {
    return {hint: translate('hint_once'), label: ''};
  }

  if (option.kind === 'never') {
    return {hint: translate('hint_never'), label: translate('option_never')};
  }

  const duration: string = formatDuration(option, locale);

  return {hint: translate('hint_expires', {duration}), label: duration};
};

export default getConsentValidityOptionText;
