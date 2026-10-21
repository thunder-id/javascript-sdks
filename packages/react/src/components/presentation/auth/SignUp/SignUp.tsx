// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  EmbeddedSignUpFlowRequest,
  EmbeddedSignUpFlowResponse,
  EmbeddedSignUpFlowType,
  EmbeddedFlowType,
} from '@thunderid/browser';
import {FC, ReactElement, ReactNode} from 'react';
// eslint-disable-next-line import/no-named-as-default
import BaseSignUp, {BaseSignUpProps, BaseSignUpRenderProps} from './BaseSignUp';
import useThunderID from '../../../../contexts/ThunderID/useThunderID';
import useTranslation from '../../../../hooks/useTranslation';

/**
 * Render props function parameters (re-exported from BaseSignUp for convenience)
 */
export type SignUpRenderProps = BaseSignUpRenderProps;

/**
 * Props for the SignUp component.
 */
export type SignUpProps = BaseSignUpProps & {
  /**
   * Render props function for custom UI
   */
  children?: (props: SignUpRenderProps) => ReactNode;
};

/**
 * A styled SignUp component for ThunderIDV2 (AKA Thunder) platform that provides embedded sign-up flow with pre-built styling.
 * This component handles the API calls for sign-up and delegates UI logic to BaseSignUp.
 */
const SignUp: FC<SignUpProps> = ({
  className,
  size = 'medium',
  afterSignUpUrl,
  onError,
  onComplete,
  shouldRedirectAfterSignUp = true,
  children,
  ...rest
}: SignUpProps): ReactElement => {
  const {signUp, isInitialized, applicationId, scopes} = useThunderID();
  const {currentLanguage} = useTranslation();

  /**
   * Initialize the sign-up flow.
   */
  const handleInitialize = async (payload?: EmbeddedSignUpFlowRequest): Promise<EmbeddedSignUpFlowResponse> => {
    const urlParams: URLSearchParams = new URL(window.location.href).searchParams;
    const executionIdFromUrl: string = urlParams.get('executionId') || '';
    const applicationIdFromUrl: string = urlParams.get('applicationId') ?? '';

    const effectiveApplicationId: any = applicationId ?? applicationIdFromUrl;

    const challengeToken: string | undefined = (payload as any)?.challengeToken;

    let initialPayload: EmbeddedSignUpFlowRequest | any;
    if (executionIdFromUrl) {
      initialPayload = {
        executionId: executionIdFromUrl,
        ...(challengeToken ? {challengeToken} : {}),
      };
    } else if (!payload || !('flowType' in payload)) {
      initialPayload = {
        ...(payload || {}),
        flowType: EmbeddedFlowType.Registration,
        ...(effectiveApplicationId && {applicationId: effectiveApplicationId}),
        ...(scopes && {scopes}),
      };
    } else {
      initialPayload = payload;
    }

    return (await signUp({...initialPayload, locale: currentLanguage})) as EmbeddedSignUpFlowResponse;
  };

  /**
   * Handle sign-up steps.
   */
  const handleOnSubmit = async (payload: EmbeddedSignUpFlowRequest): Promise<EmbeddedSignUpFlowResponse> =>
    (await signUp({...payload, locale: currentLanguage})) as EmbeddedSignUpFlowResponse;

  /**
   * Handle successful sign-up and redirect.
   */
  const handleComplete = (response: EmbeddedSignUpFlowResponse): any => {
    onComplete?.(response);

    if (!shouldRedirectAfterSignUp) {
      return;
    }

    const redirectURL: string | undefined = (response?.data as Record<string, unknown>)?.['redirectURL'] as
      | string
      | undefined;

    if (
      response?.type === EmbeddedSignUpFlowType.Redirection &&
      redirectURL &&
      !redirectURL.includes('oauth') && // Not a social provider redirect
      !redirectURL.includes('auth') // Not an auth provider redirect
    ) {
      window.location.href = redirectURL;
      return;
    }

    const oauthRedirectUrl: any = (response as any)?.redirectUrl;
    if (oauthRedirectUrl) {
      window.location.href = oauthRedirectUrl;
      return;
    }

    // For non-redirection responses (regular sign-up completion), handle redirect if configured.
    // A completion carrying an assertion redirects too. The stored session is a reason to leave the
    // flow, not to stay on it: the flow is over, so remaining on the finished step strands the user
    // on a form whose submit actions no longer lead anywhere. Consumers that navigate themselves
    // opt out through shouldRedirectAfterSignUp, and one that passes no afterSignUpUrl is never
    // redirected here.
    if (response?.type !== EmbeddedSignUpFlowType.Redirection && afterSignUpUrl) {
      window.location.href = afterSignUpUrl;
    }
  };

  return (
    <BaseSignUp
      afterSignUpUrl={afterSignUpUrl}
      onInitialize={handleInitialize}
      onSubmit={handleOnSubmit}
      onError={onError}
      onComplete={handleComplete}
      className={className}
      size={size}
      isInitialized={isInitialized}
      children={children}
      showTitle={true}
      showSubtitle={true}
      {...rest}
    />
  );
};

export default SignUp;
