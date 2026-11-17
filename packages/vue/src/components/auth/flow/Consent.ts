// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  type ConsentPermissionBranch,
  type ConsentPermissionBranchItem,
  type ConsentPurposeData,
  getConsentPermissionBranches,
  withVendorCSSClassPrefix,
} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';
import {InfoIcon} from '../../primitives/Icons';
import Typography from '../../primitives/Typography';

export type ConsentData = string | ConsentPurposeData[] | {purposes: ConsentPurposeData[]};

export interface ConsentRenderProps {
  formValues: Record<string, string>;
  onInputChange: (name: string, value: string) => void;
  purposes: ConsentPurposeData[];
}

export interface ConsentProps {
  consentData?: ConsentData;
  formValues: Record<string, string>;
  onInputChange: (name: string, value: string) => void;
  t?: (key: string) => string;
}

export const getConsentOptionalKey = (purposeId: string, attrName: string): string =>
  `__consent_opt__${purposeId}__${attrName}`;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const toPromptElements = (value: unknown): {name: string}[] =>
  Array.isArray(value)
    ? value.filter(
        (element: unknown): element is {name: string} => isObject(element) && typeof element['name'] === 'string',
      )
    : [];

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
        essential: toPromptElements(purpose['essential']),
        optional: toPromptElements(purpose['optional']),
        ...(purpose['displayElements'] !== undefined
          ? {displayElements: toPromptElements(purpose['displayElements'])}
          : {}),
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
    onInputChange: {required: true, type: Function as PropType<ConsentProps['onInputChange']>},
    t: {default: undefined, type: Function as PropType<ConsentProps['t']>},
  },
  setup(props: Readonly<ConsentProps>, {slots}: SetupContext): () => VNode | null {
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

    return (): VNode | null => {
      const purposes: ConsentPurposeData[] = parsePurposes(props.consentData);
      if (purposes.length === 0) return null;
      if (slots['default'])
        return h('div', slots['default']({formValues: props.formValues, onInputChange: props.onInputChange, purposes}));

      return h(
        'div',
        {class: withVendorCSSClassPrefix('consent')},
        purposes.map((purpose: ConsentPurposeData) => {
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

          const branchList = (branches: ConsentPermissionBranch[]): VNode =>
            h('div', {class: withVendorCSSClassPrefix('consent__items')}, [
              ...branches.map((branch: ConsentPermissionBranch) => {
                const label: string = translate(`consent.${branch.name}`, branch.name);
                return h('div', {class: withVendorCSSClassPrefix('consent__branch'), key: branch.name}, [
                  h('div', {class: withVendorCSSClassPrefix('consent__item')}, [
                    h('div', {class: withVendorCSSClassPrefix('consent__item-label')}, [
                      h('span', {class: withVendorCSSClassPrefix('consent__bullet')}),
                      h(Typography, {component: 'span', variant: 'body2'}, () => label),
                    ]),
                    toggle(
                      `consent_opt_${purpose.purposeId}_${branch.name}`,
                      props.formValues[getConsentOptionalKey(purpose.purposeId, branch.name)] === 'true',
                      label,
                      (value: boolean) =>
                        branch.decisions.forEach((name: string) =>
                          props.onInputChange(getConsentOptionalKey(purpose.purposeId, name), value ? 'true' : 'false'),
                        ),
                    ),
                  ]),
                  ...branch.descendants.map((item: ConsentPermissionBranchItem) =>
                    h(
                      'div',
                      {
                        class: withVendorCSSClassPrefix('consent__branch-descendant'),
                        key: item.name,
                        style: {paddingLeft: `${item.depth}rem`},
                      },
                      [
                        h(Typography, {component: 'span', variant: 'body2'}, () =>
                          translate(`consent.${item.name}`, item.name),
                        ),
                      ],
                    ),
                  ),
                ]);
              }),
              h(
                Typography,
                {class: withVendorCSSClassPrefix('consent__branch-notice'), component: 'p', variant: 'caption'},
                () =>
                  translate(
                    'consent.permissions.subtree_notice',
                    'Approving a permission also approves the permissions beneath it, including any added later.',
                  ),
              ),
            ]);
          const branches: ConsentPermissionBranch[] = getConsentPermissionBranches(purpose);

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
                  branches.length > 0 ? branchList(branches) : itemList(purpose.optional, false),
                ])
              : null,
          ]);
        }),
      );
    };
  },
});

export default Consent;
