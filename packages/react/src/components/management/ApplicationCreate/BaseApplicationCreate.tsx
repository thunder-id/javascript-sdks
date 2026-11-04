// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  APPLICATION_GRANT_TYPES,
  ApplicationSubmission,
  DEFAULT_APPLICATION_GRANT_TYPES,
  isApplicationSubmissionValid,
  parseRedirectUris,
  Preferences,
  SelectOption,
} from '@thunderid/browser';
import {FC, FormEvent, ReactElement, ReactNode, useState} from 'react';
import useTheme from '../../../contexts/Theme/useTheme';
import useTranslation from '../../../hooks/useTranslation';
import Alert from '../../primitives/Alert/Alert';
import Button from '../../primitives/Button/Button';
import AdminSection from '../shared/AdminSection';
import useStyles from '../shared/AdminSection.styles';
import ApplicationFormFields, {ApplicationFormValues, ApplicationTextField} from '../shared/ApplicationFormFields';
import ClientSecretNotice from '../shared/ClientSecretNotice';

/**
 * The application {@link BaseApplicationCreate} submits. The organization unit is added by the caller.
 */
export type ApplicationCreateSubmission = ApplicationSubmission;

/**
 * What {@link BaseApplicationCreate} hands its `children` render function, so the form can be built with any UI.
 */
export interface BaseApplicationCreateRenderProps {
  /**
   * The client secret of the application just created, to show once. `null` while there is none.
   */
  clientSecret: string | null;
  error: string | null;
  /**
   * The grant types to choose from, with translated labels.
   */
  grantTypeOptions: SelectOption[];
  /**
   * Sets the chosen grant types.
   */
  handleGrantTypesChange: (grantTypes: string[]) => void;
  /**
   * Sets one text field of the form. `redirectUris` takes URIs separated by commas.
   */
  handleInputChange: (field: ApplicationTextField, value: string) => void;
  /**
   * Sets whether the client is public.
   */
  handlePublicClientChange: (publicClient: boolean) => void;
  /**
   * Submits the current values. Does nothing while they are not valid.
   */
  handleSubmit: () => void;
  isSubmitting: boolean;
  /**
   * Whether the values can be submitted.
   */
  isValid: boolean;
  onCancel?: () => void;
  /**
   * Hides the client secret once it has been copied. Undefined while there is no secret.
   */
  onSecretDismiss?: () => void;
  values: ApplicationFormValues;
}

export interface BaseApplicationCreateProps {
  /**
   * Renders custom UI in place of the default form. Receives the values, their setters, the grant
   * types, the submit handler, the submission state and the client secret to show.
   */
  children?: (props: BaseApplicationCreateRenderProps) => ReactNode;
  className?: string;
  /**
   * The client secret of the application just created. When set, the form gives way to the secret,
   * which can be read only this once, until `onSecretDismiss` clears it.
   */
  clientSecret?: string | null;
  description?: string;
  error?: string | null;
  isSubmitting?: boolean;
  onCancel?: () => void;
  /**
   * Called when the user has copied the client secret.
   */
  onSecretDismiss?: () => void;
  onSubmit: (application: ApplicationCreateSubmission) => void;
  preferences?: Preferences;
  title?: string;
}

/**
 * A form that collects a new application's name, description, links and OAuth basics: redirect URIs,
 * grant types and whether the client is public. Holds no data of its own: handle the submission, and
 * pass back the client secret the server returned to show it once.
 */
const BaseApplicationCreate: FC<BaseApplicationCreateProps> = ({
  children,
  className,
  clientSecret = null,
  description,
  error = null,
  isSubmitting = false,
  onCancel,
  onSecretDismiss,
  onSubmit,
  preferences,
  title,
}: BaseApplicationCreateProps): ReactElement => {
  const {theme, colorScheme} = useTheme();
  const styles: Record<string, string> = useStyles(theme, colorScheme);
  const {t} = useTranslation(preferences?.i18n);
  const [values, setValues] = useState<ApplicationFormValues>({
    description: '',
    grantTypes: [...DEFAULT_APPLICATION_GRANT_TYPES],
    logoUrl: '',
    name: '',
    publicClient: false,
    redirectUris: '',
    url: '',
  });

  const submission: ApplicationCreateSubmission = {
    description: values.description.trim() || undefined,
    grantTypes: values.grantTypes,
    logoUrl: values.logoUrl.trim() || undefined,
    name: values.name.trim(),
    publicClient: values.publicClient,
    redirectUris: parseRedirectUris(values.redirectUris),
    url: values.url.trim() || undefined,
  };
  const isValid: boolean = isApplicationSubmissionValid(submission);

  const setInput = (field: ApplicationTextField, value: string): void =>
    setValues((previous: ApplicationFormValues) => ({...previous, [field]: value}));
  const setGrantTypes = (grantTypes: string[]): void =>
    setValues((previous: ApplicationFormValues) => ({...previous, grantTypes}));
  const setPublicClient = (publicClient: boolean): void =>
    setValues((previous: ApplicationFormValues) => ({...previous, publicClient}));

  const submit = (): void => {
    if (isValid && !isSubmitting) {
      onSubmit(submission);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    submit();
  };

  if (children) {
    return (
      <div className={className}>
        {children({
          clientSecret,
          error,
          grantTypeOptions: APPLICATION_GRANT_TYPES.map((grantType: string) => ({
            label: t(`admin.applications.grant_types.${grantType}`),
            value: grantType,
          })),
          handleGrantTypesChange: setGrantTypes,
          handleInputChange: setInput,
          handlePublicClientChange: setPublicClient,
          handleSubmit: submit,
          isSubmitting,
          isValid,
          onCancel,
          onSecretDismiss: clientSecret ? onSecretDismiss : undefined,
          values,
        })}
      </div>
    );
  }

  return (
    <AdminSection
      block="application-create"
      className={className}
      title={title ?? t('admin.applications.create.title')}
      description={description}
      preferences={preferences}
    >
      {clientSecret ? (
        <ClientSecretNotice secret={clientSecret} onDismiss={onSecretDismiss} preferences={preferences} />
      ) : (
        <form className={styles['form']} onSubmit={handleSubmit} noValidate>
          {error && (
            <Alert variant="error" role="alert">
              {error}
            </Alert>
          )}
          <ApplicationFormFields
            preferences={preferences}
            values={values}
            onInputChange={setInput}
            onGrantTypesChange={setGrantTypes}
            onPublicClientChange={setPublicClient}
          />
          <div className={styles['formActions']}>
            {onCancel && (
              <Button type="button" variant="text" onClick={onCancel} disabled={isSubmitting}>
                {t('admin.common.actions.cancel')}
              </Button>
            )}
            <Button type="submit" loading={isSubmitting} disabled={!isValid || isSubmitting}>
              {t('admin.applications.create.submit')}
            </Button>
          </div>
        </form>
      )}
    </AdminSection>
  );
};

export default BaseApplicationCreate;
