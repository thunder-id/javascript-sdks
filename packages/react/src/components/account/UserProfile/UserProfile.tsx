// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AttributeVerificationConstants,
  AuthenticationChallenge,
  PendingStepUp,
  REAUTHENTICATION_FAILED,
  StepUpRequiredError,
  ThunderIDError,
  ThunderIDRuntimeError,
  User,
  deepMerge,
  mapReauthenticationError,
  resolveResourceEndpoint,
  runWithStepUp,
} from '@thunderid/browser';
import {FC, ReactElement, ReactNode, useEffect, useRef, useState} from 'react';
// eslint-disable-next-line import/no-named-as-default
import BaseUserProfile, {BaseUserProfileProps, BaseUserProfileVerificationRenderProps} from './BaseUserProfile';
import updateMeProfile from '../../../api/account/updateMeProfile';
import useThunderID from '../../../contexts/ThunderID/useThunderID';
import useUser from '../../../contexts/User/useUser';
import useTranslation from '../../../hooks/useTranslation';
import VerifyAttribute from '../VerifyAttribute/VerifyAttribute';

/**
 * Props for the UserProfile component.
 * Extends BaseUserProfileProps but makes the user prop optional since it will be obtained from useThunderID
 */
export type UserProfileProps = Omit<BaseUserProfileProps, 'user' | 'profile' | 'flattenedProfile'> & {
  /**
   * Handle of the `SELF` flow that verifies an attribute. Defaults to the server's shipped
   * `default-self-attribute-verification-flow`.
   */
  verificationFlowHandle?: string;
  /**
   * Called when a change needs a more recent sign-in (`AUTH-4011`), such as a new email address or
   * mobile number, with the server's challenge, instead of the component signing the user in again by
   * itself. Sign the user in again with `challenge.maxAge` as `max_age`, then let the user save again.
   */
  onReauthenticationRequired?: (challenge: AuthenticationChallenge) => void;
};

/**
 * UserProfile component displays the authenticated user's profile information in a
 * structured and styled format. It shows user details such as display name, email,
 * username, and other available profile information from ThunderID.
 *
 * This component is the React-specific implementation that uses the BaseUserProfile
 * and automatically retrieves the user data from ThunderID context if not provided.
 *
 * Changing an email address or mobile number needs a recent sign-in. When the sign-in is too old,
 * the component signs the user in again with the server's `max_age`, checks that the same user signed
 * in, and saves the change once more: in a popup for a session from a redirect sign-in, or by running
 * the sign-in flow in a dialog for a session from an embedded sign-in flow. If the browser blocks the
 * popup, the next save opens it first.
 *
 * @example
 * ```tsx
 * // Basic usage - will use user from ThunderID context
 * <UserProfile />
 *
 * // With explicit user data
 * <UserProfile user={specificUser} />
 *
 * // With card layout and custom fallback
 * <UserProfile
 *   cardLayout={true}
 *   fallback={<div>Please sign in to view your profile</div>}
 * />
 *
 * // With field filtering - only show specific fields
 * <UserProfile
 *   showFields={['name.givenName', 'name.familyName', 'emails']}
 * />
 *
 * // With field hiding - hide specific fields
 * <UserProfile
 *   hideFields={['phoneNumbers', 'addresses']}
 * />
 * ```
 */
const UserProfile: FC<UserProfileProps> = ({
  preferences,
  editable = true,
  verificationFlowHandle = AttributeVerificationConstants.DEFAULT_FLOW_HANDLE,
  onReauthenticationRequired = undefined,
  ...rest
}: UserProfileProps): ReactElement => {
  const {baseUrl, endpoints, instanceId, preferences: contextPreferences, reauthenticate} = useThunderID();
  const pendingStepUp: PendingStepUp = useRef<PendingStepUp['current']>(undefined);
  // Whether the component is still on screen, so a change is not sent after it has closed.
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    mountedRef.current = true;

    return (): void => {
      mountedRef.current = false;
    };
  }, []);
  const {profile, flattenedProfile, onUpdateProfile, userSchema} = useUser();
  const resolvedPreferences = {
    ...contextPreferences,
    ...preferences,
    user: {
      ...contextPreferences?.user,
      ...preferences?.user,
    },
  };
  const {t} = useTranslation(resolvedPreferences?.i18n);
  const isEditableProfile: boolean = resolvedPreferences?.user?.fetchUserProfile === false ? false : editable;

  const [error, setError] = useState<string | null>(null);

  const handleProfileUpdate = async (payload: Record<string, unknown>): Promise<void> => {
    setError(null);

    try {
      const updatedAttributes: Record<string, unknown> = deepMerge(
        (profile?.['attributes'] as Record<string, unknown>) ?? {},
        payload,
      );

      Object.keys(updatedAttributes).forEach((key) => {
        if (updatedAttributes[key] === undefined || updatedAttributes[key] === null) {
          delete updatedAttributes[key];
        }
      });

      const response: User = await runWithStepUp({
        onReauthenticationRequired,
        isActive: (): boolean => mountedRef.current,
        pending: pendingStepUp,
        reauthenticate,
        send: () =>
          updateMeProfile({
            baseUrl,
            url: resolveResourceEndpoint('usersMe', {endpoints}),
            instanceId,
            payload: updatedAttributes,
          }),
      });
      onUpdateProfile(response);
    } catch (caughtError: unknown) {
      let message: string = t('user.profile.update.generic.error');

      if (caughtError instanceof ThunderIDRuntimeError && caughtError.code === REAUTHENTICATION_FAILED) {
        message = t(mapReauthenticationError((caughtError.details as {cause?: unknown} | undefined)?.cause));
      } else if (caughtError instanceof StepUpRequiredError) {
        message = t('user.reauthentication.required.error');
      } else if (caughtError instanceof ThunderIDError) {
        message = caughtError?.message;
      }

      setError(message);
    }
  };

  const renderVerification = ({
    attribute,
    attributeDisplayName,
    onCancel,
    onComplete,
  }: BaseUserProfileVerificationRenderProps): ReactNode => (
    <VerifyAttribute
      key={attribute}
      attribute={attribute}
      attributeDisplayName={attributeDisplayName}
      flowHandle={verificationFlowHandle}
      preferences={resolvedPreferences}
      // Popup mode shows the panel under the row as a card; inline mode shows it in a dialog.
      variant={rest.mode === 'popup' ? 'outlined' : 'flat'}
      onCancel={onCancel}
      onComplete={onComplete}
      onDone={onCancel}
    />
  );

  return (
    <BaseUserProfile
      renderVerification={isEditableProfile ? renderVerification : undefined}
      profile={profile ?? undefined}
      flattenedProfile={flattenedProfile ?? undefined}
      userSchema={userSchema ?? undefined}
      editable={isEditableProfile}
      onUpdate={isEditableProfile ? handleProfileUpdate : undefined}
      error={error}
      preferences={resolvedPreferences}
      {...rest}
    />
  );
};

export default UserProfile;
