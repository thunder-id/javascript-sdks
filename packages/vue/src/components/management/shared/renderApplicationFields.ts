// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {APPLICATION_GRANT_TYPES, withVendorCSSClassPrefix} from '@thunderid/browser';
import {type VNode, h} from 'vue';
import type {AdminTranslate} from './useAdminTranslation';
import Checkbox from '../../primitives/Checkbox/Checkbox';
import TextField from '../../primitives/TextField/TextField';

const cls = (element: string): string => withVendorCSSClassPrefix(`admin__${element}`);

/**
 * The text fields of the application forms.
 */
export type ApplicationTextField = 'description' | 'logoUrl' | 'name' | 'redirectUris' | 'url';

/**
 * The values of the application forms. `redirectUris` is the text of the field, URIs separated by
 * commas.
 */
export interface ApplicationFormValues {
  description: string;
  grantTypes: string[];
  logoUrl: string;
  name: string;
  publicClient: boolean;
  redirectUris: string;
  url: string;
}

/**
 * Renders the general fields and OAuth basics of an application, shared by the create form and the
 * edit form. The public client choice shows only when `onPublicClientChange` is given.
 */
const renderApplicationFields = ({
  onGrantTypesChange,
  onInputChange,
  onPublicClientChange,
  t,
  uid,
  values,
}: {
  onGrantTypesChange: (grantTypes: string[]) => void;
  onInputChange: (field: ApplicationTextField, value: string) => void;
  onPublicClientChange?: (publicClient: boolean) => void;
  t: AdminTranslate;
  /** A unique prefix for the field names. */
  uid: string;
  values: ApplicationFormValues;
}): VNode[] => {
  const text = (field: ApplicationTextField, label: string, extra: Record<string, unknown> = {}): VNode =>
    h(TextField, {
      autoComplete: 'off',
      label,
      modelValue: values[field],
      name: `${uid}-${field}`,
      'onUpdate:modelValue': (value: string): void => onInputChange(field, value),
      ...extra,
    });

  return [
    text('name', t('admin.applications.fields.name'), {required: true}),
    text('description', t('admin.applications.fields.description')),
    text('url', t('admin.applications.fields.url')),
    text('logoUrl', t('admin.applications.fields.logo_url')),
    text('redirectUris', t('admin.applications.fields.redirect_uris'), {
      helperText: t('admin.applications.fields.redirect_uris_hint'),
    }),
    h('fieldset', {class: cls('row'), style: {border: 0, flexWrap: 'wrap', margin: 0, padding: 0}}, [
      h('legend', {class: cls('muted')}, t('admin.applications.fields.grant_types')),
      ...APPLICATION_GRANT_TYPES.map((grantType: string) =>
        h(Checkbox, {
          key: grantType,
          label: t(`admin.applications.grant_types.${grantType}`),
          modelValue: values.grantTypes.includes(grantType),
          name: `${uid}-grant-type-${grantType}`,
          'onUpdate:modelValue': (checked: boolean): void =>
            onGrantTypesChange(
              checked
                ? [...values.grantTypes, grantType]
                : values.grantTypes.filter((value: string) => value !== grantType),
            ),
        }),
      ),
    ]),
    ...(onPublicClientChange
      ? [
          h(Checkbox, {
            label: t('admin.applications.fields.public_client'),
            modelValue: values.publicClient,
            name: `${uid}-public-client`,
            'onUpdate:modelValue': onPublicClientChange,
          }),
        ]
      : []),
  ];
};

export default renderApplicationFields;
