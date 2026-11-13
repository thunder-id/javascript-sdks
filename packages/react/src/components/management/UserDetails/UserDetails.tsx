// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AdministrationFlowConfigKey,
  AdministrationMode,
  GroupQueryKeys,
  ManagedUser,
  ManagedUserTypeDetails,
  MembershipGroupListResponse,
  SendUserAttributeVerificationResult,
  UpdateManagedUserRequest,
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
import {FC, ReactElement, useRef} from 'react';
import BaseUserDetails, {BaseUserDetailsProps} from './BaseUserDetails';
import useThunderID from '../../../contexts/ThunderID/useThunderID';
import useAccountLifecycle, {AccountLifecycleState} from '../../../hooks/management/useAccountLifecycle';
import useManagementEndpoint, {ManagementEndpoint} from '../../../hooks/management/useManagementEndpoint';
import useResourceMutation, {ResourceMutationResult} from '../../../hooks/management/useResourceMutation';
import useResourceQuery, {ResourceQueryResult} from '../../../hooks/management/useResourceQuery';
import useTranslation from '../../../hooks/useTranslation';

interface UpdateUserVariables {
  data: UpdateManagedUserRequest;
  userId: string;
}

interface VerificationTarget {
  attribute: string;
  userId: string;
  value: unknown;
}

export type UserDetailsProps = Omit<
  BaseUserDetailsProps,
  | 'error'
  | 'groups'
  | 'isDeleting'
  | 'isLoading'
  | 'isRunningLifecycleAction'
  | 'isSendingVerification'
  | 'isUpdating'
  | 'lifecycleActions'
  | 'onDelete'
  | 'onLifecycleAction'
  | 'onSendVerification'
  | 'onUpdate'
  | 'sentVerification'
  | 'user'
  | 'userSchema'
> & {
  /**
   * How the delete runs. `flow` runs the user deletion flow the server configures, which revokes the
   * user's grants and ends their sessions before the record goes. It needs `baseUrl`.
   * @default 'native'
   */
  administrationMode?: AdministrationMode;
  /**
   * Whether a verification link can be sent to the user's unverified email from this view. It runs the
   * server's administrator-initiated verification flow, and the user finishes from the link. It needs
   * `baseUrl`, and the action is offered only when the server names that flow under
   * `adminAttributeVerificationFlow` in its `flow` configuration; reading it needs a token that may read
   * the server configuration.
   * @default false
   */
  attributeVerification?: boolean;
  /**
   * Whether the user can be deleted from this view.
   * @default false
   */
  deletable?: boolean;
  /**
   * Whether the user's text attributes can be edited from this view.
   * @default false
   */
  editable?: boolean;
  /**
   * Whether the user can be suspended, unsuspended and unlocked from this view. Each action runs
   * through its administration flow and is offered only when the server configures that flow. Reading
   * the configured flows needs a token that may read the server configuration.
   * @default false
   */
  lifecycleActions?: boolean;
  /**
   * Called after the user has been deleted.
   */
  onDeleted?: () => void;
  userId: string;
};

/**
 * Shows a user and the groups they belong to, and optionally lets the signed-in user delete them, edit
 * them, run account lifecycle actions or send them a link to verify their email.
 *
 * @example
 * ```tsx
 * <UserDetails userId={userId} deletable attributeVerification onDeleted={() => navigate('/users')} />
 * ```
 */
