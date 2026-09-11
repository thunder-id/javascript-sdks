// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  ThunderIDRuntimeError,
  ThunderIDAPIError,
  ConsentConstants,
  EmbeddedFlowComponent,
  EmbeddedFlowType,
  EmbeddedSignInFlowResponse,
  EmbeddedSignInFlowRequest,
  EmbeddedSignInFlowStatus,
  EmbeddedSignInFlowType,
  FieldError,
  FlowMetadataResponse,
  Preferences,
  logger,
} from '@thunderid/browser';
import {FC, ReactElement, useState, useEffect, useRef, ReactNode} from 'react';
// eslint-disable-next-line import/no-named-as-default
import BaseSignIn, {BaseSignInProps} from './BaseSignIn';
import useThunderID from '../../../../contexts/ThunderID/useThunderID';
import {useOAuthCallback} from '../../../../hooks/useOAuthCallback';
import useTranslation from '../../../../hooks/useTranslation';
import {extractErrorMessage, normalizeFlowResponse} from '../../../../utils/flowTransformer';
import {initiateOAuthRedirect} from '../../../../utils/oauth';
import {handlePasskeyAuthentication, handlePasskeyRegistration} from '../../../../utils/passkey';

/**
 * Render props function parameters
 */
export interface SignInRenderProps {
  /**
   * Additional data from the flow response containing contextual information
   * like consent prompt details and session timeouts.
   */
  additionalData?: Record<string, any>;

  /**
   * Current flow components
   */
  components: EmbeddedFlowComponent[];

  /**
   * Current error if any
   */
  error: Error | null;

  /**
   * Server-side field-level validation errors from the most recent flow response,
   * collapsed to one message per field (first error wins). Empty when no validation
   * failures are active. Render-prop consumers should display these alongside their
   * own client-side validation errors.
   */
  fieldErrors: Record<string, string>;

  /**
   * Function to manually initialize the flow
   */
  initialize: () => Promise<void>;

  /**
   * Whether the flow has been initialized
   */
  isInitialized: boolean;

  /**
   * Loading state indicator
   */
  isLoading: boolean;

  /**
   * Flag indicating whether the flow step timeout has expired.
   * Consuming components can use this to disable submit buttons.
   */
  isTimeoutDisabled?: boolean;

  /**
   * Flow metadata returned by the platform (v2 only). `null` while loading or unavailable.
   */
  meta: FlowMetadataResponse | null;

  /**
   * Function to submit authentication data (primary)
   */
  onSubmit: (payload: EmbeddedSignInFlowRequest) => Promise<void>;
}

/**
 * Props for the SignIn component.
 * Matches the interface from the main SignIn component for consistency.
 */
export interface SignInProps {
  /**
   * Render props function for custom UI
   */
  children?: (props: SignInRenderProps) => ReactNode;

  /**
   * Custom CSS class name for the form container.
   */
  className?: string;

  /**
   * Callback function called when authentication fails.
   * @param error - The error that occurred during authentication.
   */
  onError?: (error: Error) => void;

  /**
   * Callback function called when authentication is successful.
   * @param authData - The authentication data returned upon successful completion.
   */
  onSuccess?: (authData: Record<string, any>) => void;

  /**
   * Component-level preferences to override global i18n and theme settings.
   * Preferences are deep-merged with global ones, with component preferences
   * taking precedence. Affects this component and all its descendants.
   */
  preferences?: Preferences;

  /**
   * When a field has been blurred at least once, re-run validation on every subsequent
   * keystroke so a rendered error clears the moment the value becomes valid. Doesn't
   * affect fields that have never been blurred — the user isn't shown errors while
   * initially typing. Default `false` preserves prior behavior.
   */
  revalidateOnChangeAfterBlur?: boolean;

  /**
   * Size variant for the component.
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Theme variant for the component.
   */
  variant?: BaseSignInProps['variant'];
}

/**
 * State for tracking passkey registration
 */
interface PasskeyState {
  actionId: string | null;
  challenge: string | null;
  creationOptions: string | null;
  error: Error | null;
  executionId: string | null;
  isActive: boolean;
}

/**
 * Sentinel input key carrying the reason a consent prompt was submitted. It is folded into the
 * compiled `consent_decisions` payload and stripped from the inputs, like `__consent_opt__` keys.
 */
const CONSENT_REASON_KEY = '__consent_reason__';

/** Flattens a component tree into a single list, parents before their children. */
const flattenComponents = (comps: EmbeddedFlowComponent[] | undefined): EmbeddedFlowComponent[] =>
  (comps ?? []).flatMap((comp: EmbeddedFlowComponent) => [comp, ...flattenComponents(comp.components)]);

