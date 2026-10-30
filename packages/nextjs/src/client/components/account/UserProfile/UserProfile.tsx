// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {AttributeVerificationConstants, deepMerge, User} from '@thunderid/node';
import {
  BaseUserProfile,
  BaseUserProfileProps,
  BaseUserProfileVerificationRenderProps,
  useUser,
  useTranslation,
} from '@thunderid/react';
import {FC, ReactElement, ReactNode, useState} from 'react';
import useThunderID from '../../../contexts/ThunderID/useThunderID';
import getSessionId from '../../../../server/actions/getSessionId';
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
 * ```
 */
const UserProfile: FC<UserProfileProps> = ({
  preferences,
  editable = true,
  verificationFlowHandle = AttributeVerificationConstants.DEFAULT_FLOW_HANDLE,
  ...rest
}: UserProfileProps): ReactElement => {
  const {preferences: contextPreferences} = useThunderID();
  const {profile, flattenedProfile, onUpdateProfile, updateProfile, userSchema} = useUser();
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

  const handleProfileUpdate = async (payload: any): Promise<void> => {
    setError(null);

    const updatedAttributes = deepMerge((profile?.['attributes'] as Record<string, unknown>) ?? {}, payload);

    Object.keys(updatedAttributes).forEach((key) => {
      if (updatedAttributes[key] === undefined || updatedAttributes[key] === null) {
        delete updatedAttributes[key];
      }
    });

    const result: {data: {user: User}; error: string; success: boolean} = await updateProfile(
      {payload: updatedAttributes},
      await getSessionId(),
    );

    if (result.success) {
      onUpdateProfile(result.data.user);
    } else {
      setError(result.error || t('user.profile.update.generic.error'));
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
      profile={profile!}
      flattenedProfile={flattenedProfile!}
      userSchema={userSchema}
      editable={isEditableProfile}
      onUpdate={isEditableProfile ? handleProfileUpdate : undefined}
      error={error}
      preferences={resolvedPreferences}
      {...rest}
    />
  );
};

export default UserProfile;
