// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  CONSENT_VALIDITY_PERIOD_KEY,
  type ConsentPurposeData,
  type ConsentValidityChoices,
  type ConsentValidityOption,
  type ConsentValidityOptionText,
  type ConsentValidityTextKey,
  type ConsentValidityCustomPeriod,
  type ConsentValidityUnit,
  getConsentValidityChoices,
  getConsentValidityCustomMax,
  getConsentValidityCustomPeriod,
  getConsentValidityCustomUnits,
  getConsentValidityOptionText,
  getConsentValidityUnitLabel,
  splitConsentValidityPeriod,
  substituteTranslationParams,
  withVendorCSSClassPrefix,
} from '@thunderid/browser';
import {
  type Component,
  type PropType,
  type SetupContext,
  type VNode,
  defineComponent,
  h,
  inject,
  ref,
  watchEffect,
} from 'vue';
import {I18N_KEY} from '../../../keys';
import {InfoIcon} from '../../primitives/Icons';
import Typography from '../../primitives/Typography';

export type ConsentData = string | ConsentPurposeData[] | {purposes: ConsentPurposeData[]};

const VALIDITY_TEXT_DEFAULTS: Record<ConsentValidityTextKey, string> = {
  custom_label: 'Custom validity',
  custom_unit_label: 'Unit',
  hint_custom: 'Enter a whole number.',
  hint_custom_max: 'Enter a whole number, up to {max}.',
  hint_expires: 'Your consent expires in {duration}.',
  hint_never: 'You will not be asked again unless this application asks for more access.',
  hint_once: 'You will be asked again the next time you sign in.',
  option_custom: 'Custom',
  option_never: 'No expiry',
};

const CUSTOM_OPTION_ID = 'custom';

export interface ConsentRenderProps {
  formValues: Record<string, string>;
  maxValidityPeriod?: number;
  onInputChange: (name: string, value: string) => void;
  purposes: ConsentPurposeData[];
  validityInput: boolean;
}

export interface ConsentProps {
  consentData?: ConsentData;
  formValues: Record<string, string>;
  maxValidityPeriod?: number;
  onInputChange: (name: string, value: string) => void;
  t?: (key: string) => string;
  validityInput?: boolean;
}

export const getConsentOptionalKey = (purposeId: string, attrName: string): string =>
  `__consent_opt__${purposeId}__${attrName}`;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const parsePurposes = (consentData: ConsentData | undefined): ConsentPurposeData[] => {
  if (!consentData) return [];

  let parsed: unknown = consentData;
  if (typeof consentData === 'string') {
    try {
      parsed = JSON.parse(consentData);
    } catch {
      return [];
    }
  }

  const rawPurposes: unknown = Array.isArray(parsed) ? parsed : (parsed as {purposes?: unknown})?.purposes;
  if (!Array.isArray(rawPurposes)) return [];

  return rawPurposes
    .filter(
      (purpose: unknown): purpose is Record<string, unknown> =>
        isObject(purpose) && typeof purpose['purposeId'] === 'string',
    )
    .map(
      (purpose: Record<string, unknown>): ConsentPurposeData => ({
        ...(purpose as unknown as ConsentPurposeData),
        essential: Array.isArray(purpose['essential'])
          ? purpose['essential'].filter(
              (element: unknown): element is {name: string} => isObject(element) && typeof element['name'] === 'string',
            )
          : [],
        optional: Array.isArray(purpose['optional'])
          ? purpose['optional'].filter(
              (element: unknown): element is {name: string} => isObject(element) && typeof element['name'] === 'string',
            )
          : [],
      }),
    )
    .sort(
      (a: ConsentPurposeData, b: ConsentPurposeData) =>
        Number(b.type === 'permissions') - Number(a.type === 'permissions'),
    );
};

