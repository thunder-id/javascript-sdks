// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  ApplicationQueryKeys,
  createApplication,
  getApplicationClientSecret,
  toCreateApplicationRequest,
  toManagementErrorMessage,
} from '@thunderid/browser';
import type {Application, CreateApplicationRequest} from '@thunderid/browser';
import {
  type Component,
  type ComputedRef,
  type Ref,
  type SetupContext,
  type VNode,
  computed,
  defineComponent,
  h,
  ref,
} from 'vue';
import BaseApplicationCreate, {type ApplicationCreateSubmission} from './BaseApplicationCreate';
import useManagementEndpoint, {type ManagementEndpoint} from '../../../composables/management/useManagementEndpoint';
import useResourceMutation, {type ResourceMutationResult} from '../../../composables/management/useResourceMutation';
import {type AdminFormProps, adminFormProps} from '../shared/adminFormProps';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';
import useProjectPlacement, {type ProjectPlacement} from '../shared/useProjectPlacement';

type ApplicationCreateProps = Omit<AdminFormProps, 'error' | 'isSubmitting'> & Readonly<{ouId: string | undefined}>;

/**
 * Creates an application with an OAuth client through the management API in the given organization
 * unit, or the signed-in user's own. When the server returns a client secret, shows it once and emits
 * `created` with the application after the user has copied it; otherwise emits `created` right away.
 *
 * The server guards applications with the root `system` permission, for reading and for changes alike;
 * it defines no application-specific permission. Gate the view and its actions on it with
 * `useGrantedPermissions().can('system')`.
 *
 * Slots: `default`, a scoped slot that replaces the form with custom UI and receives
 * `BaseApplicationCreateRenderProps`.
 *
 * @example
 * ```vue
 * <ApplicationCreate @created="(application) => (selectedApplicationId = application.id)" />
 * ```
 */
const ApplicationCreate: Component = defineComponent({
  name: 'ApplicationCreate',
  props: {
    className: adminFormProps.className,
    description: adminFormProps.description,
    onCancel: adminFormProps.onCancel,
    /**
     * Organization unit the application is created in. Without it, the resource is created in the current project (sent as
     * `projectId`) when one is chosen, otherwise in the signed-in user's organization unit.
     */
    ouId: {default: undefined, type: String},
    preferences: adminFormProps.preferences,
    title: adminFormProps.title,
  },
  emits: ['created'],
  setup(props: ApplicationCreateProps, {emit, slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const placement: ComputedRef<ProjectPlacement> = useProjectPlacement(() => props.ouId);
    const canPlace: ComputedRef<boolean> = computed(() => Boolean(placement.value.ouId ?? placement.value.projectId));
    const endpoint: ManagementEndpoint = useManagementEndpoint('applications');
    const created: Ref<{application: Application; secret: string} | null> = ref(null);
    const formKey: Ref<number> = ref(0);
    const creation: ResourceMutationResult<Application, CreateApplicationRequest> = useResourceMutation(
      (payload: CreateApplicationRequest, fetcher) => createApplication({...endpoint, fetcher, payload}),
      () => [[ApplicationQueryKeys.APPLICATIONS]],
      {
        onSuccess: (application: Application): void => {
          const secret: string | undefined = getApplicationClientSecret(application);

          if (secret) {
            created.value = {application, secret};
          } else {
            emit('created', application);
          }
        },
      },
    );

    const handleSubmit = (submission: ApplicationCreateSubmission): void => {
      if (canPlace.value) {
        // A project placement sends `projectId` alone: the server derives the organization unit from it.
        void creation.mutate({
          ...toCreateApplicationRequest(submission, placement.value.ouId ?? ''),
          ouId: placement.value.ouId,
          projectId: placement.value.projectId,
        });
      }
    };

    const handleSecretDismiss = (): void => {
      if (created.value) {
        const {application} = created.value;
        created.value = null;
        formKey.value += 1;
        emit('created', application);
      }
    };

    return (): VNode =>
      h(
        BaseApplicationCreate,
        {
          className: props.className,
          clientSecret: created.value?.secret ?? null,
          description: props.description,
          error: canPlace.value
            ? toManagementErrorMessage(t, creation.error.value, 'admin.applications.create.error')
            : t('admin.common.errors.no_ou'),
          isSubmitting: creation.isLoading.value,
          key: formKey.value,
          onCancel: props.onCancel,
          onSecretDismiss: handleSecretDismiss,
          onSubmit: handleSubmit,
          preferences: props.preferences,
          title: props.title,
        },
        {...slots},
      );
  },
});

export default ApplicationCreate;
