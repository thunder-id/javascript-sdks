// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Preferences} from '@thunderid/browser';
import {ChangeEvent, FC, FormEvent, ReactElement, ReactNode, useState} from 'react';
import useTheme from '../../../contexts/Theme/useTheme';
import useTranslation from '../../../hooks/useTranslation';
import Alert from '../../primitives/Alert/Alert';
import Button from '../../primitives/Button/Button';
import TextField from '../../primitives/TextField/TextField';
import AdminSection from '../shared/AdminSection';
import useStyles from '../shared/AdminSection.styles';

/**
 * The project {@link BaseProjectCreate} submits.
 */
export interface ProjectCreateSubmission {
  description?: string;
  displayName: string;
  /**
   * Immutable identifier: lowercase letters, numbers, hyphens and underscores.
   */
  handle: string;
}

/**
 * The fields of {@link BaseProjectCreate}.
 */
export type ProjectCreateField = 'description' | 'displayName' | 'handle';

/**
 * What {@link BaseProjectCreate} hands its `children` render function, so the form can be built with any UI.
 */
export interface BaseProjectCreateRenderProps {
  error: string | null;
  /**
   * Sets one field of the form.
   */
  handleInputChange: (field: ProjectCreateField, value: string) => void;
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
  values: Record<ProjectCreateField, string>;
}

export interface BaseProjectCreateProps {
  /**
   * Renders custom UI in place of the default form. Receives the values, their setters, the submit
   * handler and the submission state.
   */
  children?: (props: BaseProjectCreateRenderProps) => ReactNode;
  className?: string;
  description?: string;
  error?: string | null;
  isSubmitting?: boolean;
  onCancel?: () => void;
  onSubmit: (project: ProjectCreateSubmission) => void;
  preferences?: Preferences;
  title?: string;
}

/**
 * A form that collects a new project's handle, display name and description. Holds no data of its
 * own: handle the submission.
 */
const BaseProjectCreate: FC<BaseProjectCreateProps> = ({
  children,
  className,
  description,
  error = null,
  isSubmitting = false,
  onCancel,
  onSubmit,
  preferences,
  title,
}: BaseProjectCreateProps): ReactElement => {
  const {theme, colorScheme} = useTheme();
  const styles: Record<string, string> = useStyles(theme, colorScheme);
  const {t} = useTranslation(preferences?.i18n);
  const [values, setValues] = useState<Record<ProjectCreateField, string>>({
    description: '',
    displayName: '',
    handle: '',
  });

  const isValid: boolean = values.handle.trim().length > 0 && values.displayName.trim().length > 0;

  const setField = (field: ProjectCreateField, value: string): void =>
    setValues((previous: Record<ProjectCreateField, string>) => ({...previous, [field]: value}));

  const submit = (): void => {
    if (isValid && !isSubmitting) {
      onSubmit({
        description: values.description.trim() || undefined,
        displayName: values.displayName.trim(),
        handle: values.handle.trim(),
      });
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
          error,
          handleInputChange: setField,
          handleSubmit: submit,
          isSubmitting,
          isValid,
          onCancel,
          values,
        })}
      </div>
    );
  }

  return (
    <AdminSection
      block="project-create"
      className={className}
      title={title ?? t('admin.projects.create.title')}
      description={description}
      preferences={preferences}
    >
      <form className={styles['form']} onSubmit={handleSubmit} noValidate>
        {error && (
          <Alert variant="error" role="alert">
            {error}
          </Alert>
        )}
        <TextField
          name="handle"
          label={t('admin.projects.fields.handle')}
          helperText={t('admin.projects.fields.handle_hint')}
          required
          value={values.handle}
          onChange={(event: ChangeEvent<HTMLInputElement>): void => setField('handle', event.target.value)}
        />
        <TextField
          name="displayName"
          label={t('admin.projects.fields.display_name')}
          required
          value={values.displayName}
          onChange={(event: ChangeEvent<HTMLInputElement>): void => setField('displayName', event.target.value)}
        />
        <TextField
          name="description"
          label={t('admin.projects.fields.description')}
          value={values.description}
          onChange={(event: ChangeEvent<HTMLInputElement>): void => setField('description', event.target.value)}
        />
        <div className={styles['formActions']}>
          {onCancel && (
            <Button type="button" variant="text" onClick={onCancel} disabled={isSubmitting}>
              {t('admin.common.actions.cancel')}
            </Button>
          )}
          <Button type="submit" loading={isSubmitting} disabled={!isValid || isSubmitting}>
            {t('admin.projects.create.submit')}
          </Button>
        </div>
      </form>
    </AdminSection>
  );
};

export default BaseProjectCreate;
