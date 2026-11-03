// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  compileConsentDecisions,
  ConsentConstants,
  EmbeddedFlowType,
  EmbeddedSignInFlowStatus,
  EmbeddedSignInFlowType,
  ThunderIDAPIError,
  ThunderIDRuntimeError,
  executeEmbeddedDeviceGrantFlow,
} from '@thunderid/browser';
import type {
  ConsentPurposeData,
  EmbeddedFlowComponent,
  EmbeddedSignInFlowRequest,
  FlowMetadataResponse,
} from '@thunderid/browser';
import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {FC, ReactElement, ReactNode} from 'react';
import BaseDeviceGrant, {type BaseDeviceGrantProps, type DeviceGrantResult} from './BaseDeviceGrant';
import useThunderID from '../../../contexts/ThunderID/useThunderID';
import {useOAuthCallback} from '../../../hooks/auth/useOAuthCallback';
import useTranslation from '../../../hooks/useTranslation';
import {extractErrorMessage, normalizeFlowResponse} from '../../../utils/flowTransformer';
import {initiateOAuthRedirect} from '../../../utils/oauth';

type EmbeddedDeviceGrantFlowResponse = Awaited<ReturnType<typeof executeEmbeddedDeviceGrantFlow>>;
type DeviceGrantFieldError = NonNullable<EmbeddedDeviceGrantFlowResponse['data']['fieldErrors']>[number];

const toDeviceGrantError = (cause: unknown, fallbackMessage: string): Error => {
  if (cause instanceof ThunderIDAPIError || cause instanceof ThunderIDRuntimeError) return cause;
  return new ThunderIDRuntimeError(
    cause instanceof Error ? cause.message : fallbackMessage,
    'DEVICE_GRANT_ERROR',
    'react',
    cause,
  );
};

/** Values exposed to consumers that provide custom Device Grant UI. */
export interface DeviceGrantRenderProps {
  /** Additional values returned for the active flow step. */
  additionalData: Record<string, unknown>;
  /** Components returned by the configured flow. */
  components: EmbeddedFlowComponent[];
  /** Current flow error, when one needs to be shown. */
  error: Error | null;
  /** First server validation message for each field. */
  fieldErrors: Record<string, string>;
  /** Values prefilled from the verification URI. */
  initialValues: Record<string, string>;
  /** Whether a flow request is in progress. */
  isLoading: boolean;
  /** Whether the active flow step has expired. */
  isTimeoutDisabled: boolean;
  /** Flow metadata used to resolve application-specific template values. */
  meta: FlowMetadataResponse | null;
  /** Submits user-code input or continues the active flow. */
  onSubmit: (payload: EmbeddedSignInFlowRequest) => Promise<void>;
  /** Terminal flow result when the flow has no configured prompt to render. */
  result: DeviceGrantResult;
}

export type DeviceGrantProps = Omit<
  BaseDeviceGrantProps,
  'children' | 'components' | 'error' | 'initialValues' | 'isLoading' | 'onSubmit' | 'result' | 'serverFieldErrors'
> & {
  /** Render props for Gate or other consumers that provide their own flow UI. */
  children?: (props: DeviceGrantRenderProps) => ReactNode;
  onComplete?: (response: EmbeddedDeviceGrantFlowResponse) => void;
};

const clearVerificationParameters = (): void => {
  if (!window.location.href) return;
  const url = new URL(window.location.href);
  url.searchParams.delete('user_code');
  url.searchParams.delete('applicationId');
  window.history.replaceState(window.history.state, '', url.toString());
};

const hasUserCodeInput = (components: EmbeddedFlowComponent[]): boolean =>
  components.some(
    (component: EmbeddedFlowComponent) =>
      component.ref === 'user_code' || (Array.isArray(component.components) && hasUserCodeInput(component.components)),
  );

const findAction = (components: EmbeddedFlowComponent[], actionId: string): EmbeddedFlowComponent | undefined => {
  for (const component of components) {
    if (component.id === actionId) return component;
    if (component.components) {
      const nestedAction = findAction(component.components, actionId);
      if (nestedAction) return nestedAction;
    }
  }
  return undefined;
};

const parseConsentPurposes = (value: unknown): ConsentPurposeData[] | null => {
  let parsed: unknown = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return null;
    }
  }
  if (Array.isArray(parsed)) return parsed as ConsentPurposeData[];
  if (typeof parsed === 'object' && parsed !== null && 'purposes' in parsed && Array.isArray(parsed.purposes)) {
    return parsed.purposes as ConsentPurposeData[];
  }
  return null;
};

const CONSENT_REASON_KEY = '__consent_reason__';

const flattenComponents = (items: EmbeddedFlowComponent[]): EmbeddedFlowComponent[] =>
  items.flatMap((component: EmbeddedFlowComponent) => [component, ...flattenComponents(component.components ?? [])]);

