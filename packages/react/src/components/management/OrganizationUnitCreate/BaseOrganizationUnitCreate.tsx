// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Preferences, SelectOption} from '@thunderid/browser';
import {ChangeEvent, FC, FormEvent, ReactElement, ReactNode, useState} from 'react';
import useTheme from '../../../contexts/Theme/useTheme';
import useTranslation from '../../../hooks/useTranslation';
import Alert from '../../primitives/Alert/Alert';
import Button from '../../primitives/Button/Button';
import Select from '../../primitives/Select/Select';
import TextField from '../../primitives/TextField/TextField';
import AdminSection from '../shared/AdminSection';
import useStyles from '../shared/AdminSection.styles';

/**
 * The organization unit {@link BaseOrganizationUnitCreate} submits.
 */
export interface OrganizationUnitCreateSubmission {
  description?: string;
  handle: string;
  name: string;
  /**
   * Identifier of the parent organization unit, or `null` for a unit at the top level.
   */
  parentId: string | null;
}

/**
 * The fields of {@link BaseOrganizationUnitCreate}. `parentId` is the parent's identifier, or an empty string for
 * the top level.
 */
export type OrganizationUnitCreateField = 'description' | 'handle' | 'name' | 'parentId';

/**
 * What {@link BaseOrganizationUnitCreate} hands its `children` render function, so the form can be built with any UI.
 */
export interface BaseOrganizationUnitCreateRenderProps {
  error: string | null;
  /**
   * Sets one field of the form.
   */
  handleInputChange: (field: OrganizationUnitCreateField, value: string) => void;
  /**
   * Submits the current values. Does nothing while they are not valid.
   */
  handleSubmit: () => void;
  isLoadingParents: boolean;
  isSubmitting: boolean;
  /**
   * Whether the values can be submitted.
   */
  isValid: boolean;
  onCancel?: () => void;
  /**
   * Loads more parent options. Undefined when every option is loaded or the parent is fixed.
   */
  onLoadMoreParents?: () => void;
  /**
   * The parents to choose from. Empty when the parent is fixed by `parentId`.
   */
  parentOptions: SelectOption[];
  values: Record<OrganizationUnitCreateField, string>;
}

export interface BaseOrganizationUnitCreateProps {
  /**
   * Renders custom UI in place of the default form. Receives the values, their setters, the parent
   * options, the submit handler and the submission state.
   */
  children?: (props: BaseOrganizationUnitCreateRenderProps) => ReactNode;
  className?: string;
  /**
   * The parent preselected in the picker.
   */
  defaultParentId?: string;
  description?: string;
  error?: string | null;
  isLoadingParents?: boolean;
  isSubmitting?: boolean;
  onCancel?: () => void;
  onLoadMoreParents?: () => void;
  onSubmit: (organizationUnit: OrganizationUnitCreateSubmission) => void;
  /**
   * The parent of the new unit. When set, the parent picker is hidden.
   */
  parentId?: string;
  /**
   * The parents the picker offers. The picker shows when `parentId` is not set and this is.
   */
  parentOptions?: SelectOption[];
  preferences?: Preferences;
  title?: string;
}

/**
 * A form that collects a new organization unit's name, handle, description and parent. Holds no data
 * of its own: pass the parent or the parents to choose from, and handle the submission.
 */
const BaseOrganizationUnitCreate: FC<BaseOrganizationUnitCreateProps> = ({
  children,
  className,
  defaultParentId,
  description,
  error = null,
  isLoadingParents = false,
  isSubmitting = false,
  onCancel,
  onLoadMoreParents,
  onSubmit,
  parentId,
  parentOptions,
  preferences,
  title,
}: BaseOrganizationUnitCreateProps): ReactElement => {
  const {theme, colorScheme} = useTheme();
  const styles: Record<string, string> = useStyles(theme, colorScheme);
  const {t} = useTranslation(preferences?.i18n);
  const [fields, setFields] = useState<Record<'description' | 'handle' | 'name', string>>({
    description: '',
    handle: '',
    name: '',
  });
  // Undefined until the user picks, so a default that arrives later still applies.
  const [chosenParentId, setChosenParentId] = useState<string | undefined>(undefined);

  const resolvedParentId: string = parentId ?? chosenParentId ?? defaultParentId ?? '';
  const values: Record<OrganizationUnitCreateField, string> = {...fields, parentId: resolvedParentId};
  const isValid: boolean = fields.name.trim().length > 0 && fields.handle.trim().length > 0;
  const showsPicker: boolean = parentId === undefined && parentOptions !== undefined;

  const setField = (field: OrganizationUnitCreateField, value: string): void => {
    if (field === 'parentId') {
      setChosenParentId(value);
    } else {
      setFields((previous: Record<'description' | 'handle' | 'name', string>) => ({...previous, [field]: value}));
    }
  };

  const submit = (): void => {
    if (isValid && !isSubmitting) {
      onSubmit({
        description: fields.description.trim() || undefined,
        handle: fields.handle.trim(),
        name: fields.name.trim(),
        parentId: resolvedParentId || null,
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
          isLoadingParents,
          isSubmitting,
          isValid,
          onCancel,
          onLoadMoreParents: showsPicker ? onLoadMoreParents : undefined,
          parentOptions: parentId === undefined ? (parentOptions ?? []) : [],
          values,
        })}
      </div>
    );
  }

  return (
    <AdminSection
      block="organization-unit-create"
      className={className}
      title={title ?? t('admin.organization_units.create.title')}
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
          label={t('admin.organization_units.fields.name')}
          required
          value={fields.name}
          onChange={(event: ChangeEvent<HTMLInputElement>): void => setField('name', event.target.value)}
        />
        <TextField
          name="handle"
          label={t('admin.organization_units.fields.handle')}
          required
          value={fields.handle}
          onChange={(event: ChangeEvent<HTMLInputElement>): void => setField('handle', event.target.value)}
        />
        <TextField
          name="description"
          label={t('admin.organization_units.fields.description')}
          value={fields.description}
          onChange={(event: ChangeEvent<HTMLInputElement>): void => setField('description', event.target.value)}
        />
        {showsPicker && (
          <Select
            name="parentId"
            label={t('admin.organization_units.fields.parent')}
            placeholder={t('admin.organization_units.fields.parent_none')}
            loading={isLoadingParents}
            onLoadMore={onLoadMoreParents}
            options={parentOptions}
            value={resolvedParentId}
            onChange={(event: ChangeEvent<HTMLSelectElement>): void => setField('parentId', event.target.value)}
          />
        )}
        <div className={styles['formActions']}>
          {onCancel && (
            <Button type="button" variant="text" onClick={onCancel} disabled={isSubmitting}>
              {t('admin.common.actions.cancel')}
            </Button>
          )}
          <Button type="submit" loading={isSubmitting} disabled={!isValid || isSubmitting}>
            {t('admin.organization_units.create.submit')}
          </Button>
        </div>
      </form>
    </AdminSection>
  );
};

export default BaseOrganizationUnitCreate;
