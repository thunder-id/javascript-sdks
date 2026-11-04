// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Preferences, Project} from '@thunderid/browser';
import {ChangeEvent, FC, FormEvent, ReactElement, ReactNode, useState} from 'react';
import useTranslation from '../../../hooks/useTranslation';
import Alert from '../../primitives/Alert/Alert';
import Button from '../../primitives/Button/Button';
import Spinner from '../../primitives/Spinner/Spinner';
import TextField from '../../primitives/TextField/TextField';
import {ConfirmButton, DetailList, Panel} from '../shared/AdminParts';
import AdminSection from '../shared/AdminSection';
import formatTimestamp from '../shared/formatTimestamp';
import useAdminPartStyles from '../shared/useAdminPartStyles';

/**
 * The changes {@link BaseProjectDetails} submits. The handle cannot change.
 */
export interface ProjectUpdateSubmission {
  description?: string;
  displayName: string;
}

/**
 * What {@link BaseProjectDetails} hands its `children` render function, so the project can be shown with any UI.
 */
export interface BaseProjectDetailsRenderProps {
  error: string | null;
  isDeleting: boolean;
  isLoading: boolean;
  isUpdating: boolean;
  /**
   * Deletes the project. Undefined when deletion is not allowed.
   */
  onDelete?: () => void;
  /**
   * Saves a new display name and description. Undefined when editing is not allowed.
   */
  onUpdate?: (changes: ProjectUpdateSubmission) => void;
  project?: Project;
}

export interface BaseProjectDetailsProps {
  /**
   * Controls rendered next to the project's name.
   */
  actions?: ReactNode;
  /**
   * Renders custom UI in place of the default view. Receives the project, the loading and error state,
   * and the update and delete handlers.
   */
  children?: (props: BaseProjectDetailsRenderProps) => ReactNode;
  className?: string;
  error?: string | null;
  isDeleting?: boolean;
  isLoading?: boolean;
  isUpdating?: boolean;
  /**
   * Deletes the project. The delete action is hidden when omitted.
   */
  onDelete?: () => void;
  /**
   * Saves a new display name and description. The edit action is hidden when omitted.
   */
  onUpdate?: (changes: ProjectUpdateSubmission) => void;
  preferences?: Preferences;
  project?: Project;
}

/**
 * Shows a project's handle, display name, description and creation time, and lets the caller edit and
 * delete it. Holds no data of its own: pass the project and handle the changes.
 */
const BaseProjectDetails: FC<BaseProjectDetailsProps> = ({
  actions,
  children,
  className,
  error = null,
  isDeleting = false,
  isLoading = false,
  isUpdating = false,
  onDelete,
  onUpdate,
  preferences,
  project,
}: BaseProjectDetailsProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const styles: Record<string, string> = useAdminPartStyles();
  const [draft, setDraft] = useState<{description: string; displayName: string} | null>(null);

  if (children) {
    return (
      <div className={className}>
        {children({
          error,
          isDeleting,
          isLoading,
          isUpdating,
          onDelete: project ? onDelete : undefined,
          onUpdate: project ? onUpdate : undefined,
          project,
        })}
      </div>
    );
  }

  if (isLoading && !project) {
    return (
      <AdminSection block="project-details" className={className} preferences={preferences}>
        <span className={styles['muted']} role="status">
          <Spinner size="small" /> {t('admin.common.loading')}
        </span>
      </AdminSection>
    );
  }

  if (!project) {
    return (
      <AdminSection block="project-details" className={className} preferences={preferences}>
        <Alert variant="error" role="alert">
          {error ?? t('admin.common.errors.not_found')}
        </Alert>
      </AdminSection>
    );
  }

  const notSet: string = t('admin.projects.details.not_set');

  const handleSave = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (draft?.displayName.trim()) {
      onUpdate?.({description: draft.description.trim() || undefined, displayName: draft.displayName.trim()});
      setDraft(null);
    }
  };

  return (
    <AdminSection
      block="project-details"
      className={className}
      title={project.displayName}
      description={project.description}
      preferences={preferences}
      actions={
        <>
          {actions}
          {onDelete && (
            <ConfirmButton
              confirmText={t('admin.projects.details.delete.confirm', {name: project.displayName})}
              isLoading={isDeleting}
              onConfirm={onDelete}
            >
              {t('admin.projects.details.delete.action')}
            </ConfirmButton>
          )}
        </>
      }
    >
      {error && (
        <Alert variant="error" role="alert">
          {error}
        </Alert>
      )}
      {draft ? (
        <Panel title={t('admin.projects.details.edit.action')}>
          <form
            className={styles['row']}
            style={{alignItems: 'stretch', flexDirection: 'column'}}
            onSubmit={handleSave}
            noValidate
          >
            <TextField
              name="displayName"
              label={t('admin.projects.fields.display_name')}
              required
              value={draft.displayName}
              onChange={(event: ChangeEvent<HTMLInputElement>): void =>
                setDraft({...draft, displayName: event.target.value})
              }
            />
            <TextField
              name="description"
              label={t('admin.projects.fields.description')}
              value={draft.description}
              onChange={(event: ChangeEvent<HTMLInputElement>): void =>
                setDraft({...draft, description: event.target.value})
              }
            />
            <div className={styles['row']} style={{justifyContent: 'flex-end'}}>
              <Button type="button" variant="text" disabled={isUpdating} onClick={(): void => setDraft(null)}>
                {t('admin.common.actions.cancel')}
              </Button>
              <Button type="submit" loading={isUpdating} disabled={isUpdating || !draft.displayName.trim()}>
                {t('admin.projects.details.edit.save')}
              </Button>
            </div>
          </form>
        </Panel>
      ) : (
        <Panel
          title={t('admin.projects.details.overview')}
          actions={
            onUpdate ? (
              <Button
                variant="outline"
                size="small"
                onClick={(): void =>
                  setDraft({description: project.description ?? '', displayName: project.displayName})
                }
              >
                {t('admin.projects.details.edit.action')}
              </Button>
            ) : undefined
          }
        >
          <DetailList
            items={[
              {label: t('admin.projects.fields.handle'), value: project.handle},
              {label: t('admin.projects.fields.display_name'), value: project.displayName},
              {
                label: t('admin.projects.fields.description'),
                value: project.description?.length ? project.description : notSet,
              },
              {label: t('admin.projects.fields.created'), value: formatTimestamp(project.createdAt) ?? notSet},
            ]}
          />
        </Panel>
      )}
    </AdminSection>
  );
};

export default BaseProjectDetails;
