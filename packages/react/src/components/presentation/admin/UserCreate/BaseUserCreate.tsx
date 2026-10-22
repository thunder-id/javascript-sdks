// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Preferences, SelectOption} from '@thunderid/browser';
import {ChangeEvent, FC, FormEvent, ReactElement, ReactNode, useState} from 'react';
import {DEFAULT_USER_CREATE_FIELDS, UserCreateField} from './userCreateFields';
import useTheme from '../../../../contexts/Theme/useTheme';
import useTranslation from '../../../../hooks/useTranslation';
import Alert from '../../../primitives/Alert/Alert';
import Button from '../../../primitives/Button/Button';
import Select from '../../../primitives/Select/Select';
import TextField from '../../../primitives/TextField/TextField';
import AdminSection from '../shared/AdminSection';
import useStyles from '../shared/AdminSection.styles';

/**
 * The user {@link BaseUserCreate} submits. The organization unit is added by the caller.
 */
export interface UserCreateSubmission {
  attributes: Record<string, string>;
  type: string;
}

/**
 * What {@link BaseUserCreate} hands its `children` render function, so the form can be built with any UI.
 */
export interface BaseUserCreateRenderProps {
  error: string | null;
  /**
   * The attributes to collect.
   */
  fields: UserCreateField[];
  /**
   * Sets one attribute.
   */
  handleInputChange: (name: string, value: string) => void;
  /**
   * Submits the chosen type and the non-empty attributes. Does nothing while they are not valid.
   */
  handleSubmit: () => void;
  /**
   * Chooses the user type.
   */
  handleTypeChange: (type: string) => void;
  isSubmitting: boolean;
  /**
   * Whether a type is chosen and every required attribute has a value.
   */
  isValid: boolean;
  onCancel?: () => void;
  /**
   * The chosen user type.
   */
  type: string;
  userTypes: SelectOption[];
  /**
   * The attribute values, keyed by attribute name.
   */
  values: Record<string, string>;
}

export interface BaseUserCreateProps {
  /**
   * Renders custom UI in place of the default form. Receives the fields, the values and their
   * setters, the user types, the submit handler and the submission state.
   */
  children?: (props: BaseUserCreateRenderProps) => ReactNode;
  className?: string;
  description?: string;
  error?: string | null;
  /**
   * Attributes to collect.
   * @default username, email, given_name, family_name and password
   */
  fields?: UserCreateField[];
  isSubmitting?: boolean;
  onCancel?: () => void;
  onSubmit: (user: UserCreateSubmission) => void;
  preferences?: Preferences;
  title?: string;
  /**
   * The user types to choose from. The first one is selected by default.
   */
  userTypes: SelectOption[];
}

/**
 * A form that collects a new user's type and attributes. Holds no data of its own: pass the user
 * types and handle the submission.
 */
const BaseUserCreate: FC<BaseUserCreateProps> = ({
  children,
  className,
  description,
  error = null,
  fields = DEFAULT_USER_CREATE_FIELDS,
  isSubmitting = false,
  onCancel,
  onSubmit,
  preferences,
  title,
  userTypes,
}: BaseUserCreateProps): ReactElement => {
  const {theme, colorScheme} = useTheme();
  const styles: Record<string, string> = useStyles(theme, colorScheme);
  const {t} = useTranslation(preferences?.i18n);
  const [chosenType, setType] = useState<string>('');
  const type: string = chosenType || (userTypes[0]?.value ?? '');
  const [values, setValues] = useState<Record<string, string>>({});

  const isComplete: boolean =
    Boolean(type) && fields.every((field: UserCreateField) => !field.required || Boolean(values[field.name]?.trim()));

  const setValue = (name: string, value: string): void =>
    setValues((previous: Record<string, string>) => ({...previous, [name]: value}));

  const submit = (): void => {
    if (!isComplete) {
      return;
    }

    const attributes: Record<string, string> = Object.fromEntries(
      Object.entries(values).filter(([, value]: [string, string]) => value.trim() !== ''),
    );

    onSubmit({attributes, type});
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    submit();
  };

  if (children) {
    return (
      <div className={className}>
        {children({
          error,
          fields,
          handleInputChange: setValue,
          handleSubmit: submit,
          handleTypeChange: setType,
          isSubmitting,
          isValid: isComplete,
          onCancel,
          type,
          userTypes,
          values,
        })}
      </div>
    );
  }

  return (
    <AdminSection
      block="user-create"
      className={className}
      title={title ?? t('admin.users.create.title')}
      description={description}
      preferences={preferences}
    >
      <form className={styles['form']} onSubmit={handleSubmit} noValidate>
        {error && (
          <Alert variant="error" role="alert">
            {error}
          </Alert>
        )}
        <Select
          label={t('admin.users.create.fields.type')}
          name="type"
          required
          value={type}
          options={userTypes}
          onChange={(event: ChangeEvent<HTMLSelectElement>): void => setType(event.target.value)}
        />
        {fields.map((field: UserCreateField) => (
          <TextField
            key={field.name}
            name={field.name}
            type={field.type ?? 'text'}
            label={field.label ?? t(`admin.users.create.fields.${field.name}`)}
            required={field.required}
            autoComplete={field.type === 'password' ? 'new-password' : 'off'}
            value={values[field.name] ?? ''}
            onChange={(event: ChangeEvent<HTMLInputElement>): void => setValue(field.name, event.target.value)}
          />
        ))}
        <div className={styles['formActions']}>
          {onCancel && (
            <Button type="button" variant="text" onClick={onCancel} disabled={isSubmitting}>
              {t('admin.common.actions.cancel')}
            </Button>
          )}
          <Button type="submit" loading={isSubmitting} disabled={!isComplete || isSubmitting}>
            {t('admin.users.create.submit')}
          </Button>
        </div>
      </form>
    </AdminSection>
  );
};

export default BaseUserCreate;
