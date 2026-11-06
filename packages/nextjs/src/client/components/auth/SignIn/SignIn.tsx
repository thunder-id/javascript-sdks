// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {EmbeddedFlowComponent, EmbeddedFlowType, ThunderIDRuntimeError} from '@thunderid/node';
import {BaseSignIn, BaseSignInProps, normalizeFlowResponse, useTranslation} from '@thunderid/react';
import {FC, useEffect, useRef, useState} from 'react';
import useThunderID from '../../../contexts/ThunderID/useThunderID';

/**
 * Props for the SignIn component.
 * Extends BaseSignInProps for full compatibility with the React BaseSignIn component
 */
export type SignInProps = Pick<
  BaseSignInProps,
  'children' | 'className' | 'id' | 'onSuccess' | 'onError' | 'variant' | 'size'
> & {
  /**
   * Bounds the sign-in to this organization unit. Sent as `ouId` on the request that starts the
   * `AUTHENTICATION` flow only, never on a continuation.
   */
  organizationUnitId?: string;
};

/**
 * A SignIn component for Next.js that provides native authentication flow.
 * This component delegates to the BaseSignIn from @thunderid/react. Unlike BaseSignUp,
 * BaseSignIn does not manage its own flow state, so this component initiates the flow
 * (using the server-action-backed `signIn`) and tracks `components`/`executionId` itself.
 */
const SignIn: FC<SignInProps> = ({
  size = 'medium',
  variant = 'outlined',
  onError,
  organizationUnitId,
  ...rest
}: SignInProps) => {
  const {signIn, applicationId, scopes} = useThunderID();
  const {t} = useTranslation();

  const [components, setComponents] = useState<EmbeddedFlowComponent[]>([]);
  const [additionalData, setAdditionalData] = useState<Record<string, any>>({});
  const [executionId, setExecutionId] = useState<string | undefined>(undefined);
  const [isFlowInitialized, setIsFlowInitialized] = useState(false);
  const [flowError, setFlowError] = useState<Error | null>(null);
  const initializationAttemptedRef = useRef(false);
  // A fresh challenge token is required on every step to prevent replay attacks; the server
  // rotates it on each response, so it's tracked in a ref (not state) to avoid a stale value
  // from a closure captured before the previous response's state update committed.
  const challengeTokenRef = useRef<string | undefined>(undefined);

  const applyFlowResponse = (response: any): void => {
    const normalized = normalizeFlowResponse(response, t, {resolveTranslations: false});

    challengeTokenRef.current = response?.challengeToken ?? undefined;
    setExecutionId(normalized.executionId ?? undefined);
    setComponents(normalized.components);
    setAdditionalData(normalized.additionalData);
  };

  const handleFlowError = (error: unknown): void => {
    const normalizedError: Error = error instanceof Error ? error : new Error(String(error));

    setFlowError(normalizedError);
    onError?.(normalizedError);
  };

  useEffect(() => {
    if (initializationAttemptedRef.current || !signIn) {
      return;
    }

    initializationAttemptedRef.current = true;

    (async (): Promise<void> => {
      try {
        const response: any = await signIn(
          {
            applicationId,
            flowType: EmbeddedFlowType.Authentication,
            ...(scopes && {scopes}),
            ...(organizationUnitId && {ouId: organizationUnitId}),
          },
          {},
        );

        // `response` is undefined when the provider already redirected
        // (OAuth-redirect or completed flows are handled there directly).
        if (response) {
          applyFlowResponse(response);
        }
      } catch (error) {
        handleFlowError(error);
      } finally {
        setIsFlowInitialized(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signIn]);

  const handleOnSubmit = async (payload: any): Promise<void> => {
    if (!signIn) {
      throw new ThunderIDRuntimeError(
        '`signIn` function is not available.',
        'SignIn-handleOnSubmit-RuntimeError-001',
        'nextjs',
      );
    }

    const response: any = await signIn(
      {
        ...payload,
        executionId,
        ...(challengeTokenRef.current ? {challengeToken: challengeTokenRef.current} : {}),
      },
      {},
    );

    if (response) {
      applyFlowResponse(response);
    }
  };

  return (
    <BaseSignIn
      additionalData={additionalData}
      components={components}
      error={flowError}
      isLoading={!isFlowInitialized}
      onError={onError}
      onSubmit={handleOnSubmit}
      size={size}
      variant={variant}
      {...rest}
    />
  );
};

SignIn.displayName = 'SignIn';

export default SignIn;
