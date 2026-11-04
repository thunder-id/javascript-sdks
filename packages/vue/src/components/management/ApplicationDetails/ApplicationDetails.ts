// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  ApplicationQueryKeys,
  deleteApplication,
  getApplication,
  regenerateClientSecret,
  toManagementErrorMessage,
  toUpdateApplicationRequest,
  updateApplication,
} from '@thunderid/browser';
import type {AdministrationMode, Application, Preferences, RegenerateClientSecretResult} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';
import BaseApplicationDetails, {type ApplicationUpdateSubmission} from './BaseApplicationDetails';
import useAccountLifecycle, {type AccountLifecycleState} from '../../../composables/management/useAccountLifecycle';
import useManagementEndpoint, {type ManagementEndpoint} from '../../../composables/management/useManagementEndpoint';
import useResourceMutation, {type ResourceMutationResult} from '../../../composables/management/useResourceMutation';
import useResourceQuery, {type ResourceQueryResult} from '../../../composables/management/useResourceQuery';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

type ApplicationDetailsProps = Readonly<{
  administrationMode: AdministrationMode | undefined;
  applicationId: string;
  className: string;
  deletable: boolean;
  editable: boolean;
  lifecycleActions: boolean;
  preferences: Preferences | undefined;
  secretRegenerable: boolean;
}>;

interface UpdateApplicationVariables {
  application: Application;
  changes: ApplicationUpdateSubmission;
}

/**
 * Shows an application and its OAuth configuration, and optionally lets the signed-in user edit it,
 * regenerate its client secret (shown once) or delete it. Emits `deleted` after the application has
 * been deleted.
 *
 * The server guards applications with the root `system` permission, for reading and for changes alike;
 * it defines no application-specific permission. Gate the view and its actions on it with
 * `useGrantedPermissions().can('system')`.
 *
 * Slots: `actions`, rendered next to the application's name; `default`, a scoped slot that replaces the
 * view with custom UI and receives `BaseApplicationDetailsRenderProps`.
 *
 * @example
 * ```vue
 * <ApplicationDetails
 *   :application-id="applicationId"
 *   :editable="can('system')"
 *   :deletable="can('system')"
 *   :secret-regenerable="can('system')"
 *   @deleted="router.push('/applications')"
 * />
 * ```
 */
const ApplicationDetails: Component = defineComponent({
  name: 'ApplicationDetails',
  props: {
    /**
     * How the delete and the client secret regeneration run. `flow` runs the administration flow the
     * server configures for it, which can revoke grants and end sessions first. It needs `baseUrl`.
     * Defaults to `native`.
     */
    administrationMode: {default: undefined, type: String as PropType<AdministrationMode>},
    /** Identifier of the application to show. */
    applicationId: {required: true, type: String},
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** Whether the application can be deleted from this view. */
    deletable: {default: false, type: Boolean},
    /** Whether the application's general fields, redirect URIs and grant types can be edited from this view. */
    editable: {default: false, type: Boolean},
    /**
     * Whether the application can be suspended and unsuspended from this view. Each action runs through
     * its administration flow and is offered only when the server configures that flow. Reading the
     * configured flows needs a token that may read the server configuration.
     */
    lifecycleActions: {default: false, type: Boolean},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    /** Whether the application's client secret can be regenerated from this view. The new secret is shown once. */
    secretRegenerable: {default: false, type: Boolean},
  },
  emits: ['deleted'],
  setup(props: ApplicationDetailsProps, {emit, slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const endpoint: ManagementEndpoint = useManagementEndpoint('applications');
    const application: ResourceQueryResult<Application> = useResourceQuery(
      () => [ApplicationQueryKeys.APPLICATION, props.applicationId],
      (fetcher) => getApplication({...endpoint, applicationId: props.applicationId, fetcher}),
      {enabled: (): boolean => Boolean(props.applicationId)},
    );
    const deletion: ResourceMutationResult<void, string> = useResourceMutation(
      (applicationId: string, fetcher) =>
        deleteApplication({...endpoint, administrationMode: props.administrationMode, applicationId, fetcher}),
      () => [[ApplicationQueryKeys.APPLICATIONS]],
      {onSuccess: (): void => emit('deleted')},
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
      (applicationId: string, fetcher) =>
        regenerateClientSecret({...endpoint, administrationMode: props.administrationMode, applicationId, fetcher}),
      (applicationId: string) => [
        [ApplicationQueryKeys.APPLICATION, applicationId],
        [ApplicationQueryKeys.APPLICATIONS],
      ],
    );
    const lifecycle: AccountLifecycleState = useAccountLifecycle({
      enabled: (): boolean => props.lifecycleActions,
      invalidatedKeys: () => [
        [ApplicationQueryKeys.APPLICATION, props.applicationId],
        [ApplicationQueryKeys.APPLICATIONS],
      ],
      kind: 'application',
      status: () => application.data.value?.status?.value,
      subject: () => props.applicationId,
    });

    return (): VNode => {
      const current: Application | undefined = application.data.value;

      return h(
        BaseApplicationDetails,
        {
          application: current,
          className: props.className,
          clientSecret: regeneration.data.value?.clientSecret ?? null,
          error:
            toManagementErrorMessage(t, application.error.value, 'admin.applications.details.error') ??
            toManagementErrorMessage(t, deletion.error.value, 'admin.applications.details.delete.error') ??
            toManagementErrorMessage(t, update.error.value, 'admin.applications.details.edit.error') ??
            toManagementErrorMessage(t, regeneration.error.value, 'admin.applications.details.secret.error') ??
            toManagementErrorMessage(t, lifecycle.error.value, 'admin.common.lifecycle.error') ??
            toManagementErrorMessage(t, lifecycle.loadError.value, 'admin.common.lifecycle.load_error'),
          isDeleting: deletion.isLoading.value,
          isLoading: application.isLoading.value,
          isRegeneratingSecret: regeneration.isLoading.value,
          isRunningLifecycleAction: lifecycle.isRunning.value,
          isUpdating: update.isLoading.value,
          lifecycleActions: lifecycle.actions.value,
          onDelete: props.deletable ? (): void => void deletion.mutate(props.applicationId) : undefined,
          onLifecycleAction: props.lifecycleActions ? lifecycle.run : undefined,
          onRegenerateSecret: props.secretRegenerable
            ? (): void => void regeneration.mutate(props.applicationId)
            : undefined,
          onSecretDismiss: regeneration.reset,
          onUpdate:
            props.editable && current
              ? (changes: ApplicationUpdateSubmission): void => void update.mutate({application: current, changes})
              : undefined,
          preferences: props.preferences,
        },
        {...slots},
      );
    };
  },
});

export default ApplicationDetails;
