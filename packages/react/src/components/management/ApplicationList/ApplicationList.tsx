// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  ApplicationListResponse,
  ApplicationQueryKeys,
  getApplications,
  toManagementErrorMessage,
} from '@thunderid/browser';
import {FC, ReactElement, useState} from 'react';
import BaseApplicationList, {BaseApplicationListProps} from './BaseApplicationList';
import useThunderID from '../../../contexts/ThunderID/useThunderID';
import useManagementEndpoint, {ManagementEndpoint} from '../../../hooks/management/useManagementEndpoint';
import useResourceQuery, {ResourceQueryResult} from '../../../hooks/management/useResourceQuery';
import useTranslation from '../../../hooks/useTranslation';

export type ApplicationListProps = Omit<
  BaseApplicationListProps,
  'applications' | 'error' | 'isLoading' | 'offset' | 'onPageChange' | 'totalResults'
> & {
  /**
   * Lists the applications this project's root organization unit owns, followed by the ones is shared into it.
   * Defaults to the current project (see `ProjectSwitcher`) when one is chosen.
   */
  projectId?: string;
};

/**
 * Lists the applications the signed-in user is allowed to see, a page at a time.
 *
 * The server guards applications with the root `system` permission, for reading and for changes alike;
 * it defines no application-specific permission. Gate the view and its actions on it with
 * `useGrantedPermissions().can('system')`.
 *
 * @example
 * ```tsx
 * <ApplicationList onSelect={(application) => setSelectedApplicationId(application.id)} />
 * ```
 */
const ApplicationList: FC<ApplicationListProps> = ({
  limit = 20,
  preferences,
  projectId,
  ...rest
}: ApplicationListProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const [offset, setOffset] = useState<number>(0);
  const {currentProject} = useThunderID();
  const resolvedProjectId: string | undefined = projectId ?? currentProject?.id;
  const endpoint: ManagementEndpoint = useManagementEndpoint('applications');
  const {data, error, isLoading}: ResourceQueryResult<ApplicationListResponse> = useResourceQuery(
    [ApplicationQueryKeys.APPLICATIONS, {limit, offset, projectId: resolvedProjectId}],
    (fetcher) => getApplications({...endpoint, fetcher, limit, offset, projectId: resolvedProjectId}),
  );

  return (
    <BaseApplicationList
      applications={data?.applications ?? []}
      totalResults={data?.totalResults}
      isLoading={isLoading}
      error={toManagementErrorMessage(t, error, 'admin.applications.list.error')}
      limit={limit}
      offset={offset}
      onPageChange={setOffset}
      preferences={preferences}
      {...rest}
    />
  );
};

export default ApplicationList;
