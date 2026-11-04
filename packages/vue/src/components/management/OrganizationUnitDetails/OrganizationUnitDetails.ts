// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  ORGANIZATION_UNIT_ERROR_KEYS,
  OrganizationUnitQueryKeys,
  deleteOrganizationUnit,
  getOrganizationUnit,
  getOrganizationUnitChildren,
  getOrganizationUnitGroups,
  getOrganizationUnitRoles,
  getOrganizationUnitUsers,
  toManagementErrorMessage,
  updateOrganizationUnit,
} from '@thunderid/browser';
import type {
  OrganizationUnit,
  OrganizationUnitBasic,
  OrganizationUnitGroupListResponse,
  OrganizationUnitListResponse,
  OrganizationUnitRoleListResponse,
  OrganizationUnitUserListResponse,
  Preferences,
  UpdateOrganizationUnitRequest,
} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';
import BaseOrganizationUnitDetails, {type OrganizationUnitUpdateSubmission} from './BaseOrganizationUnitDetails';
import useManagementEndpoint, {type ManagementEndpoint} from '../../../composables/management/useManagementEndpoint';
import useResourceMutation, {type ResourceMutationResult} from '../../../composables/management/useResourceMutation';
import useResourceQuery, {type ResourceQueryResult} from '../../../composables/management/useResourceQuery';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

type OrganizationUnitDetailsProps = Readonly<{
  className: string;
  deletable: boolean;
  editable: boolean;
  limit: number;
  onSelectChild: ((organizationUnit: OrganizationUnitBasic) => void) | undefined;
  organizationUnitId: string;
  preferences: Preferences | undefined;
}>;

/**
 * Shows an organization unit with its child units and the users, groups and roles in it (read only),
 * and lets the signed-in user edit and delete it. Emits `updated` with the unit as the server stored it
 * after an edit, and `deleted` after it has been deleted.
 *
 * Slots: `actions`, rendered next to the unit's name; `default`, a scoped slot that replaces the view with custom UI.
 *
 * @example
 * ```vue
 * <OrganizationUnitDetails :organization-unit-id="unitId" editable deletable @deleted="router.push('/units')" />
 * ```
 */
