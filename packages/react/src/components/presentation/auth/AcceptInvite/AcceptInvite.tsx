// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ThunderIDAPIError} from '@thunderid/browser';
import {FC, ReactElement, ReactNode, useMemo} from 'react';
import useTranslation from '../../../../hooks/useTranslation';
import BaseAcceptInvite, {BaseAcceptInviteRenderProps, AcceptInviteFlowResponse} from './BaseAcceptInvite';

/**
 * Render props for AcceptInvite (re-exported for convenience).
 */
export type AcceptInviteRenderProps = BaseAcceptInviteRenderProps;

/**
 * Props for the AcceptInvite component.
 */
export interface AcceptInviteProps {
  /**
   * Base URL for the Thunder API server.
   * If not provided, will try to read from window location.
   */
  baseUrl?: string;

  /**
   * Render props function for custom UI.
   * If not provided, default UI will be rendered by the SDK.
   */
  children?: (props: AcceptInviteRenderProps) => ReactNode;

  /**
   * Custom CSS class name.
   */
  className?: string;

  /**
   * Flow ID from the invite link.
   * If not provided, will be extracted from URL query parameters.
   */
  executionId?: string;

  /**
   * Invite token from the invite link.
   * If not provided, will be extracted from URL query parameters.
   */
  inviteToken?: string;

  /**
   * Callback when the flow completes successfully.
   */
  onComplete?: () => void;

  /**
   * Callback when an error occurs.
   */
  onError?: (error: Error) => void;

  /**
   * Callback when the flow state changes.
   */
  onFlowChange?: (response: AcceptInviteFlowResponse) => void;

  /**
   * Callback to navigate to sign in page.
   */
  onGoToSignIn?: () => void;

  /**
   * Whether to show the subtitle.
   */
  showSubtitle?: boolean;

  /**
   * Whether to show the title.
   */
  showTitle?: boolean;

  /**
   * Size variant for the component.
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Theme variant for the component card.
   */
  variant?: 'outlined' | 'elevated';
}

/**
 * Helper to extract query parameters from URL.
 */
const getUrlParams = (): {executionId?: string; inviteToken?: string} => {
  if (typeof window === 'undefined') {
    return {};
  }

  const params: any = new URLSearchParams(window.location.search);
  return {
    executionId: params.get('executionId') || undefined,
    inviteToken: params.get('inviteToken') || undefined,
  };
};

/**
 * AcceptInvite component for end-users to accept an invite and set their password.
 *
 * This component is designed for end users accessing the thunder-gate app via an invite link.
 * It automatically:
 * 1. Extracts executionId and inviteToken from URL query parameters
 * 2. Validates the invite token with the backend
 * 3. Displays the password form if token is valid
 * 4. Completes the accept invite when password is set
 *
 * @example
 * ```tsx
 * import { AcceptInvite } from '@thunderid/react';
 *
 * // URL: /invite?executionId=xxx&inviteToken=yyy
 *
 * const AcceptInvitePage = () => {
 *   return (
 *     <AcceptInvite
 *       baseUrl="https://api.thunder.io"
 *       onComplete={() => navigate('/signin')}
 *       onError={(error) => console.error(error)}
 *     >
 *       {({ values, components, isLoading, isComplete, isValidatingToken, isTokenInvalid, error, handleInputChange, handleSubmit }) => (
 *         <div>
 *           {isValidatingToken && <p>Validating your invite...</p>}
 *           {isTokenInvalid && <p>Invalid or expired invite link</p>}
 *           {isComplete && <p>Registration complete! You can now sign in.</p>}
 *           {!isComplete && !isValidatingToken && !isTokenInvalid && (
 *             // Render password form based on components
 *           )}
 *         </div>
 *       )}
 *     </AcceptInvite>
 *   );
 * };
 * ```
 */
const AcceptInvite: FC<AcceptInviteProps> = ({
  baseUrl,
  executionId: executionIdProp,
  inviteToken: inviteTokenProp,
  onComplete,
  onError,
  onFlowChange,
  onGoToSignIn,
  className,
  children,
  size = 'medium',
  variant = 'outlined',
  showTitle = true,
  showSubtitle = true,
}: AcceptInviteProps): ReactElement => {
  // Extract from URL if not provided as props
  const {currentLanguage} = useTranslation();
  const {executionId: urlExecutionId, inviteToken: urlInviteToken} = useMemo(() => getUrlParams(), []);

  const executionId: any = executionIdProp || urlExecutionId;
  const inviteToken: any = inviteTokenProp || urlInviteToken;

  // Determine base URL
  const apiBaseUrl: any = useMemo(() => {
    if (baseUrl) {
      return baseUrl;
    }
    // Try to construct from current location (assuming same origin)
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  }, [baseUrl]);

  /**
   * Submit flow step data.
   * Makes an unauthenticated request to /flow/execute endpoint.
   */
  const handleSubmit = async (payload: Record<string, any>): Promise<AcceptInviteFlowResponse> => {
    const response: Response = await fetch(`${apiBaseUrl}/flow/execute`, {
      body: JSON.stringify({
        ...payload,
        verbose: true,
        locale: currentLanguage,
      }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      const errorText: string = await response.text();
      // ThunderIDAPIError resolves the raw API body into a readable message instead of leaking it.
      throw new ThunderIDAPIError(
        errorText,
        'AcceptInvite-ResponseError-001',
        'react',
        response.status,
        response.statusText,
      );
    }

    return response.json();
  };

  return (
    <BaseAcceptInvite
      executionId={executionId}
      inviteToken={inviteToken}
      onSubmit={handleSubmit}
      onComplete={onComplete}
      onError={onError}
      onFlowChange={onFlowChange}
      onGoToSignIn={onGoToSignIn}
      className={className}
      size={size}
      variant={variant}
      showTitle={showTitle}
      showSubtitle={showSubtitle}
    >
      {children}
    </BaseAcceptInvite>
  );
};

export default AcceptInvite;
