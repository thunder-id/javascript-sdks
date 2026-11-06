// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  SHARING_POLICY_ERROR_KEYS,
  SHARING_RESOURCE_COLLECTIONS,
  SharingPolicyQueryKeys,
  getSharingPolicyOperations,
  toManagementErrorMessage,
} from '@thunderid/browser';
import type {
  Preferences,
  ResolvedOverlay,
  SharingPolicy,
  SharingPolicyListResponse,
  SharingPolicyOperations,
  SharingPolicyRequest,
  SharingPolicyUpdateRequest,
  SharingResourceType,
} from '@thunderid/browser';
import {type Component, type PropType, type Ref, type SetupContext, type VNode, defineComponent, h, ref} from 'vue';
import BaseSharingPolicies from './BaseSharingPolicies';
import useManagementEndpoint from '../../../composables/management/useManagementEndpoint';
import useResourceMutation, {type ResourceMutationResult} from '../../../composables/management/useResourceMutation';
import useResourceQuery, {type ResourceQueryResult} from '../../../composables/management/useResourceQuery';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

type PolicyChange =
  | {kind: 'create'; request: SharingPolicyRequest}
  | {kind: 'delete'; policy: SharingPolicy}
  | {kind: 'update'; policy: SharingPolicy; request: SharingPolicyUpdateRequest};

type SharingPoliciesProps = Readonly<{
  className: string;
  description: string | undefined;
  editable: boolean;
  limit: number;
  ouId: string | undefined;
  preferences: Preferences | undefined;
  resourceId: string;
  resourceType: SharingResourceType;
  title: string | undefined;
}>;

/**
 * Lists the sharing policies of a user, an application, a role or a flow, and lets the signed-in user
 * add, edit and delete them when `editable`. With `ouId`, also shows the overlay rules the policies
 * resolve to in that organization unit. `UserDetails`, `ApplicationDetails` and `RoleDetails` do not
 * embed it: place it where the app needs it.
 *
 * Slots: `actions`, rendered next to the title; `default`, a scoped slot that replaces the view with custom UI and
 * receives `BaseSharingPoliciesRenderProps`.
 *
 * @example
 * ```vue
 * <SharingPolicies resource-type="role" :resource-id="roleId" editable />
 * ```
 */
const SharingPolicies: Component = defineComponent({
  name: 'SharingPolicies',
  props: {
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** Text shown under the title. */
    description: {default: undefined, type: String},
    /** Whether policies can be added, edited and deleted from this view. Deleting asks for confirmation. */
    editable: {default: false, type: Boolean},
    /** Page size. */
    limit: {default: 20, type: Number},
    /** Shows the overlay rules that apply to the resource in this organization unit, read only. */
    ouId: {default: undefined, type: String},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    /** Identifier of the user, application, role or flow. */
    resourceId: {required: true, type: String},
    /** The kind of resource whose sharing policies are shown. */
    resourceType: {required: true, type: String as PropType<SharingResourceType>},
    /** Heading of the view. Pass an empty string to hide it. */
    title: {default: undefined, type: String},
  },
  setup(props: SharingPoliciesProps, {slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const offset: Ref<number> = ref(0);
    const lastChange: Ref<PolicyChange['kind']> = ref('create');
    const endpoint = useManagementEndpoint(SHARING_RESOURCE_COLLECTIONS[props.resourceType]);
    const operations = (): SharingPolicyOperations => getSharingPolicyOperations(props.resourceType);
    const policies: ResourceQueryResult<SharingPolicyListResponse> = useResourceQuery(
      () => [
        SharingPolicyQueryKeys.SHARING_POLICIES,
        props.resourceType,
        props.resourceId,
        {limit: props.limit, offset: offset.value},
      ],
      (fetcher) =>
        operations().list({
          ...endpoint,
          fetcher,
          limit: props.limit,
          offset: offset.value,
          resourceId: props.resourceId,
        }),
      {enabled: (): boolean => Boolean(props.resourceId)},
    );
    const overlay: ResourceQueryResult<ResolvedOverlay> = useResourceQuery(
      () => [SharingPolicyQueryKeys.OVERLAY_RULES, props.resourceType, props.resourceId, props.ouId],
      (fetcher) =>
        operations().getOverlayRules({...endpoint, fetcher, ouId: props.ouId ?? '', resourceId: props.resourceId}),
      {enabled: (): boolean => Boolean(props.resourceId && props.ouId)},
    );
    const change: ResourceMutationResult<SharingPolicy | undefined, PolicyChange> = useResourceMutation(
      async (variables: PolicyChange, fetcher): Promise<SharingPolicy | undefined> => {
        const resourceId: string = props.resourceId;

        if (variables.kind === 'create') {
          return operations().create({...endpoint, fetcher, payload: variables.request, resourceId});
        }

        if (variables.kind === 'update') {
          return operations().update({
            ...endpoint,
            fetcher,
            payload: variables.request,
            policyId: variables.policy.id ?? '',
            resourceId,
          });
        }

        await operations().delete({...endpoint, fetcher, policyId: variables.policy.id ?? '', resourceId});

        return undefined;
      },
      () => [
        [SharingPolicyQueryKeys.SHARING_POLICIES, props.resourceType, props.resourceId],
        [SharingPolicyQueryKeys.OVERLAY_RULES, props.resourceType, props.resourceId],
      ],
    );

    const run = (variables: PolicyChange): void => {
      lastChange.value = variables.kind;
      void change.mutate(variables);
    };

    return (): VNode =>
      h(
        BaseSharingPolicies,
        {
          className: props.className,
          description: props.description,
          error: toManagementErrorMessage(t, policies.error.value, 'admin.sharing.error'),
          isLoading: policies.isLoading.value,
          isLoadingOverlay: Boolean(props.ouId) && overlay.isLoading.value,
          isSubmitting: change.isLoading.value,
          limit: props.limit,
          mutationError: toManagementErrorMessage(
            t,
            change.error.value,
            lastChange.value === 'delete' ? 'admin.sharing.errors.delete' : 'admin.sharing.errors.save',
            SHARING_POLICY_ERROR_KEYS,
          ),
          offset: offset.value,
          onCreate: props.editable
            ? (request: SharingPolicyRequest): void => run({kind: 'create', request})
            : undefined,
          onDelete: props.editable ? (policy: SharingPolicy): void => run({kind: 'delete', policy}) : undefined,
          onPageChange: (next: number): void => {
            offset.value = next;
          },
          onUpdate: props.editable
            ? (policy: SharingPolicy, request: SharingPolicyUpdateRequest): void =>
                run({kind: 'update', policy, request})
            : undefined,
          overlay: overlay.data.value,
          overlayError: toManagementErrorMessage(t, overlay.error.value, 'admin.sharing.overlay.error'),
          overlayOuId: props.ouId,
          policies: policies.data.value?.policies ?? [],
          preferences: props.preferences,
          title: props.title,
          totalResults: policies.data.value?.totalResults,
        },
        {...slots},
      );
  },
});

export default SharingPolicies;
