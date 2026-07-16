/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

'use client';

import {deepMerge, User} from '@thunderid/node';
import {BaseUserProfile, BaseUserProfileProps, useUser, useTranslation} from '@thunderid/react';
import {FC, ReactElement, useState} from 'react';
import useThunderID from '../../../contexts/ThunderID/useThunderID';
import getSessionId from '../../../../server/actions/getSessionId';

/**
 * Props for the UserProfile component.
 * Extends BaseUserProfileProps but makes the user prop optional since it will be obtained from useThunderID
 */
export type UserProfileProps = Omit<BaseUserProfileProps, 'user' | 'profile' | 'flattenedProfile'>;

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
const UserProfile: FC<UserProfileProps> = ({preferences, editable = true, ...rest}: UserProfileProps): ReactElement => {
  const {preferences: contextPreferences} = useThunderID();
  const {profile, flattenedProfile, onUpdateProfile, updateProfile} = useUser();
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

  return (
    <BaseUserProfile
      profile={profile!}
      flattenedProfile={flattenedProfile!}
      editable={isEditableProfile}
      onUpdate={isEditableProfile ? handleProfileUpdate : undefined}
      error={error}
      preferences={resolvedPreferences}
      {...rest}
    />
  );
};

export default UserProfile;
