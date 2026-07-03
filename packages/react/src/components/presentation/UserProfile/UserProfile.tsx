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

import {ThunderIDError, User, deepMerge} from '@thunderid/browser';
import {FC, ReactElement, useState} from 'react';
// eslint-disable-next-line import/no-named-as-default
import BaseUserProfile, {BaseUserProfileProps} from './BaseUserProfile';
import updateMeProfile from '../../../api/updateMeProfile';
import useThunderID from '../../../contexts/ThunderID/useThunderID';
import useUser from '../../../contexts/User/useUser';
import useTranslation from '../../../hooks/useTranslation';

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
const UserProfile: FC<UserProfileProps> = ({preferences, editable = true, ...rest}: UserProfileProps): ReactElement => {
  const {baseUrl, instanceId, preferences: contextPreferences} = useThunderID();
  const {profile, flattenedProfile, onUpdateProfile} = useUser();
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

      const response: User = await updateMeProfile({baseUrl, instanceId, payload: updatedAttributes});
      onUpdateProfile(response);
    } catch (caughtError: unknown) {
      let message: string = t('user.profile.update.generic.error');

      if (caughtError instanceof ThunderIDError) {
        message = caughtError?.message;
      }

      setError(message);
    }
  };

  return (
    <BaseUserProfile
      profile={profile ?? undefined}
      flattenedProfile={flattenedProfile ?? undefined}
      editable={isEditableProfile}
      onUpdate={isEditableProfile ? handleProfileUpdate : undefined}
      error={error}
      preferences={resolvedPreferences}
      {...rest}
    />
  );
};

export default UserProfile;
