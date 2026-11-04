// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  ORGANIZATION_UNIT_ERROR_KEYS,
  OrganizationUnit,
  OrganizationUnitGroupListResponse,
  OrganizationUnitListResponse,
  OrganizationUnitQueryKeys,
  OrganizationUnitRoleListResponse,
  OrganizationUnitUserListResponse,
  UpdateOrganizationUnitRequest,
  deleteOrganizationUnit,
  getOrganizationUnit,
  getOrganizationUnitChildren,
  getOrganizationUnitGroups,
  getOrganizationUnitRoles,
  getOrganizationUnitUsers,
  toManagementErrorMessage,
  updateOrganizationUnit,
} from '@thunderid/browser';
import {FC, ReactElement} from 'react';
import BaseOrganizationUnitDetails, {
  BaseOrganizationUnitDetailsProps,
  OrganizationUnitUpdateSubmission,
} from './BaseOrganizationUnitDetails';
import useManagementEndpoint, {ManagementEndpoint} from '../../../hooks/management/useManagementEndpoint';
import useResourceMutation, {ResourceMutationResult} from '../../../hooks/management/useResourceMutation';
import useResourceQuery, {ResourceQueryResult} from '../../../hooks/management/useResourceQuery';
import useTranslation from '../../../hooks/useTranslation';

export type OrganizationUnitDetailsProps = Omit<
  BaseOrganizationUnitDetailsProps,
  | 'contents'
  | 'contentsError'
  | 'error'
  | 'isDeleting'
  | 'isLoading'
  | 'isLoadingContents'
  | 'isUpdating'
  | 'onDelete'
  | 'onUpdate'
  | 'organizationUnit'
  | 'parent'
> & {
  /**
   * Whether the unit can be deleted from this view. The server refuses deleting a unit that still
   * holds child units or resources; the refusal is shown as a translated message.
   * @default false
   */
  deletable?: boolean;
  /**
   * Whether the name, handle and description can be edited from this view.
   * @default false
   */
  editable?: boolean;
  /**
   * How many child units, users, groups and roles to list.
   * @default 20
   */
  limit?: number;
  /**
   * Called after the unit has been deleted.
   */
  onDeleted?: () => void;
  /**
   * Called with the unit as the server stored it after an edit.
   */
  onUpdated?: (organizationUnit: OrganizationUnit) => void;
  organizationUnitId: string;
};

/**
 * Shows an organization unit with its child units and the users, groups and roles in it (read only),
 * and lets the signed-in user edit and delete it.
 *
 * @example
 * ```tsx
 * <OrganizationUnitDetails organizationUnitId={unitId} editable deletable onDeleted={() => navigate('/units')} />
 * ```
 */
