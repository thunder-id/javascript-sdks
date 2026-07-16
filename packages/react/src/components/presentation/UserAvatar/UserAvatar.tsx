/**
 * Copyright (c) 2025-2026, WSO2 LLC. (https://www.wso2.com).
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

import {User} from '@thunderid/browser';
import {FC, JSX} from 'react';
import useThunderID from '../../../contexts/ThunderID/useThunderID';
import BaseUserAvatar, {BaseUserAvatarProps} from './BaseUserAvatar';

export interface UserAvatarProps extends Omit<BaseUserAvatarProps, 'user'> {
  /**
   * Override the user to render. When omitted the signed-in user from
   * ThunderID context is used automatically.
   */
  user?: User | null;
}

/**
 * Context-aware avatar component. Renders an avatar for the currently
 * signed-in user without requiring an explicit `user` prop.
 *
 * Derives the profile picture and initials from the user's token claims,
 * with graceful fallback to generated initials when no image is available.
 *
 * @example
 * ```tsx
 * // Auto-reads from context
 * <UserAvatar size={48} />
 *
 * // Override with a specific user
 * <UserAvatar user={someUser} size={32} />
 * ```
 */
const UserAvatar: FC<UserAvatarProps> = ({user: userProp, ...rest}: UserAvatarProps): JSX.Element => {
  const {user} = useThunderID();
  return <BaseUserAvatar user={userProp ?? user} {...rest} />;
};

UserAvatar.displayName = 'UserAvatar';

export default UserAvatar;