const OrganizationUnitDetails: Component = defineComponent({
  name: 'OrganizationUnitDetails',
  props: {
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /**
     * Whether the unit can be deleted from this view. The server refuses deleting a unit that still holds child
     * units or resources; the refusal is shown as a translated message.
     */
    deletable: {default: false, type: Boolean},
    /** Whether the name, handle and description can be edited from this view. */
    editable: {default: false, type: Boolean},
    /** How many child units, users, groups and roles to list. */
    limit: {default: 20, type: Number},
    /** Called when a child unit is chosen. Child units are selectable only when set. Also available as `@select-child`. */
    onSelectChild: {default: undefined, type: Function as PropType<(organizationUnit: OrganizationUnitBasic) => void>},
    /** Identifier of the organization unit to show. */
    organizationUnitId: {required: true, type: String},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
  },
  emits: ['deleted', 'updated'],
  setup(props: OrganizationUnitDetailsProps, {emit, slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const endpoint: ManagementEndpoint = useManagementEndpoint('organizationUnits');
    const enabled = (): boolean => Boolean(props.organizationUnitId);
    const unit: ResourceQueryResult<OrganizationUnit> = useResourceQuery(
      () => [OrganizationUnitQueryKeys.ORGANIZATION_UNIT, props.organizationUnitId],
      (fetcher) => getOrganizationUnit({...endpoint, fetcher, ouId: props.organizationUnitId}),
      {enabled},
    );
    const parentId = (): string | undefined => unit.data.value?.parent ?? undefined;
    const parent: ResourceQueryResult<OrganizationUnit> = useResourceQuery(
      () => [OrganizationUnitQueryKeys.ORGANIZATION_UNIT, parentId()],
      (fetcher) => getOrganizationUnit({...endpoint, fetcher, ouId: parentId() ?? ''}),
      {enabled: (): boolean => Boolean(parentId())},
    );
    const childUnits: ResourceQueryResult<OrganizationUnitListResponse> = useResourceQuery(
      () => [
        OrganizationUnitQueryKeys.ORGANIZATION_UNIT_CHILDREN,
        props.organizationUnitId,
        {limit: props.limit, offset: 0},
      ],
      (fetcher) =>
        getOrganizationUnitChildren({
          ...endpoint,
          fetcher,
          limit: props.limit,
          offset: 0,
          ouId: props.organizationUnitId,
        }),
      {enabled},
    );
    const users: ResourceQueryResult<OrganizationUnitUserListResponse> = useResourceQuery(
      () => [OrganizationUnitQueryKeys.ORGANIZATION_UNIT_USERS, props.organizationUnitId, {limit: props.limit}],
      (fetcher) =>
        getOrganizationUnitUsers({...endpoint, fetcher, limit: props.limit, offset: 0, ouId: props.organizationUnitId}),
      {enabled},
    );
    const groups: ResourceQueryResult<OrganizationUnitGroupListResponse> = useResourceQuery(
      () => [OrganizationUnitQueryKeys.ORGANIZATION_UNIT_GROUPS, props.organizationUnitId, {limit: props.limit}],
      (fetcher) =>
        getOrganizationUnitGroups({
          ...endpoint,
          fetcher,
          limit: props.limit,
          offset: 0,
          ouId: props.organizationUnitId,
        }),
      {enabled},
    );
    const roles: ResourceQueryResult<OrganizationUnitRoleListResponse> = useResourceQuery(
      () => [OrganizationUnitQueryKeys.ORGANIZATION_UNIT_ROLES, props.organizationUnitId, {limit: props.limit}],
      (fetcher) =>
        getOrganizationUnitRoles({...endpoint, fetcher, limit: props.limit, offset: 0, ouId: props.organizationUnitId}),
      {enabled},
    );
    const update: ResourceMutationResult<OrganizationUnit, UpdateOrganizationUnitRequest> = useResourceMutation(
      (payload: UpdateOrganizationUnitRequest, fetcher) =>
        updateOrganizationUnit({...endpoint, fetcher, ouId: props.organizationUnitId, payload}),
      () => [
        [OrganizationUnitQueryKeys.ORGANIZATION_UNIT, props.organizationUnitId],
        [OrganizationUnitQueryKeys.ORGANIZATION_UNITS],
        [OrganizationUnitQueryKeys.ORGANIZATION_UNIT_CHILDREN],
      ],
      {onSuccess: (updated: OrganizationUnit): void => emit('updated', updated)},
    );
    const deletion: ResourceMutationResult<void, string> = useResourceMutation(
      (ouId: string, fetcher) => deleteOrganizationUnit({...endpoint, fetcher, ouId}),
      () => [[OrganizationUnitQueryKeys.ORGANIZATION_UNITS], [OrganizationUnitQueryKeys.ORGANIZATION_UNIT_CHILDREN]],
      {onSuccess: (): void => emit('deleted')},
    );

    const handleUpdate = (changes: OrganizationUnitUpdateSubmission): void => {
      const current: OrganizationUnit | undefined = unit.data.value;

      if (!current) {
        return;
      }

      // The update replaces the unit, so the settings this view does not edit are sent back unchanged.
      const {createdAt, id, updatedAt, ...settings}: OrganizationUnit = current;
      void createdAt;
      void id;
      void updatedAt;
      void update.mutate({...settings, ...changes, parent: current.parent ?? null});
    };

    return (): VNode => {
      const contentsError: Error | null =
        childUnits.error.value ?? users.error.value ?? groups.error.value ?? roles.error.value;

      return h(
        BaseOrganizationUnitDetails,
        {
          className: props.className,
          contents: {
            childUnits: childUnits.data.value?.organizationUnits ?? [],
            groups: groups.data.value?.groups ?? [],
            roles: roles.data.value?.roles ?? [],
            totals: {
              childUnits: childUnits.data.value?.totalResults,
              groups: groups.data.value?.totalResults,
              roles: roles.data.value?.totalResults,
              users: users.data.value?.totalResults,
            },
            users: users.data.value?.users ?? [],
          },
          contentsError: toManagementErrorMessage(t, contentsError, 'admin.organization_units.details.members_error'),
          error:
            toManagementErrorMessage(t, unit.error.value, 'admin.organization_units.details.error') ??
            toManagementErrorMessage(
              t,
              update.error.value,
              'admin.organization_units.details.edit.error',
              ORGANIZATION_UNIT_ERROR_KEYS,
            ) ??
            toManagementErrorMessage(
              t,
              deletion.error.value,
              'admin.organization_units.details.delete.error',
              ORGANIZATION_UNIT_ERROR_KEYS,
            ),
          isDeleting: deletion.isLoading.value,
          isLoading: unit.isLoading.value,
          isLoadingContents:
            childUnits.isLoading.value || users.isLoading.value || groups.isLoading.value || roles.isLoading.value,
          isUpdating: update.isLoading.value,
          onDelete: props.deletable ? (): void => void deletion.mutate(props.organizationUnitId) : undefined,
          onSelectChild: props.onSelectChild,
          onUpdate: props.editable ? handleUpdate : undefined,
          organizationUnit: unit.data.value,
          parent: parent.data.value,
          preferences: props.preferences,
        },
        {...slots},
      );
    };
  },
});

export default OrganizationUnitDetails;