/**
 * Finds the action to submit an expired consent prompt with. A non-primary submit action is
 * preferred so the payload reads as a denial, falling back to any submit action because the server
 * needs an action to route the prompt node. Returns undefined when the view has neither.
 */
const findConsentSubmitActionId = (comps: EmbeddedFlowComponent[] | undefined): string | undefined => {
  const submitActions: EmbeddedFlowComponent[] = flattenComponents(comps).filter(
    (comp: EmbeddedFlowComponent) => comp.id && comp.eventType?.toUpperCase() === 'SUBMIT',
  );
  const denyAction: EmbeddedFlowComponent | undefined = submitActions.find(
    (comp: EmbeddedFlowComponent) => comp.variant?.toLowerCase() !== 'primary',
  );

  return (denyAction ?? submitActions[0])?.id;
};

/**
 * A component-driven SignIn component that provides authentication flow with pre-built styling.
 * This component handles the flow API calls for authentication and delegates UI logic to BaseSignIn.
 * It automatically transforms simple input-based responses into component-driven UI format.
 *
 * @example
 * // Default UI
 * ```tsx
 * import { SignIn } from '@thunderid/react/component-driven';
 *
 * const App = () => {
 *   return (
 *     <SignIn
 *       onSuccess={(authData) => {
 *         console.log('Authentication successful:', authData);
 *       }}
 *       onError={(error) => {
 *         console.error('Authentication failed:', error);
 *       }}
 *       size="medium"
 *       variant="outlined"
 *     />
 *   );
 * };
 * ```
 *
 * @example
 * // Custom UI with render props
 * ```tsx
 * import { SignIn } from '@thunderid/react/component-driven';
 *
 * const App = () => {
 *   return (
 *     <SignIn
 *       onSuccess={(authData) => console.log('Success:', authData)}
 *       onError={(error) => console.error('Error:', error)}
 *     >
 *       {({signIn, isLoading, components, error, isInitialized}) => (
 *         <div className="custom-signin">
 *           <h1>Custom Sign In</h1>
 *           {!isInitialized ? (
 *             <p>Initializing...</p>
 *           ) : error ? (
 *             <div className="error">{error.message}</div>
 *           ) : (
 *             <form onSubmit={(e) => {
 *               e.preventDefault();
 *               signIn({inputs: {username: 'user', password: 'pass'}});
 *             }}>
 *               <button type="submit" disabled={isLoading}>
 *                 {isLoading ? 'Signing in...' : 'Sign In'}
 *               </button>
 *             </form>
 *           )}
 *         </div>
 *       )}
 *     </SignIn>
 *   );
 * };
 * ```
 */
