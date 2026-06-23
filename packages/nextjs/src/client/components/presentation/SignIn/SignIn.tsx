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

import {ThunderIDRuntimeError} from '@thunderid/node';
import {BaseSignIn, BaseSignInProps} from '@thunderid/react';
import {FC} from 'react';
import useThunderID from '../../../contexts/ThunderID/useThunderID';

/**
 * Props for the SignIn component.
 * Extends BaseSignInProps for full compatibility with the React BaseSignIn component
 */
export type SignInProps = Pick<BaseSignInProps, 'className' | 'onSuccess' | 'onError' | 'variant' | 'size'>;

/**
 * A SignIn component for Next.js that provides native authentication flow.
 * This component delegates to the BaseSignIn from @thunderid/react and requires
 * the API functions to be provided as props.
 */
const SignIn: FC<SignInProps> = ({size = 'medium', variant = 'outlined', ...rest}: SignInProps) => {
  const {signIn} = useThunderID();

  const handleOnSubmit = async (payload: any, request: any): Promise<void> => {
    if (!signIn) {
      throw new ThunderIDRuntimeError(
        '`signIn` function is not available.',
        'SignIn-handleOnSubmit-RuntimeError-001',
        'nextjs',
      );
    }

    await signIn(payload, request);
  };

  return (
    <BaseSignIn
      // isLoading={isLoading || !isInitialized}
      onSubmit={handleOnSubmit}
      size={size}
      variant={variant}
      {...rest}
    />
  );
};

SignIn.displayName = 'SignIn';

export default SignIn;