const findConsentSubmitActionId = (items: EmbeddedFlowComponent[]): string | undefined => {
  const actions: EmbeddedFlowComponent[] = flattenComponents(items).filter(
    (component: EmbeddedFlowComponent) => component.id && component.eventType?.toUpperCase() === 'SUBMIT',
  );
  return (
    actions.find((component: EmbeddedFlowComponent) => component.variant?.toLowerCase() !== 'primary') ?? actions[0]
  )?.id;
};

const compileConsentInputs = (
  inputs: Record<string, unknown>,
  actionId: string | undefined,
  components: EmbeddedFlowComponent[],
  additionalData: Record<string, unknown>,
): Record<string, unknown> => {
  const action = actionId ? findAction(components, actionId) : undefined;
  const purposes = parseConsentPurposes(additionalData['consentPrompt']);
  const consentReason: unknown = inputs[CONSENT_REASON_KEY];
  const cleanInputs: Record<string, unknown> = {...inputs};
  delete cleanInputs[CONSENT_REASON_KEY];
  const isSubmitAction = Boolean(action && action.eventType?.toUpperCase() !== 'TRIGGER');
  const isTimeout = consentReason === ConsentConstants.REASON_TIMEOUT;
  const isDeny = isTimeout || Boolean(action && isSubmitAction && action.variant?.toLowerCase() !== 'primary');

  return compileConsentDecisions(cleanInputs, isSubmitAction ? purposes : null, {
    approved: !isDeny,
    ...(isTimeout
      ? {reason: ConsentConstants.REASON_TIMEOUT}
      : isDeny
        ? {reason: ConsentConstants.REASON_USER_DENIED}
        : {}),
  });
};

/**
 * Runs the application's configured Device Grant flow and exposes its state for custom renderers.
 */
