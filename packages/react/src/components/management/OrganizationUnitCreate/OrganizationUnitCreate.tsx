// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  CreateOrganizationUnitRequest,
  ORGANIZATION_UNIT_ERROR_KEYS,
  OrganizationUnit,
  OrganizationUnitBasic,
  OrganizationUnitListResponse,
  OrganizationUnitQueryKeys,
  SelectOption,
  createOrganizationUnit,
  getOrganizationUnits,
  toManagementErrorMessage,
} from '@thunderid/browser';
import {FC, ReactElement, useMemo, useState} from 'react';
import BaseOrganizationUnitCreate, {
  BaseOrganizationUnitCreateProps,
  OrganizationUnitCreateSubmission,
} from './BaseOrganizationUnitCreate';
import useManagementEndpoint, {ManagementEndpoint} from '../../../hooks/management/useManagementEndpoint';
import useResourceMutation, {ResourceMutationResult} from '../../../hooks/management/useResourceMutation';
import useResourceQuery, {ResourceQueryResult} from '../../../hooks/management/useResourceQuery';
import useTranslation from '../../../hooks/useTranslation';

const PARENT_PAGE_SIZE = 100;

export type OrganizationUnitCreateProps = Omit<
  BaseOrganizationUnitCreateProps,
  'error' | 'isLoadingParents' | 'isSubmitting' | 'onLoadMoreParents' | 'onSubmit' | 'parentOptions'
> & {
  /**
   * Called with the created organization unit.
   */
  onCreated?: (organizationUnit: OrganizationUnit) => void;
};

/**
 * Creates an organization unit through the management API. Without `parentId`, it offers the root
 * units as parents; pass `parentId` to create a unit deeper in the tree.
 *
 * @example
 * ```tsx
 * <OrganizationUnitCreate parentId={unitId} onCreated={(unit) => navigate(`/units/${unit.id}`)} />
 * ```
 */
const OrganizationUnitCreate: FC<OrganizationUnitCreateProps> = ({
  onCreated,
  parentId,
  preferences,
  ...rest
}: OrganizationUnitCreateProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const endpoint: ManagementEndpoint = useManagementEndpoint('organizationUnits');
  const [parentOffset, setParentOffset] = useState<number>(0);
  const [parentPages, setParentPages] = useState<Record<number, OrganizationUnitBasic[]>>({});
  const parents: ResourceQueryResult<OrganizationUnitListResponse> = useResourceQuery(
    [OrganizationUnitQueryKeys.ORGANIZATION_UNITS, {limit: PARENT_PAGE_SIZE, offset: parentOffset}],
    (fetcher) => getOrganizationUnits({...endpoint, fetcher, limit: PARENT_PAGE_SIZE, offset: parentOffset}),
    {enabled: parentId === undefined},
  );
  const creation: ResourceMutationResult<OrganizationUnit, CreateOrganizationUnitRequest> = useResourceMutation(
    (payload: CreateOrganizationUnitRequest, fetcher) => createOrganizationUnit({...endpoint, fetcher, payload}),
    () => [[OrganizationUnitQueryKeys.ORGANIZATION_UNITS], [OrganizationUnitQueryKeys.ORGANIZATION_UNIT_CHILDREN]],
    {onSuccess: onCreated},
  );

  const [mergedParents, setMergedParents] = useState<OrganizationUnitListResponse | undefined>(undefined);

  // Each page of parents is kept as it arrives, so loading more appends to the options already listed.
  if (parents.data && parents.data !== mergedParents) {
    const page: OrganizationUnitListResponse = parents.data;

    setMergedParents(page);
    setParentPages((previous: Record<number, OrganizationUnitBasic[]>) => ({
      ...previous,
      [parentOffset]: page.organizationUnits ?? [],
    }));
  }

  const loadedParents: OrganizationUnitBasic[] = useMemo(
    () =>
      Object.keys(parentPages)
        .map(Number)
        .sort((a: number, b: number) => a - b)
        .flatMap((offset: number) => parentPages[offset] ?? []),
    [parentPages],
  );
  const parentOptions: SelectOption[] = loadedParents.map((unit: OrganizationUnitBasic) => ({
    label: unit.name,
    value: unit.id,
  }));
  const totalParents: number = parents.data?.totalResults ?? loadedParents.length;

  const handleSubmit = ({description, handle, name, parentId: parent}: OrganizationUnitCreateSubmission): void => {
    void creation.mutate({description, handle, name, parent});
  };

  return (
    <BaseOrganizationUnitCreate
      onSubmit={handleSubmit}
      isSubmitting={creation.isLoading}
      error={
        toManagementErrorMessage(
          t,
          creation.error,
          'admin.organization_units.create.error',
          ORGANIZATION_UNIT_ERROR_KEYS,
        ) ?? toManagementErrorMessage(t, parents.error, 'admin.organization_units.list.error')
      }
      parentId={parentId}
      parentOptions={parentId === undefined ? parentOptions : undefined}
      isLoadingParents={parents.isLoading}
      onLoadMoreParents={
        !parents.isLoading && loadedParents.length < totalParents
          ? (): void => setParentOffset(loadedParents.length)
          : undefined
      }
      preferences={preferences}
      {...rest}
    />
  );
};

export default OrganizationUnitCreate;