const SignIn: FC<SignInProps> = ({
  className,
  preferences,
  size = 'medium',
  onSuccess,
  onError,
  variant,
  children,
  revalidateOnChangeAfterBlur,
}: SignInProps): ReactElement => {
  const {applicationId, afterSignInUrl, signIn, isInitialized, isLoading, meta, getStorageManager, scopes, vendor} =
    useThunderID();
  const {t} = useTranslation(preferences?.i18n);

  // State management for the flow
  const [components, setComponents] = useState<EmbeddedFlowComponent[]>([]);
  const [additionalData, setAdditionalData] = useState<Record<string, any>>({});
  // Server-side validation errors from the most recent flow response. Updated on every
  // submission; cleared when the next submission begins so stale errors don't linger.
  const [serverFieldErrors, setServerFieldErrors] = useState<FieldError[] | null>(null);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const challengeTokenRef: any = useRef<string | null>(null);
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [isFlowInitialized, setIsFlowInitialized] = useState(false);
  const [flowError, setFlowError] = useState<Error | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTimeoutDisabled, setIsTimeoutDisabled] = useState<boolean>(false);
  const [passkeyState, setPasskeyState] = useState<PasskeyState>({
    actionId: null,
    challenge: null,
    creationOptions: null,
    error: null,
    executionId: null,
    isActive: false,
  });
  const initializationAttemptedRef: any = useRef(false);
  const oauthCodeProcessedRef: any = useRef(false);
  const passkeyProcessedRef: any = useRef(false);
  // Deadline this component has already auto-submitted for, so a re-run of the timeout effect
  // cannot submit the same expired step twice.
  const timeoutSubmittedForRef = useRef<number | null>(null);
  // The timeout effect is keyed on the deadline alone, so a step that arrives carrying the same
  // deadline would otherwise leave the pending timer holding the previous step's context.
  const timeoutContextRef = useRef<{
    components: EmbeddedFlowComponent[];
    hasConsentPrompt: boolean;
    submit: (payload: EmbeddedSignInFlowRequest) => Promise<void>;
  } | null>(null);
  /**
   * Sets executionId between sessionStorage and state.
   * This ensures both are always in sync.
   */
  const setExecutionId = (executionId: string | null): void => {
    setCurrentExecutionId(executionId);
    if (executionId) {
      sessionStorage.setItem(`${vendor}_execution_id`, executionId);
    } else {
      sessionStorage.removeItem(`${vendor}_execution_id`);
    }
  };

  /**
   * Restore any challenge token persisted before an OAuth redirect.
   * Waits for SDK initialization before reading from storage.
   */
  useEffect(() => {
    if (!isInitialized) return;

    (async (): Promise<void> => {
      try {
        const storageManager: any = await getStorageManager();
        const tempData: any = await storageManager?.getTemporaryData();
        if (tempData?.challengeToken) {
          challengeTokenRef.current = tempData.challengeToken as string;
        }
      } finally {
        setIsStorageReady(true);
      }
    })();
  }, [isInitialized]);

  /**
   * Updates challengeTokenRef immediately (stale-closure safe) and persists via
   * the provider's StorageManager so the token survives OAuth redirects.
   */
  const setChallengeToken = async (challengeToken: string | null): Promise<void> => {
    challengeTokenRef.current = challengeToken;
    try {
      const storageManager: any = await getStorageManager();
      if (storageManager) {
        if (challengeToken) {
          await storageManager.setTemporaryDataParameter('challengeToken', challengeToken);
        } else {
          await storageManager.removeTemporaryDataParameter('challengeToken');
        }
      }
    } catch {
      logger.warn('Failed to persist challenge token in storage.');
    }
  };

  /**
   * Clear all flow-related storage and state.
   */
  const clearFlowState = async (): Promise<void> => {
    // Clear the expired flow state to prevent rendering a stale form with a null executionId.
    // Kept before the first await so callers that do not await this function still apply the
    // reset in one batch, ahead of the setError that follows.
    setExecutionId(null);
    setComponents([]);
    setAdditionalData({});
    setIsFlowInitialized(false);
    await setChallengeToken(null);
    try {
      const storageManager: any = await getStorageManager();
      await storageManager?.removeHybridDataParameter?.('authId');
    } catch {
      logger.warn('Failed to clear authId from hybrid storage.');
    }
    setIsTimeoutDisabled(false);
    // Reset refs to allow new flows to start properly
    oauthCodeProcessedRef.current = false;
  };

  /**
   * Parse URL parameters used in flows.
   */
  const getUrlParams = (): any => {
    const urlParams: any = new URL(window?.location?.href ?? '').searchParams;

    return {
      applicationId: urlParams.get('applicationId'),
      authId: urlParams.get('authId'),
      code: urlParams.get('code'),
      error: urlParams.get('error'),
      errorDescription: urlParams.get('error_description'),
      executionId: urlParams.get('executionId'),
      nonce: urlParams.get('nonce'),
      state: urlParams.get('state'),
    };
  };

  /**
   * Handle authId from URL and persist it via the storage manager so it survives URL cleanup.
   * ThunderIDReactClient.signIn() reads authId from storageManager.getHybridDataParameter('authId'),
   * not from raw sessionStorage, so we must use the same storage path here.
   */
  const handleAuthId = async (authId: string | null): Promise<void> => {
    if (authId) {
      try {
        const storageManager: any = await getStorageManager();
        await storageManager?.setHybridDataParameter?.('authId', authId);
      } catch {
        logger.warn('Failed to store authId in hybrid storage.');
      }
    }
  };

  /**
   * Clean up OAuth-related URL parameters from the browser URL.
   */
  const cleanupOAuthUrlParams = (includeNonce = false): void => {
    if (!window?.location?.href) return;
    const url: any = new URL(window.location.href);
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    if (includeNonce) {
      url.searchParams.delete('nonce');
    }
    window?.history?.replaceState({}, '', url.toString());
  };

  /**
   * Clean up flow-related URL parameters (executionId, authId) from the browser URL.
   * Used after executionId is set in state to prevent using invalidated executionId from URL.
   */
  const cleanupFlowUrlParams = (): void => {
    if (!window?.location?.href) return;
    const url: any = new URL(window.location.href);
    url.searchParams.delete('executionId');
    url.searchParams.delete('authId');
    url.searchParams.delete('applicationId');
    window?.history?.replaceState({}, '', url.toString());
  };

  /**
   * Set error state and call onError callback.
   * Ensures isFlowInitialized is true so errors can be displayed in the UI.
   */
  const setError = (error: Error): void => {
    setFlowError(error);
    setIsFlowInitialized(true);
    onError?.(error);
  };

  /**
   * Handle OAuth error from URL parameters.
   * Clears flow state, creates error, and cleans up URL.
   */
  const handleOAuthError = (error: string, errorDescription: string | null): void => {
    clearFlowState();
    const errorMessage: any = errorDescription || `OAuth error: ${error}`;
    const err: any = new ThunderIDRuntimeError(errorMessage, 'SIGN_IN_ERROR', 'react');
    setError(err);
    cleanupOAuthUrlParams(true);
  };

  /**
   * Handle REDIRECTION response by storing flow state and redirecting to OAuth provider.
   */
  const handleRedirection = async (response: EmbeddedSignInFlowResponse): Promise<boolean> => {
    if (response.type === EmbeddedSignInFlowType.Redirection) {
      const redirectURL: any = (response.data as any)?.redirectURL || (response as any)?.redirectURL;

      if (redirectURL && window?.location) {
        if (response.executionId) {
          setExecutionId(response.executionId);
        }
        await setChallengeToken(response.challengeToken ?? null);

        const urlParams: any = getUrlParams();
        await handleAuthId(urlParams.authId);

        initiateOAuthRedirect(redirectURL, vendor);
        return true;
      }
    }
    return false;
  };

  /**
   * Handle ERROR and COMPLETE responses. Returns true if fully handled.
   * ERROR + executionId: recoverable — session preserved for retry.
   * ERROR + no executionId: terminal — clear state and surface the error.
   */
  const handleTerminalResponse = async (response: EmbeddedSignInFlowResponse): Promise<boolean> => {
    if (response.flowStatus === EmbeddedSignInFlowStatus.Error) {
      // Propagate OAuth error to the client
      if (response.redirectUrl && window?.location) {
        setIsSubmitting(false);
        await clearFlowState();
        cleanupOAuthUrlParams(true);
        onError?.(new Error(extractErrorMessage(response, t)));
        window.location.href = response.redirectUrl;

        return true;
      }

      if (response.executionId) {
        // Recoverable: session still alive. Show inline error without firing onError.
        setExecutionId(response.executionId);
        await setChallengeToken(response.challengeToken ?? null);
        setIsFlowInitialized(true);
        setFlowError(new Error(extractErrorMessage(response, t)));
        return true;
      }
      // Terminal: backend invalidated the session — clear all state.
      await clearFlowState();
      setError(new Error(extractErrorMessage(response, t)));
      cleanupFlowUrlParams();
      return true;
    }

    if (response.flowStatus === EmbeddedSignInFlowStatus.Complete) {
      // Get redirectUrl from response (from /oauth2/auth/callback) or fall back to afterSignInUrl
      const redirectUrl: any = (response as any)?.redirectUrl || (response as any)?.redirect_uri;
      const finalRedirectUrl: any = redirectUrl || afterSignInUrl;

      // Clear submitting state before redirect
      setIsSubmitting(false);

      // Clear all OAuth-related storage on successful completion
      setExecutionId(null);
      await setChallengeToken(null);
      setIsFlowInitialized(false);
      sessionStorage.removeItem(`${vendor}_execution_id`);
      try {
        const storageManager: any = await getStorageManager();
        await storageManager?.removeHybridDataParameter?.('authId');
      } catch {
        logger.warn('Failed to clear authId from hybrid storage after completion.');
      }

      // Clean up OAuth URL params before redirect
      cleanupOAuthUrlParams(true);

      if (onSuccess) {
        onSuccess({
          redirectUrl: finalRedirectUrl,
          ...(response.data || {}),
        });
      }

      if (finalRedirectUrl && window?.location) {
        window.location.href = finalRedirectUrl;
      }

      return true;
    }

    return false;
  };

  /**
   * Initialize the authentication flow.
   * Priority: executionId > applicationId (from context) > applicationId (from URL)
   */
  const initializeFlow = async (): Promise<void> => {
    const urlParams: any = getUrlParams();

    // Reset OAuth code processed ref when starting a new flow
    oauthCodeProcessedRef.current = false;
    // Clear stale serverFieldErrors so the new flow doesn't inherit them via render-prop.
    setServerFieldErrors(null);

    await handleAuthId(urlParams.authId);

    const effectiveApplicationId: any = applicationId || urlParams.applicationId;

    // On a page refresh the executionId is no longer in the URL (it is scrubbed by
    // cleanupFlowUrlParams after the first load). Fall back to the executionId persisted in
    // sessionStorage so the in-progress flow can be resumed instead of starting a new flow.
    // This is required for authorization_code apps where direct new-flow initiation is blocked
    // server-side and the flow must be initiated through the OAuth /authorize endpoint.
    const storedExecutionId: any = !urlParams.executionId ? sessionStorage.getItem(`${vendor}_execution_id`) : null;
    const resumeExecutionId: any = urlParams.executionId || storedExecutionId;

    if (!resumeExecutionId && !effectiveApplicationId) {
      const error: any = new ThunderIDRuntimeError(
        'Either executionId or applicationId is required for authentication',
        'SIGN_IN_ERROR',
        'react',
      );
      setError(error);
      throw error;
    }

    try {
      setFlowError(null);

      let response: EmbeddedSignInFlowResponse;

      if (resumeExecutionId) {
        try {
          response = (await signIn({
            executionId: resumeExecutionId,
            ...(challengeTokenRef.current ? {challengeToken: challengeTokenRef.current} : {}),
          })) as EmbeddedSignInFlowResponse;
        } catch (resumeError) {
          // Only treat a stale/expired session (HTTP 400 from the server, meaning the stored
          // executionId is no longer valid) as a recoverable condition. Transient failures
          // such as 5xx server errors or network errors are rethrown so they surface correctly.
          const isStaleSession: boolean =
            storedExecutionId &&
            resumeExecutionId === storedExecutionId &&
            resumeError instanceof ThunderIDAPIError &&
            resumeError.statusCode === 400;

          if (isStaleSession) {
            setExecutionId(null);
            try {
              const storageManager: any = await getStorageManager();
              await storageManager?.removeHybridDataParameter?.('authId');
            } catch {
              logger.warn('Failed to clear authId from hybrid storage.');
            }
            if (!effectiveApplicationId) {
              const expiredError: any = new ThunderIDRuntimeError(
                t('errors.signin.session.expired') ||
                  'Your session has expired. Please return to the application and sign in again.',
                'SIGN_IN_ERROR',
                'react',
              );
              setError(expiredError);
              return;
            }
            response = (await signIn({
              applicationId: effectiveApplicationId,
              flowType: EmbeddedFlowType.Authentication,
              ...(scopes && {scopes}),
            })) as EmbeddedSignInFlowResponse;
          } else {
            throw resumeError;
          }
        }
      } else {
        response = (await signIn({
          applicationId: effectiveApplicationId,
          flowType: EmbeddedFlowType.Authentication,
          ...(scopes && {scopes}),
        })) as EmbeddedSignInFlowResponse;
      }

      if (await handleRedirection(response)) {
        return;
      }

      // Handle a flow that completes (or errors) on the very first step — e.g. a reused SSO
      // session lets the backend return COMPLETE immediately with no UI components. Without
      // this the UI would fall through with no components and spin forever.
      if (await handleTerminalResponse(response)) {
        // Only reset the init gate for unrecoverable Error responses so the user can retry;
        // Complete-without-redirect would otherwise kick off a fresh flow unintentionally.
        if (response.flowStatus === EmbeddedSignInFlowStatus.Error && !response.executionId) {
          initializationAttemptedRef.current = false;
        }
        return;
      }

      const {
        executionId: normalizedExecutionId,
        components: normalizedComponents,
        additionalData: normalizedAdditionalData,
      } = normalizeFlowResponse(
        response,
        t,
        {
          resolveTranslations: false,
        },
        meta,
      );

      await setChallengeToken(response.challengeToken ?? null);

      if (normalizedExecutionId && normalizedComponents) {
        setExecutionId(normalizedExecutionId);
        setComponents(normalizedComponents);
        setAdditionalData(normalizedAdditionalData ?? {});
        setIsFlowInitialized(true);
        setIsTimeoutDisabled(false);
        // Clean up executionId from URL after setting it in state
        cleanupFlowUrlParams();
      }
    } catch (error) {
      const err: any = error;
      await clearFlowState();

      setError(err instanceof ThunderIDRuntimeError ? err : new Error(extractErrorMessage(err, t)));
      initializationAttemptedRef.current = false;
    }
  };

  /**
   * Initialize the flow and handle cleanup of stale flow state.
   */
  useEffect(() => {
    const urlParams: any = getUrlParams();

    // Check for OAuth error in URL
    if (urlParams.error) {
      handleOAuthError(urlParams.error, urlParams.errorDescription);
      return;
    }

    handleAuthId(urlParams.authId);

    // Skip OAuth code processing - let the dedicated OAuth useEffect handle it
    // No action needed here as the dedicated useEffect will handle it
  }, []);

  useEffect(() => {
    // Only initialize if we're not processing an OAuth callback or submission.
    // Wait for isStorageReady so the challenge token is restored from storage before
    // we attempt to resume a persisted executionId — the server requires it.
    const currentUrlParams: any = getUrlParams();
    if (
      isInitialized &&
      isStorageReady &&
      !isLoading &&
      !isFlowInitialized &&
      !initializationAttemptedRef.current &&
      !currentExecutionId &&
      !currentUrlParams.code &&
      !currentUrlParams.state &&
      !isSubmitting &&
      !oauthCodeProcessedRef.current
    ) {
      initializationAttemptedRef.current = true;
      initializeFlow();
    }
  }, [isInitialized, isStorageReady, isLoading, isFlowInitialized, currentExecutionId]);

  /**
   * Handle form submission from BaseSignIn or render props.
   */
  const handleSubmit = async (payload: EmbeddedSignInFlowRequest): Promise<void> => {
    // Use executionId from payload if available, otherwise fall back to currentExecutionId
    const effectiveExecutionId: any = payload.executionId || currentExecutionId;

    if (!effectiveExecutionId) {
      throw new Error('No active flow ID');
    }

    const processedInputs: Record<string, any> = {...payload.inputs};

    // Read and strip the sentinel up front so it can never reach the wire as an input
    const consentReason: string | undefined = processedInputs[CONSENT_REASON_KEY];
    delete processedInputs[CONSENT_REASON_KEY];

    // Auto-compile consent decisions if we are currently on a consent prompt step
    if (additionalData?.['consentPrompt']) {
      try {
        const consentPromptRawData: any = additionalData['consentPrompt'];
        const purposes: any[] =
          typeof consentPromptRawData === 'string'
            ? JSON.parse(consentPromptRawData)
            : consentPromptRawData.purposes || consentPromptRawData;

        // Find the action component to determine if it was a deny action
        let isDeny = false;
        if (payload.action) {
          // Flatten components to find the action
          const findAction = (comps: any[]): any => {
            if (!comps || comps.length === 0) return null;

            const found: any = comps.find((c: any) => c.id === payload.action);
            if (found) return found;

            return comps.reduce((acc: any, c: any) => {
              if (acc) return acc;
              if (c.components) return findAction(c.components);
              return null;
            }, null);
          };

          const submitAction: any = findAction(components);

          if (submitAction && submitAction.variant?.toLowerCase() !== 'primary') {
            isDeny = true;
          }
        }

        // An expired prompt is never an approval, whichever action carried the submission
        if (consentReason === ConsentConstants.REASON_TIMEOUT) {
          isDeny = true;
        }

        // An explicit denial carries a reason too, so the server never has to infer one
        const reason: string | undefined = consentReason ?? (isDeny ? ConsentConstants.REASON_USER_DENIED : undefined);

        const decisions: any = {
          approved: !isDeny,
          ...(reason ? {reason} : {}),
          purposes: purposes.map((p: any) => ({
            approved: !isDeny,
            elements: [
              ...(p.essential || []).map((e: any) => ({
                approved: !isDeny,
                name: e.name,
              })),
              ...(p.optional || []).map((e: any) => {
                const key = `__consent_opt__${p.purposeId}__${e.name}`;
                return {
                  approved: !isDeny && processedInputs[key] === 'true',
                  name: e.name,
                };
              }),
            ],
            purposeName: p.purposeName,
          })),
        };
        processedInputs['consent_decisions'] = JSON.stringify(decisions);

        // Cleanup temporary consent tracking fields from inputs
        Object.keys(processedInputs).forEach((key: string) => {
          if (key.startsWith('__consent_opt__')) {
            delete processedInputs[key];
          }
        });
      } catch (e) {
        // Failed to construct consent_decisions payload automatically
      }
    }

    try {
      setIsSubmitting(true);
      setFlowError(null);
      // Clear any field errors from the previous response before the new round-trip.
      setServerFieldErrors(null);

      const response: EmbeddedSignInFlowResponse = (await signIn({
        executionId: effectiveExecutionId,
        ...payload,
        inputs: processedInputs,
        ...(challengeTokenRef.current ? {challengeToken: challengeTokenRef.current} : {}),
      })) as EmbeddedSignInFlowResponse;

      if (await handleRedirection(response)) {
        return;
      }
      if (
        response.data?.additionalData?.['passkeyChallenge'] ||
        response.data?.additionalData?.['passkeyCreationOptions']
      ) {
        const {passkeyChallenge, passkeyCreationOptions}: any = response.data.additionalData;
        const effectiveExecutionIdForPasskey: any = response.executionId || effectiveExecutionId;

        // Reset passkey processed ref to allow processing
        passkeyProcessedRef.current = false;

        await setChallengeToken(response.challengeToken ?? null);

        // Set passkey state to trigger the passkey
        setPasskeyState({
          actionId: 'submit',
          challenge: passkeyChallenge,
          creationOptions: passkeyCreationOptions,
          error: null,
          executionId: effectiveExecutionIdForPasskey,
          isActive: true,
        });
        setIsSubmitting(false);

        return;
      }

      // Handle terminal flow statuses before normalization.
      if (await handleTerminalResponse(response)) {
        return;
      }

      const {
        executionId: normalizedExecutionId,
        components: normalizedComponents,
        additionalData: normalizedAdditionalData,
      } = normalizeFlowResponse(
        response,
        t,
        {
          resolveTranslations: false,
        },
        meta,
      );

      // Always update challenge token on any INCOMPLETE response — token rotates every step.
      await setChallengeToken(response.challengeToken ?? null);

      // Update executionId if response contains a new one
      if (normalizedExecutionId && normalizedComponents) {
        setExecutionId(normalizedExecutionId);
        setComponents(normalizedComponents);
        setAdditionalData(normalizedAdditionalData ?? {});
        setIsTimeoutDisabled(false);
        // Ensure flow is marked as initialized when we have components
        setIsFlowInitialized(true);
        // Clean up executionId from URL after setting it in state
        cleanupFlowUrlParams();

        // Surface server-side validation failures so BaseSignIn can inject them into
        // the form-level fieldErrors state used by the render-prop / default UI.
        const responseFieldErrors: FieldError[] | undefined = (response.data as any)?.fieldErrors;
        if (responseFieldErrors && responseFieldErrors.length > 0) {
          setServerFieldErrors(responseFieldErrors);
        }

        // Display error from INCOMPLETE response
        if ((response as any)?.error) {
          setFlowError(new Error(extractErrorMessage(response, t)));
        }
      }
    } catch (error) {
      const err: any = error;
      await clearFlowState();

      setError(err instanceof ThunderIDRuntimeError ? err : new Error(extractErrorMessage(err, t)));
      return;
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle step timeout if configured in additionalData.
   *
   * An expired consent prompt is auto-submitted as a denial carrying the timeout reason, because its
   * actions no longer lead anywhere and the user would otherwise be stranded on the prompt. The
   * server discards those decisions and records nothing. Every other kind of step surfaces the
   * expiry error instead.
   */
  timeoutContextRef.current = {
    components,
    hasConsentPrompt: Boolean(additionalData?.['consentPrompt']),
    submit: handleSubmit,
  };

  useEffect(() => {
    const timeoutMs: number = Number(additionalData?.['stepTimeout']) || 0;
    if (timeoutMs <= 0 || !isFlowInitialized) {
      setIsTimeoutDisabled(false);
      return undefined;
    }

    const handleTimeout = (): void => {
      setIsTimeoutDisabled(true);

      const expiredError = (): Error =>
        new Error(t('errors.signin.timeout') || 'Time allowed to complete the step has expired.');

      // Read through the ref so the timer always sees the step that is on screen when it fires
      const context = timeoutContextRef.current;
      const actionId: string | undefined = context?.hasConsentPrompt
        ? findConsentSubmitActionId(context.components)
        : undefined;

      // Without an action the prompt node cannot be routed, so there is nothing to submit
      if (actionId && context && timeoutSubmittedForRef.current !== timeoutMs) {
        timeoutSubmittedForRef.current = timeoutMs;
        context
          .submit({action: actionId, inputs: {[CONSENT_REASON_KEY]: ConsentConstants.REASON_TIMEOUT}})
          .catch(() => setError(expiredError()));
        return;
      }

      setError(expiredError());
    };

    const timerId: ReturnType<typeof setTimeout> = setTimeout(handleTimeout, Math.max(0, timeoutMs - Date.now()));

    return () => clearTimeout(timerId);
  }, [additionalData?.['stepTimeout'], isFlowInitialized, t]);

  /**
   * Handle authentication errors.
   */
  const handleError = (error: Error): void => {
    setError(error);
  };

  useOAuthCallback({
    currentExecutionId,
    executionIdStorageKey: `${vendor}_execution_id`,
    isInitialized: isInitialized && !isLoading && isStorageReady,
    isSubmitting,
    onError: (err: any) => {
      clearFlowState();
      setError(err instanceof Error ? err : new Error(String(err)));
    },
    onSubmit: async (payload: any) => handleSubmit({executionId: payload.executionId, inputs: payload.inputs}),
    processedRef: oauthCodeProcessedRef,
    setExecutionId,
  });

  /**
   * Handle passkey authentication/registration when passkey state becomes active.
   * This effect auto-triggers the browser passkey popup and submits the result.
   */
  useEffect(() => {
    if (
      !passkeyState.isActive ||
      (!passkeyState.challenge && !passkeyState.creationOptions) ||
      !passkeyState.executionId
    ) {
      return;
    }

    // Prevent re-processing
    if (passkeyProcessedRef.current) {
      return;
    }
    passkeyProcessedRef.current = true;

    const performPasskeyProcess = async (): Promise<void> => {
      let inputs: Record<string, string>;

      if (passkeyState.challenge) {
        const passkeyResponse: any = await handlePasskeyAuthentication(passkeyState.challenge);
        const passkeyResponseObj: any = JSON.parse(passkeyResponse);

        inputs = {
          authenticatorData: passkeyResponseObj.response.authenticatorData,
          clientDataJSON: passkeyResponseObj.response.clientDataJSON,
          credentialId: passkeyResponseObj.id,
          signature: passkeyResponseObj.response.signature,
          userHandle: passkeyResponseObj.response.userHandle,
        };
      } else if (passkeyState.creationOptions) {
        const passkeyResponse: any = await handlePasskeyRegistration(passkeyState.creationOptions);
        const passkeyResponseObj: any = JSON.parse(passkeyResponse);

        inputs = {
          attestationObject: passkeyResponseObj.response.attestationObject,
          clientDataJSON: passkeyResponseObj.response.clientDataJSON,
          credentialId: passkeyResponseObj.id,
        };
      } else {
        throw new Error('No passkey challenge or creation options available');
      }

      await handleSubmit({
        executionId: passkeyState.executionId ?? undefined,
        inputs,
      });
    };

    performPasskeyProcess()
      .then(() => {
        setPasskeyState({
          actionId: null,
          challenge: null,
          creationOptions: null,
          error: null,
          executionId: null,
          isActive: false,
        });
      })
      .catch((error: any) => {
        setPasskeyState((prev: any) => ({...prev, error: error as Error, isActive: false}));
        setFlowError(error as Error);
        onError?.(error as Error);
      });
  }, [passkeyState.isActive, passkeyState.challenge, passkeyState.creationOptions, passkeyState.executionId]);

  if (children) {
    // Collapse the server FieldError[] array to a single message per field map for
    // render-prop consumers. First error per field wins. Multi-error cases per
    // field are rare in practice (server typically returns one rule failure per
    // field in current flows) and consumers needing the full array can still read
    // it from the raw flow response.
    const renderPropFieldErrors: Record<string, string> = {};
    if (serverFieldErrors) {
      for (const fe of serverFieldErrors) {
        if (!(fe.identifier in renderPropFieldErrors)) {
          renderPropFieldErrors[fe.identifier] = fe.message;
        }
      }
    }

    const renderProps: SignInRenderProps = {
      additionalData,
      components,
      error: flowError,
      fieldErrors: renderPropFieldErrors,
      initialize: initializeFlow,
      isInitialized: isFlowInitialized,
      isLoading: isLoading || isSubmitting || !isInitialized,
      isTimeoutDisabled,
      meta,
      onSubmit: handleSubmit,
    };

    return <>{children(renderProps)}</>;
  }
  // Otherwise, render the default BaseSignIn component
  return (
    <BaseSignIn
      additionalData={additionalData}
      components={components}
      isLoading={isLoading || !isInitialized || !isFlowInitialized}
      isTimeoutDisabled={isTimeoutDisabled}
      onSubmit={handleSubmit}
      onError={handleError}
      error={flowError}
      className={className}
      size={size}
      variant={variant}
      preferences={preferences}
      revalidateOnChangeAfterBlur={revalidateOnChangeAfterBlur}
      serverFieldErrors={serverFieldErrors}
    />
  );
};

export default SignIn;
