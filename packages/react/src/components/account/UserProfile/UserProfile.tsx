// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AttributeVerificationConstants,
  ThunderIDError,
  User,
  deepMerge,
  resolveResourceEndpoint,
} from '@thunderid/browser';
import {FC, ReactElement, ReactNode, useState} from 'react';
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
   * Handle of the `SELF_SERVICE` flow that verifies an attribute. Defaults to the server's shipped
   * `default-self-attribute-verification-flow`.
   */
  verificationFlowHandle?: string;
};

/**
 * UserProfile component displays the authenticated user's profile information in a
 * structured and styled format. It shows user details such as display name, email,
 * username, and other available profile information from ThunderID.
 *
 * This component is the React-specific implementation that uses the BaseUserProfile
 * and automatically retrieves the user data from ThunderID context if not provided.
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
  ...rest
}: UserProfileProps): ReactElement => {
  const {baseUrl, endpoints, instanceId, preferences: contextPreferences} = useThunderID();
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

      const response: User = await updateMeProfile({
        baseUrl,
        url: resolveResourceEndpoint('usersMe', {endpoints}),
        instanceId,
        payload: updatedAttributes,
      });
      onUpdateProfile(response);
    } catch (caughtError: unknown) {
      let message: string = t('user.profile.update.generic.error');

      if (caughtError instanceof ThunderIDError) {
        message = caughtError?.message;
      }

      setError(message);
    }
  };

  const renderVerification = ({
    attribute,
    attributeDisplayName,
    onCancel,
  }: BaseUserProfileVerificationRenderProps): ReactNode => (
    <VerifyAttribute
      key={attribute}
      attribute={attribute}
      attributeDisplayName={attributeDisplayName}
      flowHandle={verificationFlowHandle}
      preferences={resolvedPreferences}
      onCancel={onCancel}
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