const OrganizationUnitDetails: FC<OrganizationUnitDetailsProps> = ({
  deletable = false,
  editable = false,
  limit = 20,
  onDeleted,
  onUpdated,
  organizationUnitId,
  preferences,
  ...rest
}: OrganizationUnitDetailsProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const endpoint: ManagementEndpoint = useManagementEndpoint('organizationUnits');
  const enabled = Boolean(organizationUnitId);
  const ouId: string = organizationUnitId;
  const unit: ResourceQueryResult<OrganizationUnit> = useResourceQuery(
    [OrganizationUnitQueryKeys.ORGANIZATION_UNIT, ouId],
    (fetcher) => getOrganizationUnit({...endpoint, fetcher, ouId}),
    {enabled},
  );
  const parentId: string | undefined = unit.data?.parent ?? undefined;
  const parent: ResourceQueryResult<OrganizationUnit> = useResourceQuery(
    [OrganizationUnitQueryKeys.ORGANIZATION_UNIT, parentId],
    (fetcher) => getOrganizationUnit({...endpoint, fetcher, ouId: parentId ?? ''}),
    {enabled: Boolean(parentId)},
  );
  const childUnits: ResourceQueryResult<OrganizationUnitListResponse> = useResourceQuery(
    [OrganizationUnitQueryKeys.ORGANIZATION_UNIT_CHILDREN, ouId, {limit, offset: 0}],
    (fetcher) => getOrganizationUnitChildren({...endpoint, fetcher, limit, offset: 0, ouId}),
    {enabled},
  );
  const users: ResourceQueryResult<OrganizationUnitUserListResponse> = useResourceQuery(
    [OrganizationUnitQueryKeys.ORGANIZATION_UNIT_USERS, ouId, {limit}],
    (fetcher) => getOrganizationUnitUsers({...endpoint, fetcher, limit, offset: 0, ouId}),
    {enabled},
  );
  const groups: ResourceQueryResult<OrganizationUnitGroupListResponse> = useResourceQuery(
    [OrganizationUnitQueryKeys.ORGANIZATION_UNIT_GROUPS, ouId, {limit}],
    (fetcher) => getOrganizationUnitGroups({...endpoint, fetcher, limit, offset: 0, ouId}),
    {enabled},
  );
  const roles: ResourceQueryResult<OrganizationUnitRoleListResponse> = useResourceQuery(
    [OrganizationUnitQueryKeys.ORGANIZATION_UNIT_ROLES, ouId, {limit}],
    (fetcher) => getOrganizationUnitRoles({...endpoint, fetcher, limit, offset: 0, ouId}),
    {enabled},
  );
  const update: ResourceMutationResult<OrganizationUnit, UpdateOrganizationUnitRequest> = useResourceMutation(
    (payload: UpdateOrganizationUnitRequest, fetcher) => updateOrganizationUnit({...endpoint, fetcher, ouId, payload}),
    () => [
      [OrganizationUnitQueryKeys.ORGANIZATION_UNIT, ouId],
      [OrganizationUnitQueryKeys.ORGANIZATION_UNITS],
      [OrganizationUnitQueryKeys.ORGANIZATION_UNIT_CHILDREN],
    ],
    {onSuccess: onUpdated},
  );
  const deletion: ResourceMutationResult<void, string> = useResourceMutation(
    (id: string, fetcher) => deleteOrganizationUnit({...endpoint, fetcher, ouId: id}),
    () => [[OrganizationUnitQueryKeys.ORGANIZATION_UNITS], [OrganizationUnitQueryKeys.ORGANIZATION_UNIT_CHILDREN]],
    {onSuccess: onDeleted},
  );

  const handleUpdate = (changes: OrganizationUnitUpdateSubmission): void => {
    const current: OrganizationUnit | undefined = unit.data;

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

  const contentsError: Error | null = childUnits.error ?? users.error ?? groups.error ?? roles.error;

  return (
    <BaseOrganizationUnitDetails
      organizationUnit={unit.data}
      parent={parent.data}
      isLoading={unit.isLoading}
      error={
        toManagementErrorMessage(t, unit.error, 'admin.organization_units.details.error') ??
        toManagementErrorMessage(
          t,
          update.error,
          'admin.organization_units.details.edit.error',
          ORGANIZATION_UNIT_ERROR_KEYS,
        ) ??
        toManagementErrorMessage(
          t,
          deletion.error,
          'admin.organization_units.details.delete.error',
          ORGANIZATION_UNIT_ERROR_KEYS,
        )
      }
      contents={{
        childUnits: childUnits.data?.organizationUnits ?? [],
        groups: groups.data?.groups ?? [],
        roles: roles.data?.roles ?? [],
        totals: {
          childUnits: childUnits.data?.totalResults,
          groups: groups.data?.totalResults,
          roles: roles.data?.totalResults,
          users: users.data?.totalResults,
        },
        users: users.data?.users ?? [],
      }}
      contentsError={toManagementErrorMessage(t, contentsError, 'admin.organization_units.details.members_error')}
      isLoadingContents={childUnits.isLoading || users.isLoading || groups.isLoading || roles.isLoading}
      isDeleting={deletion.isLoading}
      isUpdating={update.isLoading}
      onDelete={deletable ? (): void => void deletion.mutate(ouId) : undefined}
      onUpdate={editable ? handleUpdate : undefined}
      preferences={preferences}
      {...rest}
    />
  );
};

export default OrganizationUnitDetails;
