// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  bem,
  CONSENT_VALIDITY_PERIOD_KEY,
  type ConsentValidityChoices,
  type ConsentValidityCustomPeriod,
  type ConsentValidityOption,
  type ConsentValidityOptionText,
  type ConsentValidityTextKey,
  type ConsentValidityUnit,
  getConsentValidityChoices,
  getConsentValidityCustomMax,
  getConsentValidityCustomPeriod,
  getConsentValidityCustomUnits,
  getConsentValidityOptionText,
  getConsentValidityUnitLabel,
  splitConsentValidityPeriod,
  withVendorCSSClassPrefix,
} from '@thunderid/browser';
import {type ChangeEvent, FC, ReactElement, useContext, useEffect, useState} from 'react';
import useStyles from './ConsentValidityPeriodField.styles';
import resolveConsentText from './resolveConsentText';
import I18nContext from '../../../contexts/I18n/I18nContext';
import useTheme from '../../../contexts/Theme/useTheme';
import {UseTranslation} from '../../../hooks/useTranslation';
import {cx} from '../../../styles/emotion';
import Checkbox from '../../primitives/Checkbox/Checkbox';
import FormControl from '../../primitives/FormControl/FormControl';
import Select from '../../primitives/Select/Select';
import TextField from '../../primitives/TextField/TextField';

const CUSTOM_OPTION_ID = 'custom';

/**
 * Props for the ConsentValidityPeriodField component.
 */
export interface ConsentValidityPeriodFieldProps {
  /** Current form values, holding the chosen period under the consent validity period key. */
  formValues: Record<string, string>;
  /** The longest validity period in seconds. Absent when there is no limit. */
  maxValidityPeriod?: number;
  /** Callback invoked with the consent validity period key and its new value. */
  onInputChange: (name: string, value: string) => void;
  /** translation data */
  t?: UseTranslation['t'];
}

/**
 * Lets the user decide whether their decision is remembered. Ticked, the user picks a period that fits the limit or
 * types a number of seconds. Unticked, the user is asked again at the next sign-in. The shortest period is put in the
 * form when the field starts, so what the user sees is what is submitted. Nothing is shown when there is no choice.
 */
