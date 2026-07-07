/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
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

import {BaseUserAvatar, BaseUserAvatarProps} from '@thunderid/react';
import {FC, ReactElement} from 'react';
import useThunderID from '../../../contexts/ThunderID/useThunderID';

export type UserAvatarProps = Omit<BaseUserAvatarProps, 'user'>;

/**
 * UserAvatar component renders an avatar for the currently signed-in user.
 * This component is the Next.js-specific implementation that uses BaseUserAvatar
 * and automatically retrieves the user data from ThunderID context.
 *
 * @example
 * ```tsx
 * <UserAvatar size={48} />
 * ```
 */
const UserAvatar: FC<UserAvatarProps> = (props: UserAvatarProps): ReactElement => {
  const {user} = useThunderID();

  return <BaseUserAvatar user={user} {...props} />;
};

export default UserAvatar;