const UserDetails: FC<UserDetailsProps> = ({
  administrationMode,
  attributeVerification = false,
  deletable = false,
  editable = false,
  lifecycleActions = false,
  onDeleted,
  preferences,
  userId,
  ...rest
}: UserDetailsProps): ReactElement => {
  const {t} = useTranslation(preferences?.i18n);
  const {baseUrl} = useThunderID();
  const endpoint: ManagementEndpoint = useManagementEndpoint('users');
  const user: ResourceQueryResult<ManagedUser> = useResourceQuery(
    [UserQueryKeys.USER, userId],
    (fetcher) => getUser({...endpoint, fetcher, userId}),
    {enabled: Boolean(userId)},
  );
  const userTypesEndpoint: ManagementEndpoint = useManagementEndpoint('userTypes');
  const typeHandle: string | undefined = user.data?.id === userId ? user.data.type : undefined;
  const userType: ResourceQueryResult<ManagedUserTypeDetails | undefined> = useResourceQuery(
    [UserQueryKeys.USER_TYPES, {handle: typeHandle}],
    (fetcher) => getUserTypeByHandle({...userTypesEndpoint, fetcher, handle: typeHandle!}),
    {enabled: attributeVerification && Boolean(typeHandle && user.data?.verifiedAttributes)},
  );
  const userSchema = userType.data?.handle === typeHandle ? userType.data?.schema : undefined;
  const groups: ResourceQueryResult<MembershipGroupListResponse> = useResourceQuery(
    [GroupQueryKeys.MEMBERSHIPS, 'user', userId, {limit: 100}],
    (fetcher) => getUserGroups({...endpoint, fetcher, limit: 100, userId}),
    {enabled: Boolean(userId)},
  );
  const deletion: ResourceMutationResult<void, string> = useResourceMutation(
    (id: string, fetcher) => deleteUser({...endpoint, administrationMode, fetcher, userId: id}),
    () => [[UserQueryKeys.USERS]],
    {onSuccess: onDeleted},
  );
  const update: ResourceMutationResult<ManagedUser, UpdateUserVariables> = useResourceMutation(
    ({data, userId: id}: UpdateUserVariables, fetcher) => updateUser({...endpoint, fetcher, payload: data, userId: id}),
    ({userId: id}: UpdateUserVariables) => [[UserQueryKeys.USER, id], [UserQueryKeys.USERS]],
  );

  const verificationFlow: ResourceQueryResult<Record<string, string>> = useResourceQuery(
    ['administration-flows', 'attribute-verification'],
    (fetcher) =>
      resolveAdministrationFlowHandles({baseUrl, fetcher}, [AdministrationFlowConfigKey.ADMIN_ATTRIBUTE_VERIFICATION]),
    {enabled: attributeVerification},
  );
  const verificationHandle: string | undefined =
    verificationFlow.data?.[AdministrationFlowConfigKey.ADMIN_ATTRIBUTE_VERIFICATION];
  const verificationTarget = useRef<VerificationTarget | null>(null);
  const verification: ResourceMutationResult<SendUserAttributeVerificationResult, VerificationTarget> =
    useResourceMutation(
      ({attribute, userId: id}, fetcher) =>
        sendUserAttributeVerification({...endpoint, attribute, fetcher, handle: verificationHandle, userId: id}),
      ({userId: id}) => [[UserQueryKeys.USER, id]],
    );
  const target: VerificationTarget | null = verificationTarget.current;
  const showVerificationResult: boolean =
    attributeVerification && target?.userId === userId && user.data?.attributes?.[target.attribute] === target.value;

  const lifecycle: AccountLifecycleState = useAccountLifecycle({
    enabled: lifecycleActions,
    invalidatedKeys: [[UserQueryKeys.USER, userId], [UserQueryKeys.USERS]],
    kind: 'user',
    status: user.data?.status?.value,
    subject: userId,
  });

  return (
    <BaseUserDetails
      user={user.data}
      userSchema={userSchema}
      groups={groups.data?.groups}
      isLoading={user.isLoading}
      error={
        toManagementErrorMessage(t, user.error, 'admin.users.details.error') ??
        toManagementErrorMessage(t, deletion.error, 'admin.users.details.delete.error') ??
        toManagementErrorMessage(t, update.error, 'admin.users.details.edit.error') ??
        toManagementErrorMessage(
          t,
          showVerificationResult ? verification.error : null,
          'admin.users.details.verification.error',
        ) ??
        toManagementErrorMessage(t, lifecycle.error, 'admin.common.lifecycle.error') ??
        toManagementErrorMessage(t, lifecycle.loadError, 'admin.common.lifecycle.load_error') ??
        toManagementErrorMessage(
          t,
          verificationFlow.error ?? userType.error,
          'admin.users.details.verification.load_error',
        )
      }
      isDeleting={deletion.isLoading}
      onDelete={deletable ? (): void => void deletion.mutate(userId) : undefined}
      lifecycleActions={lifecycle.actions}
      isRunningLifecycleAction={lifecycle.isRunning}
      onLifecycleAction={lifecycleActions ? lifecycle.run : undefined}
      isSendingVerification={verification.isLoading}
      onSendVerification={
        attributeVerification && verificationHandle && userSchema && user.data?.id === userId
          ? (attribute: string): void => {
              const target: VerificationTarget = {attribute, userId, value: user.data?.attributes?.[attribute]};
              verificationTarget.current = target;
              verification.reset();
              void verification.mutate(target);
            }
          : undefined
      }
      sentVerification={showVerificationResult ? (verification.data ?? null) : null}
      isUpdating={update.isLoading}
      onUpdate={
        editable && user.data
          ? (attributes: Record<string, unknown>): void =>
              void update.mutate({data: {attributes, ouId: user.data!.ouId, type: user.data!.type}, userId})
          : undefined
      }
      preferences={preferences}
      {...rest}
    />
  );
};

export default UserDetails;