const ConsentValidityPeriodField: FC<ConsentValidityPeriodFieldProps> = ({
  formValues,
  maxValidityPeriod = undefined,
  onInputChange,
  t = undefined,
}: ConsentValidityPeriodFieldProps): ReactElement | null => {
  const {theme}: ReturnType<typeof useTheme> = useTheme();
  const styles: Record<string, string> = useStyles(theme);
  const locale: string | undefined = useContext(I18nContext)?.currentLanguage;
  const value: string = formValues[CONSENT_VALIDITY_PERIOD_KEY] ?? '';
  const [remembering, setRemembering] = useState<boolean>(
    (): boolean => getConsentValidityChoices(maxValidityPeriod, value).remember,
  );
  const choices: ConsentValidityChoices = getConsentValidityChoices(maxValidityPeriod, value, remembering);
  const {initial, once, remember, remembered, selected} = choices;
  const units: ConsentValidityUnit[] = getConsentValidityCustomUnits(maxValidityPeriod);
  const [customOpen, setCustomOpen] = useState<boolean>(false);
  const [customText, setCustomText] = useState<string>('');
  const [customUnit, setCustomUnit] = useState<ConsentValidityUnit>(units.includes('minute') ? 'minute' : 'second');

  useEffect((): void => {
    if (once && value === '') {
      onInputChange(CONSENT_VALIDITY_PERIOD_KEY, initial.value);
    }
  }, [initial.value, once, onInputChange, value]);

  if (!once) {
    return null;
  }

  const translate = (key: ConsentValidityTextKey, params?: Record<string, string>): string =>
    resolveConsentText(t, `consent.validity_period.${key}`, params);
  const textOf = (option: ConsentValidityOption): ConsentValidityOptionText =>
    getConsentValidityOptionText(option, translate, locale);
  const custom: boolean = remember && (customOpen || selected === undefined);
  const prefilled: {amount: string; unit: ConsentValidityUnit} | undefined =
    custom && !customOpen && Number.isFinite(Number(value))
      ? splitConsentValidityPeriod(Number(value), units)
      : undefined;
  const unit: ConsentValidityUnit = prefilled?.unit ?? customUnit;
  const amount: string = customOpen ? customText : (prefilled?.amount ?? '');
  const maxAmount: number | undefined = getConsentValidityCustomMax(maxValidityPeriod, unit);

  const handleSelectChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    if (e.target.value === CUSTOM_OPTION_ID) {
      const current: {amount: string; unit: ConsentValidityUnit} | undefined =
        selected?.kind === 'period' ? splitConsentValidityPeriod(selected.seconds, units) : undefined;

      setCustomOpen(true);
      setCustomText(current?.amount ?? '');
      setCustomUnit(current?.unit ?? customUnit);
      onInputChange(CONSENT_VALIDITY_PERIOD_KEY, selected?.kind === 'period' ? selected.value : initial.value);

      return;
    }

    const picked: ConsentValidityOption | undefined = remembered.find(
      (option: ConsentValidityOption): boolean => option.id === e.target.value,
    );
    if (picked) {
      setCustomOpen(false);
      onInputChange(CONSENT_VALIDITY_PERIOD_KEY, picked.value);
    }
  };

  const applyCustom = (text: string, nextUnit: ConsentValidityUnit): void => {
    const period: ConsentValidityCustomPeriod = getConsentValidityCustomPeriod(text, maxValidityPeriod, nextUnit);

    setCustomOpen(true);
    setCustomUnit(nextUnit);
    setCustomText(period.amount === '' ? text : period.amount);
    onInputChange(CONSENT_VALIDITY_PERIOD_KEY, period.seconds === '' ? initial.value : period.seconds);
  };

  const handleCustomChange = (e: ChangeEvent<HTMLInputElement>): void =>
    applyCustom(e.target.value.replace(/\D/g, ''), unit);

  const handleUnitChange = (e: ChangeEvent<HTMLSelectElement>): void =>
    applyCustom(amount, e.target.value as ConsentValidityUnit);

  return (
    <div className={cx(withVendorCSSClassPrefix(bem('consent', 'validity-period')), styles['container'])}>
      <Checkbox
        id="consent_validity_remember"
        label={resolveConsentText(t, 'consent.validity_period.remember')}
        checked={remember}
        helperText={remember ? undefined : textOf(once).hint}
        onChange={(e: ChangeEvent<HTMLInputElement>): void => {
          setRemembering(e.target.checked);
          setCustomOpen(false);
          setCustomText('');
          onInputChange(CONSENT_VALIDITY_PERIOD_KEY, e.target.checked ? initial.value : once.value);
        }}
      />
      {remember && (
        <Select
          id="consent_validity_period"
          aria-label={resolveConsentText(t, 'consent.validity_period.label')}
          helperText={custom || !selected ? undefined : textOf(selected).hint}
          value={custom ? CUSTOM_OPTION_ID : selected?.id}
          options={[
            ...remembered.map((option: ConsentValidityOption) => ({label: textOf(option).label, value: option.id})),
            {label: translate('option_custom'), value: CUSTOM_OPTION_ID},
          ]}
          onChange={handleSelectChange}
        />
      )}
      {custom && (
        <FormControl
          helperText={
            maxAmount === undefined ? translate('hint_custom') : translate('hint_custom_max', {max: String(maxAmount)})
          }
        >
          <div className={styles['customRow']}>
            <TextField
              id="consent_validity_custom"
              aria-label={translate('custom_label')}
              inputMode="numeric"
              pattern="[0-9]*"
              value={amount}
              onChange={handleCustomChange}
            />
            <Select
              id="consent_validity_unit"
              aria-label={translate('custom_unit_label')}
              value={unit}
              options={units.map((option: ConsentValidityUnit) => ({
                label: getConsentValidityUnitLabel(option, locale),
                value: option,
              }))}
              onChange={handleUnitChange}
            />
          </div>
        </FormControl>
      )}
    </div>
  );
};

export default ConsentValidityPeriodField;
