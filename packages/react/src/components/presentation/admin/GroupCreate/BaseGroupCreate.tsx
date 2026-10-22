// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Preferences} from '@thunderid/browser';
import {ChangeEvent, FC, FormEvent, ReactElement, ReactNode, useState} from 'react';
import useTheme from '../../../../contexts/Theme/useTheme';
import useTranslation from '../../../../hooks/useTranslation';
import Alert from '../../../primitives/Alert/Alert';
import Button from '../../../primitives/Button/Button';
import TextField from '../../../primitives/TextField/TextField';
import AdminSection from '../shared/AdminSection';
import useStyles from '../shared/AdminSection.styles';

/**
 * The group {@link BaseGroupCreate} submits. The organization unit is added by the caller.
 */
export interface GroupCreateSubmission {
  description?: string;
  name: string;
}

/**
 * What {@link BaseGroupCreate} hands its `children` render function, so the form can be built with any UI.
 */
export interface BaseGroupCreateRenderProps {
  error: string | null;
  /**
   * Sets one field of the form.
   */
  handleInputChange: (field: 'description' | 'name', value: string) => void;
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
  values: {description: string; name: string};
}

export interface BaseGroupCreateProps {
  /**
   * Renders custom UI in place of the default form. Receives the values, their setters, the submit
   * handler and the submission state.
   */
  children?: (props: BaseGroupCreateRenderProps) => ReactNode;
  className?: string;
  description?: string;
  error?: string | null;
  isSubmitting?: boolean;
  onCancel?: () => void;
  onSubmit: (group: GroupCreateSubmission) => void;
  preferences?: Preferences;
  title?: string;
}

/**
 * A form that collects a new group's name and description. Holds no data of its own: handle the
 * submission.
 */
const BaseGroupCreate: FC<BaseGroupCreateProps> = ({
  children,
  className,
  description,
  error = null,
  isSubmitting = false,
  onCancel,
  onSubmit,
  preferences,
  title,
}: BaseGroupCreateProps): ReactElement => {
  const {theme, colorScheme} = useTheme();
  const styles: Record<string, string> = useStyles(theme, colorScheme);
  const {t} = useTranslation(preferences?.i18n);
  const [name, setName] = useState<string>('');
  const [groupDescription, setGroupDescription] = useState<string>('');

  const isValid: boolean = name.trim().length > 0;

  const submit = (): void => {
    if (isValid) {
      onSubmit({description: groupDescription.trim() || undefined, name: name.trim()});
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
          handleInputChange: (field: 'description' | 'name', value: string): void =>
            field === 'name' ? setName(value) : setGroupDescription(value),
          handleSubmit: submit,
          isSubmitting,
          isValid,
          onCancel,
          values: {description: groupDescription, name},
        })}
      </div>
    );
  }

  return (
    <AdminSection
      block="group-create"
      className={className}
      title={title ?? t('admin.groups.create.title')}
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
          name="name"
          label={t('admin.groups.create.fields.name')}
          required
          value={name}
          onChange={(event: ChangeEvent<HTMLInputElement>): void => setName(event.target.value)}
        />
        <TextField
          name="description"
          label={t('admin.groups.create.fields.description')}
          value={groupDescription}
          onChange={(event: ChangeEvent<HTMLInputElement>): void => setGroupDescription(event.target.value)}
        />
        <div className={styles['formActions']}>
          {onCancel && (
            <Button type="button" variant="text" onClick={onCancel} disabled={isSubmitting}>
              {t('admin.common.actions.cancel')}
            </Button>
          )}
          <Button type="submit" loading={isSubmitting} disabled={!isValid || isSubmitting}>
            {t('admin.groups.create.submit')}
          </Button>
        </div>
      </form>
    </AdminSection>
  );
};

export default BaseGroupCreate;
