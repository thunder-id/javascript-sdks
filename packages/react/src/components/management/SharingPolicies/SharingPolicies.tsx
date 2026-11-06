// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  ResolvedOverlay,
  SHARING_POLICY_ERROR_KEYS,
  SHARING_RESOURCE_COLLECTIONS,
  SharingPolicy,
  SharingPolicyListResponse,
  SharingPolicyOperations,
  SharingPolicyQueryKeys,
  SharingPolicyRequest,
  SharingPolicyUpdateRequest,
  SharingResourceType,
  getSharingPolicyOperations,
  toManagementErrorMessage,
} from '@thunderid/browser';
import {FC, ReactElement, useState} from 'react';
import BaseSharingPolicies, {BaseSharingPoliciesProps} from './BaseSharingPolicies';
import useManagementEndpoint, {ManagementEndpoint} from '../../../hooks/management/useManagementEndpoint';
import useResourceMutation, {ResourceMutationResult} from '../../../hooks/management/useResourceMutation';
import useResourceQuery, {ResourceQueryResult} from '../../../hooks/management/useResourceQuery';
import useTranslation from '../../../hooks/useTranslation';

type PolicyChange =
  | {kind: 'create'; request: SharingPolicyRequest}
  | {kind: 'delete'; policy: SharingPolicy}
  | {kind: 'update'; policy: SharingPolicy; request: SharingPolicyUpdateRequest};

export type SharingPoliciesProps = Omit<
  BaseSharingPoliciesProps,
  | 'error'
  | 'isLoading'
  | 'isLoadingOverlay'
  | 'isSubmitting'
  | 'mutationError'
  | 'offset'
  | 'onCreate'
  | 'onDelete'
  | 'onPageChange'
  | 'onUpdate'
  | 'overlay'
  | 'overlayError'
  | 'overlayOuId'
  | 'policies'
  | 'totalResults'
> & {
  /**
   * Whether policies can be added, edited and deleted from this view. Deleting asks for confirmation.
   * @default false
   */
  editable?: boolean;
  /**
   * Shows the overlay rules that apply to the resource in this organization unit, read only.
   */
  ouId?: string;
  /**
   * Identifier of the user, application, role or flow.
   */
  resourceId: string;
  /**
   * The kind of resource whose sharing policies are shown.
   */
  resourceType: SharingResourceType;
};

/**
 * Lists the sharing policies of a user, an application, a role or a flow, and lets the signed-in user
 * add, edit and delete them when `editable`. With `ouId`, also shows the overlay rules the policies
 * resolve to in that organization unit. `UserDetails`, `ApplicationDetails` and `RoleDetails` do not
 * embed it: place it where the app needs it.
 *
 * @example
 * ```tsx
 * <SharingPolicies resourceType="role" resourceId={roleId} editable />
 * ```
 */
const SharingPolicies: FC<SharingPoliciesProps> = ({
  editable = false,
  limit = 20,
  ouId,
  preferences,
  resourceId,
  resourceType,
  ...rest
}: SharingPoliciesProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const [offset, setOffset] = useState<number>(0);
  const [lastChange, setLastChange] = useState<PolicyChange['kind']>('create');
  const endpoint: ManagementEndpoint = useManagementEndpoint(SHARING_RESOURCE_COLLECTIONS[resourceType]);
  const operations: SharingPolicyOperations = getSharingPolicyOperations(resourceType);
  const policies: ResourceQueryResult<SharingPolicyListResponse> = useResourceQuery(
    [SharingPolicyQueryKeys.SHARING_POLICIES, resourceType, resourceId, {limit, offset}],
    (fetcher) => operations.list({...endpoint, fetcher, limit, offset, resourceId}),
    {enabled: Boolean(resourceId)},
  );
  const overlay: ResourceQueryResult<ResolvedOverlay> = useResourceQuery(
    [SharingPolicyQueryKeys.OVERLAY_RULES, resourceType, resourceId, ouId],
    (fetcher) => operations.getOverlayRules({...endpoint, fetcher, ouId: ouId ?? '', resourceId}),
    {enabled: Boolean(resourceId && ouId)},
  );
  const change: ResourceMutationResult<SharingPolicy | undefined, PolicyChange> = useResourceMutation(
    async (variables: PolicyChange, fetcher): Promise<SharingPolicy | undefined> => {
      if (variables.kind === 'create') {
        return operations.create({...endpoint, fetcher, payload: variables.request, resourceId});
      }

      if (variables.kind === 'update') {
        return operations.update({
          ...endpoint,
          fetcher,
          payload: variables.request,
          policyId: variables.policy.id ?? '',
          resourceId,
        });
      }

      await operations.delete({...endpoint, fetcher, policyId: variables.policy.id ?? '', resourceId});

      return undefined;
    },
    () => [
      [SharingPolicyQueryKeys.SHARING_POLICIES, resourceType, resourceId],
      [SharingPolicyQueryKeys.OVERLAY_RULES, resourceType, resourceId],
    ],
  );

  const run = (variables: PolicyChange): void => {
    setLastChange(variables.kind);
    void change.mutate(variables);
  };

  return (
    <BaseSharingPolicies
      policies={policies.data?.policies ?? []}
      totalResults={policies.data?.totalResults}
      isLoading={policies.isLoading}
      error={toManagementErrorMessage(t, policies.error, 'admin.sharing.error')}
      mutationError={toManagementErrorMessage(
        t,
        change.error,
        lastChange === 'delete' ? 'admin.sharing.errors.delete' : 'admin.sharing.errors.save',
        SHARING_POLICY_ERROR_KEYS,
      )}
      isSubmitting={change.isLoading}
      limit={limit}
      offset={offset}
      onPageChange={setOffset}
      overlay={overlay.data}
      overlayOuId={ouId}
      isLoadingOverlay={Boolean(ouId) && overlay.isLoading}
      overlayError={toManagementErrorMessage(t, overlay.error, 'admin.sharing.overlay.error')}
      onCreate={editable ? (request: SharingPolicyRequest): void => run({kind: 'create', request}) : undefined}
      onUpdate={
        editable
          ? (policy: SharingPolicy, request: SharingPolicyUpdateRequest): void => run({kind: 'update', policy, request})
          : undefined
      }
      onDelete={editable ? (policy: SharingPolicy): void => run({kind: 'delete', policy}) : undefined}
      preferences={preferences}
      {...rest}
    />
  );
};

export default SharingPolicies;
