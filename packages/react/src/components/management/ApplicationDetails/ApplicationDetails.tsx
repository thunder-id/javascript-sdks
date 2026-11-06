// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AdministrationMode,
  Application,
  ApplicationQueryKeys,
  deleteApplication,
  getApplication,
  regenerateClientSecret,
  RegenerateClientSecretResult,
  toManagementErrorMessage,
  toUpdateApplicationRequest,
  updateApplication,
} from '@thunderid/browser';
import {FC, ReactElement} from 'react';
import BaseApplicationDetails, {
  ApplicationUpdateSubmission,
  BaseApplicationDetailsProps,
} from './BaseApplicationDetails';
import useAccountLifecycle, {AccountLifecycleState} from '../../../hooks/management/useAccountLifecycle';
import useManagementEndpoint, {ManagementEndpoint} from '../../../hooks/management/useManagementEndpoint';
import useResourceMutation, {ResourceMutationResult} from '../../../hooks/management/useResourceMutation';
import useResourceQuery, {ResourceQueryResult} from '../../../hooks/management/useResourceQuery';
import useTranslation from '../../../hooks/useTranslation';

interface UpdateApplicationVariables {
  application: Application;
  changes: ApplicationUpdateSubmission;
}

export type ApplicationDetailsProps = Omit<
  BaseApplicationDetailsProps,
  | 'application'
  | 'clientSecret'
  | 'error'
  | 'isDeleting'
  | 'isLoading'
  | 'isRegeneratingSecret'
  | 'isRunningLifecycleAction'
  | 'isUpdating'
  | 'lifecycleActions'
  | 'onDelete'
  | 'onLifecycleAction'
  | 'onRegenerateSecret'
  | 'onSecretDismiss'
  | 'onUpdate'
> & {
  /**
   * How the delete and the client secret regeneration run. `flow` runs the administration flow the server configures for it, which can revoke
   * grants and end sessions first. It needs `baseUrl`.
   * @default 'native'
   */
  administrationMode?: AdministrationMode;
  applicationId: string;
  /**
   * Whether the application can be deleted from this view.
   * @default false
   */
  deletable?: boolean;
  /**
   * Whether the application's general fields, redirect URIs and grant types can be edited from this view.
   * @default false
   */
  editable?: boolean;
  /**
   * Whether the application can be suspended and unsuspended from this view. Each action runs through its
   * administration flow and is offered only when the server configures that flow. Reading the configured
   * flows needs a token that may read the server configuration.
   * @default false
   */
  lifecycleActions?: boolean;
  /**
   * Called after the application has been deleted.
   */
  onDeleted?: () => void;
  /**
   * Whether the application's client secret can be regenerated from this view. The new secret is shown
   * once.
   * @default false
   */
  secretRegenerable?: boolean;
};

/**
 * Shows an application and its OAuth configuration, and optionally lets the signed-in user edit it,
 * regenerate its client secret or delete it.
 *
 * The server guards applications with the root `system` permission, for reading and for changes alike;
 * it defines no application-specific permission. Gate the view and its actions on it with
 * `useGrantedPermissions().can('system')`.
 *
 * @example
 * ```tsx
 * const {can} = useGrantedPermissions();
 * const isAdmin = can('system');
 *
 * <ApplicationDetails
 *   applicationId={applicationId}
 *   editable={isAdmin}
 *   deletable={isAdmin}
 *   secretRegenerable={isAdmin}
 *   onDeleted={() => navigate('/applications')}
 * />
 * ```
 */
const ApplicationDetails: FC<ApplicationDetailsProps> = ({
  administrationMode,
  applicationId,
  deletable = false,
  editable = false,
  lifecycleActions = false,
  onDeleted,
  preferences,
  secretRegenerable = false,
  ...rest
}: ApplicationDetailsProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const endpoint: ManagementEndpoint = useManagementEndpoint('applications');
  const application: ResourceQueryResult<Application> = useResourceQuery(
    [ApplicationQueryKeys.APPLICATION, applicationId],
    (fetcher) => getApplication({...endpoint, applicationId, fetcher}),
    {enabled: Boolean(applicationId)},
  );
  const deletion: ResourceMutationResult<void, string> = useResourceMutation(
    (id: string, fetcher) => deleteApplication({...endpoint, administrationMode, applicationId: id, fetcher}),
    () => [[ApplicationQueryKeys.APPLICATIONS]],
    {onSuccess: onDeleted},
  );
  const update: ResourceMutationResult<Application, UpdateApplicationVariables> = useResourceMutation(
    ({application: current, changes}: UpdateApplicationVariables, fetcher) =>
      updateApplication({
        ...endpoint,
        applicationId: current.id,
        fetcher,
        payload: toUpdateApplicationRequest(current, changes),
      }),
    ({application: current}: UpdateApplicationVariables) => [
      [ApplicationQueryKeys.APPLICATION, current.id],
      [ApplicationQueryKeys.APPLICATIONS],
    ],
  );
  const regeneration: ResourceMutationResult<RegenerateClientSecretResult, string> = useResourceMutation(
    (id: string, fetcher) => regenerateClientSecret({...endpoint, administrationMode, applicationId: id, fetcher}),
    (id: string) => [[ApplicationQueryKeys.APPLICATION, id], [ApplicationQueryKeys.APPLICATIONS]],
  );

  const lifecycle: AccountLifecycleState = useAccountLifecycle({
    enabled: lifecycleActions,
    invalidatedKeys: [[ApplicationQueryKeys.APPLICATION, applicationId], [ApplicationQueryKeys.APPLICATIONS]],
    kind: 'application',
    status: application.data?.status?.value,
    subject: applicationId,
  });

  return (
    <BaseApplicationDetails
      application={application.data}
      isLoading={application.isLoading}
      error={
        toManagementErrorMessage(t, application.error, 'admin.applications.details.error') ??
        toManagementErrorMessage(t, deletion.error, 'admin.applications.details.delete.error') ??
        toManagementErrorMessage(t, update.error, 'admin.applications.details.edit.error') ??
        toManagementErrorMessage(t, regeneration.error, 'admin.applications.details.secret.error') ??
        toManagementErrorMessage(t, lifecycle.error, 'admin.common.lifecycle.error') ??
        toManagementErrorMessage(t, lifecycle.loadError, 'admin.common.lifecycle.load_error')
      }
      isDeleting={deletion.isLoading}
      onDelete={deletable ? (): void => void deletion.mutate(applicationId) : undefined}
      lifecycleActions={lifecycle.actions}
      isRunningLifecycleAction={lifecycle.isRunning}
      onLifecycleAction={lifecycleActions ? lifecycle.run : undefined}
      isUpdating={update.isLoading}
      onUpdate={
        editable && application.data
          ? (changes: ApplicationUpdateSubmission): void =>
              void update.mutate({application: application.data!, changes})
          : undefined
      }
      isRegeneratingSecret={regeneration.isLoading}
      onRegenerateSecret={secretRegenerable ? (): void => void regeneration.mutate(applicationId) : undefined}
      clientSecret={regeneration.data?.clientSecret ?? null}
      onSecretDismiss={regeneration.reset}
      preferences={preferences}
      {...rest}
    />
  );
};

export default ApplicationDetails;
