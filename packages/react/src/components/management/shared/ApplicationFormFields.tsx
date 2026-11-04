// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {APPLICATION_GRANT_TYPES, Preferences} from '@thunderid/browser';
import {ChangeEvent, FC, ReactElement} from 'react';
import useAdminPartStyles from './useAdminPartStyles';
import useTranslation from '../../../hooks/useTranslation';
import Checkbox from '../../primitives/Checkbox/Checkbox';
import TextField from '../../primitives/TextField/TextField';

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

export interface ApplicationFormFieldsProps {
  onGrantTypesChange: (grantTypes: string[]) => void;
  onInputChange: (field: ApplicationTextField, value: string) => void;
  /**
   * Shows the public client choice. Omit it where the client type cannot change.
   */
  onPublicClientChange?: (publicClient: boolean) => void;
  preferences?: Preferences;
  values: ApplicationFormValues;
}

/**
 * The general fields and OAuth basics of an application, shared by the create form and the edit form.
 */
const ApplicationFormFields: FC<ApplicationFormFieldsProps> = ({
  onGrantTypesChange,
  onInputChange,
  onPublicClientChange,
  preferences,
  values,
}: ApplicationFormFieldsProps): ReactElement => {
  const styles: Record<string, string> = useAdminPartStyles();
  const {t} = useTranslation(preferences?.i18n);

  const text = (field: ApplicationTextField, label: string, extra: {helperText?: string; required?: boolean} = {}) => (
    <TextField
      name={field}
      label={label}
      value={values[field]}
      autoComplete="off"
      onChange={(event: ChangeEvent<HTMLInputElement>): void => onInputChange(field, event.target.value)}
      {...extra}
    />
  );

  return (
    <>
      {text('name', t('admin.applications.fields.name'), {required: true})}
      {text('description', t('admin.applications.fields.description'))}
      {text('url', t('admin.applications.fields.url'))}
      {text('logoUrl', t('admin.applications.fields.logo_url'))}
      {text('redirectUris', t('admin.applications.fields.redirect_uris'), {
        helperText: t('admin.applications.fields.redirect_uris_hint'),
      })}
      <fieldset className={styles['row']} style={{border: 0, flexWrap: 'wrap', margin: 0, padding: 0}}>
        <legend className={styles['muted']}>{t('admin.applications.fields.grant_types')}</legend>
        {APPLICATION_GRANT_TYPES.map((grantType: string) => (
          <Checkbox
            key={grantType}
            name={`grantType-${grantType}`}
            label={t(`admin.applications.grant_types.${grantType}`)}
            checked={values.grantTypes.includes(grantType)}
            onChange={(event: ChangeEvent<HTMLInputElement>): void =>
              onGrantTypesChange(
                event.target.checked
                  ? [...values.grantTypes, grantType]
                  : values.grantTypes.filter((value: string) => value !== grantType),
              )
            }
          />
        ))}
      </fieldset>
      {onPublicClientChange && (
        <Checkbox
          name="publicClient"
          label={t('admin.applications.fields.public_client')}
          checked={values.publicClient}
          onChange={(event: ChangeEvent<HTMLInputElement>): void => onPublicClientChange(event.target.checked)}
        />
      )}
    </>
  );
};

export default ApplicationFormFields;
