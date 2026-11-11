// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

'use client';

import {EmbeddedFlowComponent, EmbeddedFlowType, ThunderIDRuntimeError, isFlowExpiredError} from '@thunderid/node';
import {
  BaseSignIn,
  BaseSignInProps,
  FlowExpiryStep,
  normalizeFlowResponse,
  useFlowExpiryHandling,
  useTranslation,
} from '@thunderid/react';
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
   * Where to send the user once the flow expires, e.g. the application's URL. With it, an expired flow counts
   * down and redirects there. Without it, the flow is started again in place.
   */
  afterFlowExpiredUrl?: string;
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
  afterFlowExpiredUrl = undefined,
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
  const [flowExpiryStep, setFlowExpiryStep] = useState<FlowExpiryStep | null>(null);
  const {
    clearFlowRestarted,
    expireFlow,
    flowExpiryRedirect,
    isFlowExpired,
    isFlowRestarted,
    restartFlow,
    restartsInPlace,
  } = useFlowExpiryHandling({
    afterFlowExpiredUrl,
    canRestart: Boolean(applicationId),
    // Deferred, since the restart is defined further down.
    restart: (): void => {
      void startFlowAgain();
    },
    step: flowExpiryStep,
  });

  const applyFlowResponse = (response: any): void => {
    const normalized = normalizeFlowResponse(response, t, {resolveTranslations: false});

    challengeTokenRef.current = response?.challengeToken ?? undefined;
    setExecutionId(normalized.executionId ?? undefined);
    setComponents(normalized.components);
    setAdditionalData(normalized.additionalData);
    setFlowExpiryStep({expiresIn: response?.expiresIn});
  };

  const handleFlowError = (error: unknown): void => {
    const normalizedError: Error = error instanceof Error ? error : new Error(String(error));

    setFlowError(normalizedError);
    onError?.(normalizedError);
  };

  const sessionExpiredError = (): Error =>
    new ThunderIDRuntimeError(
      t('errors.signin.session.expired') ||
        'Your session has expired. Please return to the application and sign in again.',
      'SIGN_IN_ERROR',
      'nextjs',
    );

  /**
   * Marks the flow as expired. Unless the flow is started again in place, the error follows from the expiry,
   * set by the effect below; once already expired, it is set again here since a new submission clears it.
   */
  const handleFlowExpired = (): void => {
    if (isFlowExpired && !restartsInPlace) {
      setFlowError(sessionExpiredError());
    } else {
      expireFlow();
    }
  };

  // A flow that starts again in place needs no error: the user only sees the notice on the new flow.
  useEffect(() => {
    if (isFlowExpired && !restartsInPlace) {
      setFlowError(sessionExpiredError());
    }
  }, [isFlowExpired, restartsInPlace]);

  const startFlow = async (): Promise<void> => {
    if (!signIn) {
      return;
    }

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
      if (isFlowExpiredError(error)) {
        handleFlowExpired();
      } else {
        handleFlowError(error);
      }
    } finally {
      setIsFlowInitialized(true);
    }
  };

  /**
   * Starts an expired flow again for the same application, dropping the expired execution first.
   */
  const startFlowAgain = async (): Promise<void> => {
    challengeTokenRef.current = undefined;
    setExecutionId(undefined);
    setComponents([]);
    setAdditionalData({});
    setFlowError(null);
    setFlowExpiryStep(null);
    setIsFlowInitialized(false);
    await startFlow();
  };

  useEffect(() => {
    if (initializationAttemptedRef.current || !signIn) {
      return;
    }

    initializationAttemptedRef.current = true;

    void startFlow();
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

    clearFlowRestarted();

    let response: any;
    try {
      response = await signIn(
        {
          ...payload,
          executionId,
          ...(challengeTokenRef.current ? {challengeToken: challengeTokenRef.current} : {}),
        },
        {},
      );
    } catch (error) {
      if (isFlowExpiredError(error)) {
        handleFlowExpired();
        return;
      }
      throw error;
    }

    if (response) {
      applyFlowResponse(response);
    }
  };

  return (
    <BaseSignIn
      additionalData={additionalData}
      components={components}
      error={flowError}
      flowExpiryRedirect={flowExpiryRedirect}
      isFlowExpired={isFlowExpired}
      isFlowRestarted={isFlowRestarted}
      isLoading={!isFlowInitialized}
      onError={onError}
      onRestart={restartsInPlace ? restartFlow : undefined}
      onSubmit={handleOnSubmit}
      size={size}
      variant={variant}
      {...rest}
    />
  );
};

SignIn.displayName = 'SignIn';

export default SignIn;