const DeviceGrant: FC<DeviceGrantProps> = ({
  children = undefined,
  className = '',
  onComplete = undefined,
  onError = undefined,
  preferences = {},
  size = 'medium',
  variant = 'default',
  ...baseProps
}: DeviceGrantProps): ReactElement => {
  const {
    applicationId,
    baseUrl,
    getStorageManager,
    isInitialized,
    isLoading: sdkLoading,
    meta,
    vendor,
  } = useThunderID();
  const {t} = useTranslation(preferences?.i18n);
  const [components, setComponents] = useState<EmbeddedFlowComponent[]>([]);
  const [additionalData, setAdditionalData] = useState<Record<string, unknown>>({});
  const [initialValues, setInitialValues] = useState<Record<string, string>>({});
  const [serverFieldErrors, setServerFieldErrors] = useState<
    EmbeddedDeviceGrantFlowResponse['data']['fieldErrors'] | null
  >(null);
  const [executionId, setExecutionId] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [isStorageReady, setIsStorageReady] = useState(false);
  const challengeTokenRef = useRef('');
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(() => {
    if (
      typeof window !== 'undefined' &&
      ['code', 'state', 'error'].some((parameter: string) => new URL(window.location.href).searchParams.has(parameter))
    ) {
      return false;
    }
    if (applicationId) return true;
    return typeof window !== 'undefined' && Boolean(new URL(window.location.href).searchParams.get('applicationId'));
  });
  const [result, setResult] = useState<DeviceGrantResult>(null);
  const [isTimeoutDisabled, setIsTimeoutDisabled] = useState(false);
  const flowStartAttempted = useRef(false);
  const verificationParametersRead = useRef(false);
  const oauthCodeProcessedRef = useRef(false);
  const executionIdStorageKey = `${vendor}_device_grant_execution_id`;

  useEffect(() => {
    if (!isInitialized || sdkLoading) return;
    void (async (): Promise<void> => {
      try {
        const storageManager = await getStorageManager?.();
        const temporaryData = await storageManager?.getTemporaryData();
        const storedChallengeToken = temporaryData?.['challengeToken'];
        if (typeof storedChallengeToken === 'string') {
          challengeTokenRef.current = storedChallengeToken;
          setChallengeToken(storedChallengeToken);
        }
      } catch {
        // Flow continuation can still proceed without a cached token if the server permits it.
      } finally {
        setIsStorageReady(true);
      }
    })();
  }, [getStorageManager, isInitialized, sdkLoading]);

  const persistExecutionId = useCallback(
    (id: string | null): void => {
      setExecutionId(id ?? '');
      if (id) sessionStorage.setItem(executionIdStorageKey, id);
      else sessionStorage.removeItem(executionIdStorageKey);
    },
    [executionIdStorageKey],
  );

  const persistChallengeToken = useCallback(
    async (token: string | null): Promise<void> => {
      challengeTokenRef.current = token ?? '';
      setChallengeToken(token ?? '');
      try {
        const storageManager = await getStorageManager();
        if (storageManager) {
          if (token) await storageManager.setTemporaryDataParameter('challengeToken', token);
          else await storageManager.removeTemporaryDataParameter('challengeToken');
        }
      } catch {
        // The in-memory value is still available for same-page flow continuation.
      }
    },
    [getStorageManager],
  );

  const handleError = useCallback(
    (flowError: Error): void => {
      setComponents([]);
      setAdditionalData({});
      setServerFieldErrors(null);
      setError(flowError);
      setResult('failure');
      onError?.(flowError);
    },
    [onError],
  );

  const applyResponse = useCallback(
    async (response: EmbeddedDeviceGrantFlowResponse): Promise<void> => {
      const redirectURL =
        (response.data as Record<string, unknown> | undefined)?.['redirectURL'] ?? response.redirectUrl;
      if (response.type === EmbeddedSignInFlowType.Redirection && typeof redirectURL === 'string') {
        persistExecutionId(response.executionId ?? null);
        await persistChallengeToken(response.challengeToken ?? null);
        initiateOAuthRedirect(redirectURL, vendor);
        return;
      }

      const normalized = normalizeFlowResponse(
        response,
        t,
        {
          throwOnError: false,
          resolveTranslations: false,
        },
        meta,
      );
      persistExecutionId(
        response.flowStatus === EmbeddedSignInFlowStatus.Incomplete ? (response.executionId ?? null) : null,
      );
      await persistChallengeToken(
        response.flowStatus === EmbeddedSignInFlowStatus.Incomplete ? (response.challengeToken ?? null) : null,
      );
      setComponents(normalized.components);
      setAdditionalData(normalized.additionalData);
      setIsTimeoutDisabled(false);
      setServerFieldErrors(response.data?.fieldErrors ?? null);
      setError(response.error ? new Error(extractErrorMessage(response, t)) : null);

      if (response.flowStatus === EmbeddedSignInFlowStatus.Complete) {
        setResult('success');
        onComplete?.(response);
        return;
      }

      if (response.flowStatus === EmbeddedSignInFlowStatus.Error) {
        const flowError = new ThunderIDRuntimeError(
          extractErrorMessage(response, t, 'deviceGrant.messages.failed'),
          'DEVICE_GRANT_ERROR',
          'react',
        );
        setError(flowError);
        setResult('failure');
        onError?.(flowError);
        return;
      }

      setResult(null);
    },
    [meta, onComplete, onError, persistChallengeToken, persistExecutionId, t, vendor],
  );

  const startFlow = useCallback(
    async (appId: string, resumeId?: string): Promise<void> => {
      setIsLoading(true);
      setError(null);
      try {
        const challengeFromStorage = challengeTokenRef.current;
        let response: EmbeddedDeviceGrantFlowResponse;
        try {
          response = await executeEmbeddedDeviceGrantFlow({
            baseUrl,
            payload: resumeId
              ? {executionId: resumeId, ...(challengeFromStorage ? {challengeToken: challengeFromStorage} : {})}
              : {applicationId: appId, flowType: EmbeddedFlowType.DeviceGrant, inputs: {}},
          });
        } catch (resumeError) {
          if (resumeId && resumeError instanceof ThunderIDAPIError && resumeError.statusCode === 400) {
            persistExecutionId(null);
            await persistChallengeToken(null);
            throw new ThunderIDRuntimeError(t('deviceGrant.errors.continue'), 'DEVICE_GRANT_ERROR', 'react');
          }
          throw resumeError;
        }
        if (!resumeId) clearVerificationParameters();
        await applyResponse(response);
      } catch (flowError) {
        handleError(toDeviceGrantError(flowError, t('deviceGrant.errors.continue')));
      } finally {
        setIsLoading(false);
      }
    },
    [applyResponse, baseUrl, handleError, persistChallengeToken, persistExecutionId, t],
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!verificationParametersRead.current) {
      verificationParametersRead.current = true;
      const userCode = url.searchParams.get('user_code') ?? '';
      if (userCode) setInitialValues({user_code: userCode});
    }

    const applicationIdFromUrl = url.searchParams.get('applicationId');
    const appId = applicationIdFromUrl?.trim() ? applicationIdFromUrl : applicationId;
    const storedExecutionId = sessionStorage.getItem(executionIdStorageKey);
    const hasOAuthCallback =
      url.searchParams.has('code') || url.searchParams.has('state') || url.searchParams.has('error');
    if (!isInitialized || sdkLoading || !isStorageReady || hasOAuthCallback || oauthCodeProcessedRef.current) return;
    if (flowStartAttempted.current) return;
    if (!appId && !storedExecutionId) {
      flowStartAttempted.current = true;
      handleError(new ThunderIDRuntimeError(t('deviceGrant.errors.start'), 'DEVICE_GRANT_ERROR', 'react'));
      return;
    }

    flowStartAttempted.current = true;
    void startFlow(appId ?? '', storedExecutionId ?? undefined);
  }, [applicationId, executionIdStorageKey, handleError, isInitialized, isStorageReady, sdkLoading, startFlow, t]);

  const submit = async (payload: EmbeddedSignInFlowRequest, actionId?: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      if (!executionId) return;

      const action = payload.action ?? actionId;
      const inputs = compileConsentInputs(payload.inputs ?? {}, action, components, additionalData);
      if (!hasUserCodeInput(components)) inputs['user_code'] = undefined;

      const response = await executeEmbeddedDeviceGrantFlow({
        baseUrl,
        payload: {
          action,
          challengeToken: challengeTokenRef.current || challengeToken,
          executionId,
          inputs,
        },
      });
      await applyResponse(response);
    } catch (flowError) {
      handleError(toDeviceGrantError(flowError, t('deviceGrant.errors.continue')));
    } finally {
      setIsLoading(false);
    }
  };

  const timeoutContextRef = useRef<{
    components: EmbeddedFlowComponent[];
    hasConsentPrompt: boolean;
    submit: typeof submit;
  }>({components: [], hasConsentPrompt: false, submit});
  timeoutContextRef.current = {components, hasConsentPrompt: Boolean(additionalData['consentPrompt']), submit};
  const timeoutSubmittedForRef = useRef<number | null>(null);

  useEffect(() => {
    const timeoutMs = Number(additionalData['stepTimeout']) || 0;
    if (timeoutMs <= 0 || !executionId) {
      setIsTimeoutDisabled(false);
      return undefined;
    }

    const timerId = setTimeout(
      () => {
        setIsTimeoutDisabled(true);
        const expiredError = new ThunderIDRuntimeError(
          t('errors.signin.timeout') || 'Time allowed to complete the step has expired.',
          'DEVICE_GRANT_ERROR',
          'react',
        );
        const context = timeoutContextRef.current;
        const actionId = context.hasConsentPrompt ? findConsentSubmitActionId(context.components) : undefined;
        if (actionId && timeoutSubmittedForRef.current !== timeoutMs) {
          timeoutSubmittedForRef.current = timeoutMs;
          void context.submit({action: actionId, inputs: {[CONSENT_REASON_KEY]: ConsentConstants.REASON_TIMEOUT}});
          return;
        }
        handleError(expiredError);
      },
      Math.max(0, timeoutMs - Date.now()),
    );

    return () => clearTimeout(timerId);
  }, [additionalData, executionId, handleError, t]);

  useOAuthCallback({
    currentExecutionId: executionId || null,
    executionIdStorageKey,
    isInitialized: isInitialized && !sdkLoading && isStorageReady,
    isSubmitting: isLoading,
    onError: (callbackError: unknown) => {
      persistExecutionId(null);
      void persistChallengeToken(null);
      handleError(toDeviceGrantError(callbackError, String(callbackError)));
    },
    onFlowChange: (response: EmbeddedDeviceGrantFlowResponse) => void applyResponse(response),
    onSubmit: async ({executionId: callbackExecutionId, inputs}) => {
      setIsLoading(true);
      try {
        return await executeEmbeddedDeviceGrantFlow({
          baseUrl,
          payload: {
            challengeToken: challengeTokenRef.current || challengeToken,
            executionId: callbackExecutionId,
            inputs,
          },
        });
      } finally {
        setIsLoading(false);
      }
    },
    processedRef: oauthCodeProcessedRef,
    setExecutionId: persistExecutionId,
  });

  const handleBaseSubmit = (payload: EmbeddedSignInFlowRequest, component: EmbeddedFlowComponent): Promise<void> =>
    submit(payload, component.id);

  const fieldErrors = useMemo<Record<string, string>>(() => {
    const errors: Record<string, string> = {};
    (serverFieldErrors ?? []).forEach((fieldError: DeviceGrantFieldError) => {
      if (!(fieldError.identifier in errors)) errors[fieldError.identifier] = fieldError.message;
    });

    return errors;
  }, [serverFieldErrors]);

  if (children) {
    return (
      <>
        {children({
          additionalData,
          components,
          error,
          fieldErrors,
          initialValues,
          isLoading,
          isTimeoutDisabled,
          meta,
          onSubmit: submit,
          result,
        })}
      </>
    );
  }

  return (
    <BaseDeviceGrant
      {...baseProps}
      className={className}
      components={components}
      additionalData={additionalData}
      error={error}
      initialValues={initialValues}
      isLoading={isLoading}
      isTimeoutDisabled={isTimeoutDisabled}
      onError={handleError}
      onSubmit={handleBaseSubmit}
      preferences={preferences}
      result={result}
      serverFieldErrors={serverFieldErrors}
      size={size}
      variant={variant}
    />
  );
};

export default DeviceGrant;
