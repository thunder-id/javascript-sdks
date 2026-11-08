// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {BaseSignOutButton, BaseSignOutButtonProps, useTranslation} from '@thunderid/react';
import {forwardRef, ForwardRefExoticComponent, ReactElement, Ref, RefAttributes, useState, MouseEvent} from 'react';
import logger from '../../../../../utils/logger';
import useThunderID from '../../../../contexts/ThunderID/useThunderID';

/**
 * Interface for SignInButton component props.
 */
export type SignOutButtonProps = BaseSignOutButtonProps;

/**
 * SignInButton component. This button initiates the sign-in process when clicked.
 *
 * @example
 * ```tsx
 * import { SignInButton } from '@thunderid/auth-react';
 *
 * const App = () => {
 *   const buttonRef = useRef<HTMLButtonElement>(null);
 *   return (
 *     <SignInButton ref={buttonRef} className="custom-class" style={{ backgroundColor: 'blue' }}>
 *       Sign In
 *     </SignInButton>
 *   );
 * }
 * ```
 */
const SignOutButton: ForwardRefExoticComponent<SignOutButtonProps & RefAttributes<HTMLButtonElement>> = forwardRef<
  HTMLButtonElement,
  SignOutButtonProps
>(
  (
    {className, style, preferences, onClick, children, ...rest}: SignOutButtonProps,
    ref: Ref<HTMLButtonElement>,
  ): ReactElement => {
    const {signOut} = useThunderID();
    const {t} = useTranslation(preferences?.i18n);

    const [isLoading, setIsLoading] = useState(false);

    const handleSignOut = async (): Promise<boolean> => {
      try {
        setIsLoading(true);

        logger.debug('[SignOutButton] Initiating a sign-out');

        await signOut();

        return true;
      } catch (error) {
        logger.error('[SignOutButton] Error occurred initiating sign-out:', error);

        return false;
      } finally {
        setIsLoading(false);
      }
    };

    // What a render function receives as `signOut`.
    const signOutFromRenderProp = async (): Promise<void> => {
      await handleSignOut();
    };

    const handleOnClick = async (e: MouseEvent<HTMLButtonElement>): Promise<void> => {
      if ((await handleSignOut()) && onClick) {
        onClick(e);
      }
    };

    return (
      <BaseSignOutButton
        className={className}
        style={style}
        ref={ref}
        onClick={handleOnClick}
        isLoading={isLoading}
        signOut={signOutFromRenderProp}
        preferences={preferences}
        {...rest}
      >
        {children ?? t('elements.buttons.signout.text')}
      </BaseSignOutButton>
    );
  },
);

export default SignOutButton;
