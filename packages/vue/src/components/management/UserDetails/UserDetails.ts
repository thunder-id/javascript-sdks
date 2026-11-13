// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AdministrationFlowConfigKey,
  GroupQueryKeys,
  UserQueryKeys,
  deleteUser,
  getUser,
  getUserGroups,
  getUserTypeByHandle,
  resolveAdministrationFlowHandles,
  sendUserAttributeVerification,
  toManagementErrorMessage,
  updateUser,
} from '@thunderid/browser';
import type {
  AdministrationMode,
  ManagedUser,
  ManagedUserTypeDetails,
  MembershipGroupListResponse,
  Preferences,
  SendUserAttributeVerificationResult,
  UpdateManagedUserRequest,
} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h, shallowRef} from 'vue';
import BaseUserDetails from './BaseUserDetails';
import useAccountLifecycle, {type AccountLifecycleState} from '../../../composables/management/useAccountLifecycle';
import useManagementEndpoint, {type ManagementEndpoint} from '../../../composables/management/useManagementEndpoint';
import useResourceMutation, {type ResourceMutationResult} from '../../../composables/management/useResourceMutation';
import useResourceQuery, {type ResourceQueryResult} from '../../../composables/management/useResourceQuery';
import useThunderID from '../../../composables/useThunderID';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

type UserDetailsProps = Readonly<{
  administrationMode: AdministrationMode | undefined;
  attributeVerification: boolean;
  className: string;
  deletable: boolean;
  editable: boolean;
  hiddenAttributes: string[];
  lifecycleActions: boolean;
  preferences: Preferences | undefined;
  userId: string;
}>;

interface UpdateUserVariables {
  data: UpdateManagedUserRequest;
  userId: string;
}

interface VerificationTarget {
  attribute: string;
  userId: string;
  value: unknown;
}

/**
 * Shows a user and the groups they belong to, and optionally lets the signed-in user edit or delete
 * them, run account lifecycle actions or send them a link to verify their email. Emits `deleted` after
 * the user has been deleted.
 *
 * Slots: `actions`, rendered next to the user's name.
 *
 * @example
 * ```vue
 * <UserDetails :user-id="userId" deletable @deleted="router.push('/users')" />
 * ```
 */
