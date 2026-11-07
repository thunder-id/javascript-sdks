// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  FlowQueryKeys,
  ManagedFlow,
  ManagedFlowListResponse,
  getFlows,
  toManagementErrorMessage,
} from '@thunderid/browser';
import {FC, ReactElement, useMemo, useState} from 'react';
import BaseSharedFlowList, {BaseSharedFlowListProps} from './BaseSharedFlowList';
import useManagementEndpoint, {ManagementEndpoint} from '../../../hooks/management/useManagementEndpoint';
import useResourceQuery, {ResourceQueryResult} from '../../../hooks/management/useResourceQuery';
import useTranslation from '../../../hooks/useTranslation';

export type SharedFlowListProps = Omit<
  BaseSharedFlowListProps,
  'error' | 'flows' | 'isLoading' | 'offset' | 'onPageChange' | 'totalResults'
> & {
  /**
   * Restricts the list to one flow type, for example `AUTHENTICATION`.
   */
  flowType?: string;
  /**
   * The organization unit to list the flows of: the ones it owns and the ones shared with it.
   */
  ouId: string;
  /**
   * Which of those flows to list: the ones shared with the unit, the ones it owns, or both. The server reports
   * the ownership of each flow, and the list narrows to it, so a narrowed list reads the first page of at most
   * 100 flows and pages through the matches.
   * @default 'shared'
   */
  ownership?: 'all' | 'owned' | 'shared';
};

const MAX_FETCH = 100;

/**
 * Lists the flows shared with an organization unit, or the ones it owns, or both, a page at a time. Choosing a flow reports it
 * through `onSelect`, so the application decides what to open, for example `FlowVariablesForm` for that flow.
 *
 * @example
 * ```tsx
 * <SharedFlowList ouId={ouId} onSelect={(flow) => setSelectedFlowId(flow.id)} />
 * {selectedFlowId && <FlowVariablesForm flowId={selectedFlowId} ouId={ouId} />}
 * ```
 */
const SharedFlowList: FC<SharedFlowListProps> = ({
  flowType,
  limit = 20,
  ouId,
  ownership = 'shared',
  preferences,
  ...rest
}: SharedFlowListProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const [offset, setOffset] = useState<number>(0);
  const endpoint: ManagementEndpoint = useManagementEndpoint('flows');
  const narrowed: boolean = ownership !== 'all';
  const {data, error, isLoading}: ResourceQueryResult<ManagedFlowListResponse> = useResourceQuery(
    [FlowQueryKeys.FLOWS, narrowed ? {flowType, ouId, ownership} : {flowType, limit, offset, ouId}],
    (fetcher) =>
      getFlows({
        ...endpoint,
        fetcher,
        flowType,
        ouId,
        ...(narrowed ? {limit: MAX_FETCH, offset: 0} : {limit, offset}),
      }),
  );
  const matching: ManagedFlow[] = useMemo(
    () =>
      (data?.flows ?? []).filter(
        (flow: ManagedFlow) => ownership === 'all' || flow.isOwnedByOU === (ownership === 'owned'),
      ),
    [data, ownership],
  );

  return (
    <BaseSharedFlowList
      flows={narrowed ? matching.slice(offset, offset + limit) : matching}
      totalResults={narrowed ? matching.length : data?.totalResults}
      isLoading={isLoading}
      error={toManagementErrorMessage(t, error, 'admin.flows.list.error')}
      limit={limit}
      offset={offset}
      onPageChange={setOffset}
      preferences={preferences}
      {...rest}
    />
  );
};

export default SharedFlowList;