const Consent: Component = defineComponent({
  name: 'Consent',
  props: {
    consentData: {default: undefined, type: [String, Array, Object] as PropType<ConsentData>},
    formValues: {required: true, type: Object as PropType<Record<string, string>>},
    maxValidityPeriod: {default: undefined, type: Number},
    onInputChange: {required: true, type: Function as PropType<ConsentProps['onInputChange']>},
    t: {default: undefined, type: Function as PropType<ConsentProps['t']>},
    validityInput: {default: false, type: Boolean},
  },
  setup(props: Readonly<ConsentProps>, {slots}: SetupContext): () => VNode | null {
    const i18n = inject(I18N_KEY, null);
    const translate = (key: string, fallback = ''): string => {
      const value: string | undefined = props.t?.(key);
      return value && value !== key ? value : fallback;
    };

    const toggle = (id: string, checked: boolean, label: string, onChange: (value: boolean) => void): VNode =>
      h('label', {class: withVendorCSSClassPrefix('consent__toggle-container')}, [
        h('input', {
          'aria-label': label,
          checked,
          class: withVendorCSSClassPrefix('consent__toggle-input'),
          id,
          onChange: (event: Event) => onChange((event.target as HTMLInputElement).checked),
          role: 'switch',
          type: 'checkbox',
        }),
        h('span', {class: withVendorCSSClassPrefix('consent__toggle-track')}, [
          h('span', {class: withVendorCSSClassPrefix('consent__toggle-thumb')}),
        ]),
      ]);

    const sectionTitle = (label: string, info: string): VNode[] =>
      [
        h(
          Typography,
          {class: withVendorCSSClassPrefix('consent__title'), component: 'span', variant: 'subtitle2'},
          () => label,
        ),
        info
          ? h(
              'span',
              {class: withVendorCSSClassPrefix('consent__info'), title: info, 'aria-label': info, role: 'img'},
              [h(InfoIcon)],
            )
          : null,
      ].filter((node): node is VNode => node !== null);

    const customOpen = ref(false);
    const customText = ref('');
    const customUnit = ref<ConsentValidityUnit>(
      getConsentValidityCustomUnits(props.maxValidityPeriod).includes('minute') ? 'minute' : 'second',
    );
    const remembering = ref(
      getConsentValidityChoices(props.maxValidityPeriod, props.formValues[CONSENT_VALIDITY_PERIOD_KEY] ?? '').remember,
    );

    watchEffect(
      (): void => {
        const value: string = props.formValues[CONSENT_VALIDITY_PERIOD_KEY] ?? '';
        const {initial, once}: ConsentValidityChoices = getConsentValidityChoices(props.maxValidityPeriod, value);
        if (props.validityInput && once && value === '') {
          props.onInputChange(CONSENT_VALIDITY_PERIOD_KEY, initial.value);
        }
      },
      {flush: 'post'},
    );

    const validityField = (): VNode | null => {
      const value: string = props.formValues[CONSENT_VALIDITY_PERIOD_KEY] ?? '';
      const {initial, once, remember, remembered, selected}: ConsentValidityChoices = getConsentValidityChoices(
        props.maxValidityPeriod,
        value,
        remembering.value,
      );
      if (!once) return null;

      const text = (key: ConsentValidityTextKey, params?: Record<string, string>): string =>
        substituteTranslationParams(translate(`consent.validity_period.${key}`, VALIDITY_TEXT_DEFAULTS[key]), params);
      const textOf = (option: ConsentValidityOption): ConsentValidityOptionText =>
        getConsentValidityOptionText(option, text, i18n?.currentLanguage.value);
      const custom: boolean = remember && (customOpen.value || selected === undefined);
      const units: ConsentValidityUnit[] = getConsentValidityCustomUnits(props.maxValidityPeriod);
      const prefilled: {amount: string; unit: ConsentValidityUnit} | undefined =
        custom && !customOpen.value && Number.isFinite(Number(value))
          ? splitConsentValidityPeriod(Number(value), units)
          : undefined;
      const unit: ConsentValidityUnit = prefilled?.unit ?? customUnit.value;
      const amount: string = customOpen.value ? customText.value : (prefilled?.amount ?? '');
      const maxAmount: number | undefined = getConsentValidityCustomMax(props.maxValidityPeriod, unit);

      const handleSelectChange = (event: Event): void => {
        const chosen: string = (event.target as HTMLSelectElement).value;
        if (chosen === CUSTOM_OPTION_ID) {
          const current: {amount: string; unit: ConsentValidityUnit} | undefined =
            selected?.kind === 'period' ? splitConsentValidityPeriod(selected.seconds, units) : undefined;
          customOpen.value = true;
          customText.value = current?.amount ?? '';
          customUnit.value = current?.unit ?? customUnit.value;
          props.onInputChange(
            CONSENT_VALIDITY_PERIOD_KEY,
            selected?.kind === 'period' ? selected.value : initial.value,
          );
          return;
        }

        const picked: ConsentValidityOption | undefined = remembered.find(
          (option: ConsentValidityOption) => option.id === chosen,
        );
        if (picked) {
          customOpen.value = false;
          props.onInputChange(CONSENT_VALIDITY_PERIOD_KEY, picked.value);
        }
      };

      const applyCustom = (digits: string, nextUnit: ConsentValidityUnit): ConsentValidityCustomPeriod => {
        const period: ConsentValidityCustomPeriod = getConsentValidityCustomPeriod(
          digits,
          props.maxValidityPeriod,
          nextUnit,
        );
        customOpen.value = true;
        customUnit.value = nextUnit;
        customText.value = period.amount === '' ? digits : period.amount;
        props.onInputChange(CONSENT_VALIDITY_PERIOD_KEY, period.seconds === '' ? initial.value : period.seconds);

        return period;
      };

      const handleCustomInput = (event: Event): void => {
        const field = event.target as HTMLInputElement;
        applyCustom(field.value.replace(/\D/g, ''), unit);
        field.value = customText.value;
      };

      const handleUnitChange = (event: Event): void => {
        applyCustom(amount, (event.target as HTMLSelectElement).value as ConsentValidityUnit);
      };

      const hint: VNode = h(
        'span',
        {class: withVendorCSSClassPrefix('consent__validity-hint')},
        custom
          ? maxAmount === undefined
            ? text('hint_custom')
            : text('hint_custom_max', {max: String(maxAmount)})
          : textOf(selected ?? once).hint,
      );
      const group = (...nodes: (VNode | null)[]): VNode =>
        h('div', {class: withVendorCSSClassPrefix('consent__validity-group')}, nodes);

      return h('div', {class: withVendorCSSClassPrefix('consent__validity')}, [
        group(
          h(
            'label',
            {class: withVendorCSSClassPrefix('consent__validity-remember'), for: 'consent_validity_remember'},
            [
              h('input', {
                checked: remember,
                class: withVendorCSSClassPrefix('consent__validity-checkbox'),
                id: 'consent_validity_remember',
                onChange: (event: Event) => {
                  remembering.value = (event.target as HTMLInputElement).checked;
                  customOpen.value = false;
                  customText.value = '';
                  props.onInputChange(
                    CONSENT_VALIDITY_PERIOD_KEY,
                    (event.target as HTMLInputElement).checked ? initial.value : once.value,
                  );
                },
                type: 'checkbox',
              }),
              translate('consent.validity_period.remember', 'Remember my decision'),
            ],
          ),
          remember ? null : hint,
        ),
        ...(remember
          ? [
              group(
                h(
                  'select',
                  {
                    'aria-label': translate('consent.validity_period.label', 'Ask me again'),
                    class: withVendorCSSClassPrefix('consent__validity-input'),
                    id: 'consent_validity_period',
                    onChange: handleSelectChange,
                    value: custom ? CUSTOM_OPTION_ID : selected?.id,
                  },
                  [
                    ...remembered.map((option: ConsentValidityOption) =>
                      h(
                        'option',
                        {key: option.id, selected: !custom && option.id === selected?.id, value: option.id},
                        textOf(option).label,
                      ),
                    ),
                    h(
                      'option',
                      {key: CUSTOM_OPTION_ID, selected: custom, value: CUSTOM_OPTION_ID},
                      text('option_custom'),
                    ),
                  ],
                ),
                custom ? null : hint,
              ),
            ]
          : []),
        ...(custom
          ? [
              group(
                h('div', {class: withVendorCSSClassPrefix('consent__validity-custom')}, [
                  h('input', {
                    'aria-label': text('custom_label'),
                    class: withVendorCSSClassPrefix('consent__validity-input'),
                    id: 'consent_validity_custom',
                    inputmode: 'numeric',
                    onInput: handleCustomInput,
                    pattern: '[0-9]*',
                    type: 'text',
                    value: amount,
                  }),
                  h(
                    'select',
                    {
                      'aria-label': text('custom_unit_label'),
                      class: withVendorCSSClassPrefix('consent__validity-input'),
                      id: 'consent_validity_unit',
                      onChange: handleUnitChange,
                      value: unit,
                    },
                    units.map((option: ConsentValidityUnit) =>
                      h(
                        'option',
                        {key: option, selected: option === unit, value: option},
                        getConsentValidityUnitLabel(option, i18n?.currentLanguage.value),
                      ),
                    ),
                  ),
                ]),
                hint,
              ),
            ]
          : []),
      ]);
    };

    return (): VNode | null => {
      const purposes: ConsentPurposeData[] = parsePurposes(props.consentData);
      if (purposes.length === 0) return null;
      if (slots['default'])
        return h(
          'div',
          slots['default']({
            formValues: props.formValues,
            maxValidityPeriod: props.maxValidityPeriod,
            onInputChange: props.onInputChange,
            purposes,
            validityInput: props.validityInput,
          }),
        );

      return h('div', {class: withVendorCSSClassPrefix('consent')}, [
        ...purposes.map((purpose: ConsentPurposeData) => {
          const permission: boolean = purpose.type === 'permissions';
          const optionalName: string = permission
            ? translate('consent.optional_scope', 'Optional Permissions')
            : translate('consent.optional_claims', 'Optional Attributes');
          const essentialName: string = permission
            ? translate('consent.essential_scope', 'Essential Permissions')
            : translate('consent.essential_claims', 'Essential Attributes');
          const allSelected: boolean =
            purpose.optional.length > 0 &&
            purpose.optional.every(
              (element) => props.formValues[getConsentOptionalKey(purpose.purposeId, element.name)] === 'true',
            );
          const itemList = (elements: {name: string}[], essential: boolean): VNode =>
            h(
              'div',
              {class: withVendorCSSClassPrefix('consent__items')},
              elements.map((element: {name: string}) => {
                const key: string = getConsentOptionalKey(purpose.purposeId, element.name);
                const label: string = translate(`consent.${element.name}`, element.name);
                return h('div', {class: withVendorCSSClassPrefix('consent__item'), key: element.name}, [
                  h('div', {class: withVendorCSSClassPrefix('consent__item-label')}, [
                    h('span', {class: withVendorCSSClassPrefix('consent__bullet')}),
                    h(Typography, {component: 'span', variant: 'body2'}, () => label),
                  ]),
                  essential
                    ? h(Typography, {component: 'span', variant: 'body2'}, () =>
                        translate('consent.required', 'Required'),
                      )
                    : toggle(
                        `consent_opt_${purpose.purposeId}_${element.name}`,
                        props.formValues[key] === 'true',
                        label,
                        (value) => props.onInputChange(key, value ? 'true' : 'false'),
                      ),
                ]);
              }),
            );

          return h('section', {class: withVendorCSSClassPrefix('consent__purpose'), key: purpose.purposeId}, [
            purpose.essential.length > 0
              ? h('div', {class: withVendorCSSClassPrefix('consent__section')}, [
                  h(
                    'div',
                    {class: withVendorCSSClassPrefix('consent__header')},
                    sectionTitle(
                      essentialName,
                      translate(
                        permission ? 'consent.essential_scope.info' : 'consent.essential_claims.info',
                        permission ? '' : 'These attributes are required for the service to function properly.',
                      ),
                    ),
                  ),
                  itemList(purpose.essential, true),
                ])
              : null,
            purpose.optional.length > 0
              ? h('div', {class: withVendorCSSClassPrefix('consent__section')}, [
                  h('div', {class: withVendorCSSClassPrefix('consent__optional-header')}, [
                    h(
                      'div',
                      {class: withVendorCSSClassPrefix('consent__header')},
                      sectionTitle(
                        optionalName,
                        translate(
                          permission ? 'consent.optional_scope.info' : 'consent.optional_claims.info',
                          permission ? '' : 'These attributes are optional and can be provided at your discretion.',
                        ),
                      ),
                    ),
                    toggle(`consent_opt_${purpose.purposeId}_all`, allSelected, optionalName, (checked: boolean) =>
                      purpose.optional.forEach((element) =>
                        props.onInputChange(
                          getConsentOptionalKey(purpose.purposeId, element.name),
                          checked ? 'true' : 'false',
                        ),
                      ),
                    ),
                  ]),
                  itemList(purpose.optional, false),
                ])
              : null,
          ]);
        }),
        props.validityInput ? validityField() : null,
      ]);
    };
  },
});

export default Consent;