const UserDetails: Component = defineComponent({
  name: 'UserDetails',
  props: {
    /**
     * How the delete runs. `flow` runs the user deletion flow the server configures, which revokes the
     * user's grants and ends their sessions before the record goes. It needs `baseUrl`. Defaults to `native`.
     */
    administrationMode: {default: undefined, type: String as PropType<AdministrationMode>},
    /**
     * Whether a verification link can be sent to the user's unverified email from this view. It runs the
     * server's administrator-initiated verification flow, and the user finishes from the link. It needs
     * `baseUrl`, and the action is offered only when the server names that flow under
     * `adminAttributeVerificationFlow` in its `flow` configuration; reading it needs a token that may read
     * the server configuration.
     */
    attributeVerification: {default: false, type: Boolean},
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** Whether the user can be deleted from this view. */
    deletable: {default: false, type: Boolean},
    /** Whether the user's text attributes can be edited from this view. */
    editable: {default: false, type: Boolean},
    /** Attribute names that are never shown, such as credentials. */
    hiddenAttributes: {default: () => ['password'], type: Array as PropType<string[]>},
    /**
     * Whether the user can be suspended, unsuspended and unlocked from this view. Each action runs
     * through its administration flow and is offered only when the server configures that flow. Reading
     * the configured flows needs a token that may read the server configuration.
     */
    lifecycleActions: {default: false, type: Boolean},
    /** Component-level preferences, for example `i18n.bundles` overrides. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    /** Identifier of the user to show. */
    userId: {required: true, type: String},
  },
  emits: ['deleted'],
  setup(props: UserDetailsProps, {emit, slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const endpoint: ManagementEndpoint = useManagementEndpoint('users');
    const hasUserId = (): boolean => Boolean(props.userId);
    const user: ResourceQueryResult<ManagedUser> = useResourceQuery(
      () => [UserQueryKeys.USER, props.userId],
      (fetcher) => getUser({...endpoint, fetcher, userId: props.userId}),
      {enabled: hasUserId},
    );
    const userTypesEndpoint: ManagementEndpoint = useManagementEndpoint('userTypes');
    const typeHandle = (): string | undefined =>
      user.data.value?.id === props.userId ? user.data.value.type : undefined;
    const userType: ResourceQueryResult<ManagedUserTypeDetails | undefined> = useResourceQuery(
      () => [UserQueryKeys.USER_TYPES, {handle: typeHandle()}],
      (fetcher) => getUserTypeByHandle({...userTypesEndpoint, fetcher, handle: typeHandle()!}),
      {
        enabled: (): boolean =>
          props.attributeVerification && Boolean(typeHandle() && user.data.value?.verifiedAttributes),
      },
    );
    const groups: ResourceQueryResult<MembershipGroupListResponse> = useResourceQuery(
      () => [GroupQueryKeys.MEMBERSHIPS, 'user', props.userId, {limit: 100}],
      (fetcher) => getUserGroups({...endpoint, fetcher, limit: 100, userId: props.userId}),
      {enabled: hasUserId},
    );
    const deletion: ResourceMutationResult<void, string> = useResourceMutation(
      (userId: string, fetcher) =>
        deleteUser({...endpoint, administrationMode: props.administrationMode, fetcher, userId}),
      () => [[UserQueryKeys.USERS]],
      {onSuccess: (): void => emit('deleted')},
    );
    const update: ResourceMutationResult<ManagedUser, UpdateUserVariables> = useResourceMutation(
      ({userId, data}: UpdateUserVariables, fetcher) => updateUser({...endpoint, fetcher, payload: data, userId}),
      ({userId}: UpdateUserVariables) => [[UserQueryKeys.USER, userId], [UserQueryKeys.USERS]],
    );
    const {baseUrl} = useThunderID();
    const verificationFlow: ResourceQueryResult<Record<string, string>> = useResourceQuery(
      () => ['administration-flows', 'attribute-verification'],
      (fetcher) =>
        resolveAdministrationFlowHandles({baseUrl, fetcher}, [
          AdministrationFlowConfigKey.ADMIN_ATTRIBUTE_VERIFICATION,
        ]),
      {enabled: (): boolean => props.attributeVerification},
    );
    const verificationHandle = (): string | undefined =>
      verificationFlow.data.value?.[AdministrationFlowConfigKey.ADMIN_ATTRIBUTE_VERIFICATION];
    const verificationTarget = shallowRef<VerificationTarget | null>(null);
    const verification: ResourceMutationResult<SendUserAttributeVerificationResult, VerificationTarget> =
      useResourceMutation(
        ({attribute, userId}, fetcher) =>
          sendUserAttributeVerification({...endpoint, attribute, fetcher, handle: verificationHandle(), userId}),
        ({userId}) => [[UserQueryKeys.USER, userId]],
      );
    const lifecycle: AccountLifecycleState = useAccountLifecycle({
      enabled: (): boolean => props.lifecycleActions,
      invalidatedKeys: () => [[UserQueryKeys.USER, props.userId], [UserQueryKeys.USERS]],
      kind: 'user',
      status: () => user.data.value?.status?.value,
      subject: () => props.userId,
    });

    return (): VNode => {
      const current: ManagedUser | undefined = user.data.value;
      const userSchema = userType.data.value?.handle === typeHandle() ? userType.data.value?.schema : undefined;
      const target: VerificationTarget | null = verificationTarget.value;
      const showVerificationResult: boolean =
        props.attributeVerification &&
        target?.userId === props.userId &&
        current?.attributes?.[target.attribute] === target.value;

      return h(
        BaseUserDetails,
        {
          className: props.className,
          error:
            toManagementErrorMessage(t, user.error.value, 'admin.users.details.error') ??
            toManagementErrorMessage(t, deletion.error.value, 'admin.users.details.delete.error') ??
            toManagementErrorMessage(t, update.error.value, 'admin.users.details.edit.error') ??
            toManagementErrorMessage(
              t,
              showVerificationResult ? verification.error.value : null,
              'admin.users.details.verification.error',
            ) ??
            toManagementErrorMessage(t, lifecycle.error.value, 'admin.common.lifecycle.error') ??
            toManagementErrorMessage(t, lifecycle.loadError.value, 'admin.common.lifecycle.load_error') ??
            toManagementErrorMessage(
              t,
              verificationFlow.error.value ?? userType.error.value,
              'admin.users.details.verification.load_error',
            ),
          groups: groups.data.value?.groups ?? [],
          hiddenAttributes: props.hiddenAttributes,
          isDeleting: deletion.isLoading.value,
          isLoading: user.isLoading.value,
          isRunningLifecycleAction: lifecycle.isRunning.value,
          isSendingVerification: verification.isLoading.value,
          isUpdating: update.isLoading.value,
          lifecycleActions: lifecycle.actions.value,
          onDelete: props.deletable ? (): void => void deletion.mutate(props.userId) : undefined,
          onLifecycleAction: props.lifecycleActions ? lifecycle.run : undefined,
          onSendVerification:
            props.attributeVerification && verificationHandle() && userSchema && current?.id === props.userId
              ? (attribute: string): void => {
                  const target: VerificationTarget = {
                    attribute,
                    userId: props.userId,
                    value: current?.attributes?.[attribute],
                  };
                  verificationTarget.value = target;
                  verification.reset();
                  void verification.mutate(target);
                }
              : undefined,
          onUpdate:
            props.editable && current
              ? (attributes: Record<string, unknown>): void =>
                  void update.mutate({
                    data: {attributes, ouId: current.ouId, type: current.type},
                    userId: props.userId,
                  })
              : undefined,
          preferences: props.preferences,
          sentVerification: showVerificationResult ? (verification.data.value ?? null) : null,
          user: current,
          userSchema,
        },
        {...slots},
      );
    };
  },
});

export default UserDetails;
