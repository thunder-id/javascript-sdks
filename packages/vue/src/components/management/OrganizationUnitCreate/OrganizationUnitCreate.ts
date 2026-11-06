// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  ORGANIZATION_UNIT_ERROR_KEYS,
  OrganizationUnitQueryKeys,
  createOrganizationUnit,
  getOrganizationUnits,
  toManagementErrorMessage,
} from '@thunderid/browser';
import type {
  CreateOrganizationUnitRequest,
  OrganizationUnit,
  OrganizationUnitBasic,
  OrganizationUnitListResponse,
} from '@thunderid/browser';
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
  watch,
} from 'vue';
import BaseOrganizationUnitCreate, {type OrganizationUnitCreateSubmission} from './BaseOrganizationUnitCreate';
import useManagementEndpoint, {type ManagementEndpoint} from '../../../composables/management/useManagementEndpoint';
import useResourceMutation, {type ResourceMutationResult} from '../../../composables/management/useResourceMutation';
import useResourceQuery, {type ResourceQueryResult} from '../../../composables/management/useResourceQuery';
import {type AdminFormProps, adminFormProps} from '../shared/adminFormProps';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

const PARENT_PAGE_SIZE = 100;

type OrganizationUnitCreateProps = Omit<AdminFormProps, 'error' | 'isSubmitting'> &
  Readonly<{
    parentId: string | undefined;
  }>;

/**
 * Creates an organization unit through the management API. Without `parentId`, it offers the root
 * units as parents; pass `parentId` to create a unit deeper in the tree. Emits `created` with the created unit.
 *
 * @example
 * ```vue
 * <OrganizationUnitCreate :parent-id="unitId" @created="(unit) => router.push(`/units/${unit.id}`)" />
 * ```
 */
const OrganizationUnitCreate: Component = defineComponent({
  name: 'OrganizationUnitCreate',
  props: {
    className: adminFormProps.className,
    description: adminFormProps.description,
    onCancel: adminFormProps.onCancel,
    /** The parent of the new unit. When set, the parent picker is hidden. */
    parentId: {default: undefined, type: String},
    preferences: adminFormProps.preferences,
    title: adminFormProps.title,
  },
  emits: ['created'],
  setup(props: OrganizationUnitCreateProps, {emit, slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const endpoint: ManagementEndpoint = useManagementEndpoint('organizationUnits');
    const parentOffset: Ref<number> = ref(0);
    const parentPages: Ref<Record<number, OrganizationUnitBasic[]>> = ref({});
    const parents: ResourceQueryResult<OrganizationUnitListResponse> = useResourceQuery(
      () => [OrganizationUnitQueryKeys.ORGANIZATION_UNITS, {limit: PARENT_PAGE_SIZE, offset: parentOffset.value}],
      (fetcher) => getOrganizationUnits({...endpoint, fetcher, limit: PARENT_PAGE_SIZE, offset: parentOffset.value}),
      {enabled: (): boolean => props.parentId === undefined},
    );
    const creation: ResourceMutationResult<OrganizationUnit, CreateOrganizationUnitRequest> = useResourceMutation(
      (payload: CreateOrganizationUnitRequest, fetcher) => createOrganizationUnit({...endpoint, fetcher, payload}),
      () => [[OrganizationUnitQueryKeys.ORGANIZATION_UNITS], [OrganizationUnitQueryKeys.ORGANIZATION_UNIT_CHILDREN]],
      {onSuccess: (created: OrganizationUnit): void => emit('created', created)},
    );

    watch(parents.data, (data: OrganizationUnitListResponse | undefined) => {
      if (data) {
        parentPages.value = {...parentPages.value, [parentOffset.value]: data.organizationUnits ?? []};
      }
    });

    const loadedParents: ComputedRef<OrganizationUnitBasic[]> = computed(() =>
      Object.keys(parentPages.value)
        .map(Number)
        .sort((a: number, b: number) => a - b)
        .flatMap((offset: number) => parentPages.value[offset] ?? []),
    );

    const handleSubmit = ({description, handle, name, parentId}: OrganizationUnitCreateSubmission): void => {
      void creation.mutate({description, handle, name, parent: parentId});
    };

    return (): VNode => {
      const totalParents: number = parents.data.value?.totalResults ?? loadedParents.value.length;

      return h(
        BaseOrganizationUnitCreate,
        {
          className: props.className,
          description: props.description,
          error:
            toManagementErrorMessage(
              t,
              creation.error.value,
              'admin.organization_units.create.error',
              ORGANIZATION_UNIT_ERROR_KEYS,
            ) ?? toManagementErrorMessage(t, parents.error.value, 'admin.organization_units.list.error'),
          isLoadingParents: parents.isLoading.value,
          isSubmitting: creation.isLoading.value,
          onCancel: props.onCancel,
          onLoadMoreParents:
            !parents.isLoading.value && loadedParents.value.length < totalParents
              ? (): void => {
                  parentOffset.value = loadedParents.value.length;
                }
              : undefined,
          onSubmit: handleSubmit,
          parentId: props.parentId,
          parentOptions:
            props.parentId === undefined
              ? loadedParents.value.map((unit: OrganizationUnitBasic) => ({label: unit.name, value: unit.id}))
              : undefined,
          preferences: props.preferences,
          title: props.title,
        },
        {...slots},
      );
    };
  },
});

export default OrganizationUnitCreate;
