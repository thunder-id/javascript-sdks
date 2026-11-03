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
  type ConsentPurposeData,
  type EmbeddedDeviceGrantFlowResponse,
  type EmbeddedFlowComponent,
  type EmbeddedSignInFlowRequest,
} from '@thunderid/browser';
import {
  type Component,
  type PropType,
  type Ref,
  type SetupContext,
  type VNode,
  computed,
  defineComponent,
  h,
  onUnmounted,
  ref,
  watch,
} from 'vue';
import BaseDeviceGrant from './BaseDeviceGrant';
import type {BaseDeviceGrantRenderProps, DeviceGrantResult} from './BaseDeviceGrant';
import {useOAuthCallback, type OAuthCallbackPayload} from '../../../composables/auth/useOAuthCallback';
import useFlowMeta from '../../../composables/useFlowMeta';
import useI18n from '../../../composables/useI18n';
import useThunderID from '../../../composables/useThunderID';
import {extractErrorMessage, normalizeFlowResponse} from '../../../utils/flowTransformer';
import {initiateOAuthRedirect} from '../../../utils/oauth';

const toDeviceGrantError = (cause: unknown, fallbackMessage: string): Error => {
  if (cause instanceof ThunderIDAPIError || cause instanceof ThunderIDRuntimeError) return cause;
  return new ThunderIDRuntimeError(
    cause instanceof Error ? cause.message : fallbackMessage,
    'DEVICE_GRANT_ERROR',
    'vue',
    cause,
  );
};

export type DeviceGrantRenderProps = BaseDeviceGrantRenderProps;

interface DeviceGrantProps {
  className: string;
  size: 'small' | 'medium' | 'large';
  variant: 'elevated' | 'outlined' | 'flat';
}

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

/** Runs the application's configured Device Grant flow and exposes its state for custom renderers. */
const DeviceGrant: Component = defineComponent({
  name: 'DeviceGrant',
  props: {
    className: {default: '', type: String},
    size: {default: 'medium', type: String as PropType<'small' | 'medium' | 'large'>},
    variant: {default: 'flat', type: String as PropType<'elevated' | 'outlined' | 'flat'>},
  },
  emits: ['complete', 'error'],
  setup(props: Readonly<DeviceGrantProps>, {emit, slots}: SetupContext): () => VNode {
    const {applicationId, baseUrl, getStorageManager, isInitialized, isLoading: sdkLoading, vendor} = useThunderID();
    const {meta} = useFlowMeta();
    const {t} = useI18n();
    const components = ref<EmbeddedFlowComponent[]>([]);
    const initialValues = ref<Record<string, string>>({});
    const additionalData = ref<Record<string, unknown>>({});
    const serverFieldErrors = ref<EmbeddedDeviceGrantFlowResponse['data']['fieldErrors'] | null>(null);
    const executionId = ref('');
    const challengeToken = ref('');
    const challengeTokenRef: {current: string} = {current: ''};
    const isStorageReady = ref(false);
    const error = ref<Error | null>(null);
    const isLoading = ref(false);
    const isTimeoutDisabled = ref(false);
    const result = ref<DeviceGrantResult>(null);
    const flowStartAttempted = ref(false);
    const executionIdStorageKey = `${vendor}_device_grant_execution_id`;
    const oauthCodeProcessedFlag: {value: boolean} = {value: false};

    const persistExecutionId = (id: string | null): void => {
      executionId.value = id ?? '';
      if (id) sessionStorage.setItem(executionIdStorageKey, id);
      else sessionStorage.removeItem(executionIdStorageKey);
    };

    const persistChallengeToken = async (token: string | null): Promise<void> => {
      challengeTokenRef.current = token ?? '';
      challengeToken.value = token ?? '';
      try {
        const storageManager = getStorageManager?.();
        if (storageManager) {
          if (token) await storageManager.setTemporaryDataParameter('challengeToken', token);
          else await storageManager.removeTemporaryDataParameter('challengeToken');
        }
      } catch {
        // The in-memory value remains available for same-page continuation.
      }
    };

    const handleError = (flowError: Error): void => {
      components.value = [];
      additionalData.value = {};
      serverFieldErrors.value = null;
      error.value = flowError;
      result.value = 'failure';
      emit('error', flowError);
    };

    const applyResponse = async (response: EmbeddedDeviceGrantFlowResponse): Promise<void> => {
      const redirectURL: unknown = response.data?.redirectURL ?? response.redirectUrl;
      if (response.type === EmbeddedSignInFlowType.Redirection && typeof redirectURL === 'string') {
        persistExecutionId(response.executionId ?? null);
        await persistChallengeToken(response.challengeToken ?? null);
        initiateOAuthRedirect(redirectURL, vendor);
        return;
      }

      const normalized = normalizeFlowResponse(response, t, {resolveTranslations: false}, meta.value);
      persistExecutionId(
        response.flowStatus === EmbeddedSignInFlowStatus.Incomplete ? (response.executionId ?? null) : null,
      );
      await persistChallengeToken(
        response.flowStatus === EmbeddedSignInFlowStatus.Incomplete ? (response.challengeToken ?? null) : null,
      );
      components.value = normalized.components ?? [];
      additionalData.value = normalized.additionalData ?? {};
      isTimeoutDisabled.value = false;
      serverFieldErrors.value = response.data?.fieldErrors ?? null;
      error.value = response.error ? new Error(extractErrorMessage(response, t)) : null;

      if (response.flowStatus === EmbeddedSignInFlowStatus.Complete) {
        result.value = 'success';
        emit('complete', response);
        return;
      }
      if (response.flowStatus === EmbeddedSignInFlowStatus.Error) {
        error.value = new ThunderIDRuntimeError(
          extractErrorMessage(response, t, 'deviceGrant.messages.failed'),
          'DEVICE_GRANT_ERROR',
          'vue',
        );
        result.value = 'failure';
        emit('error', error.value);
        return;
      }
      result.value = null;
    };

    const clearVerificationParameters = (): void => {
      const url = new URL(window.location.href);
      url.searchParams.delete('user_code');
      url.searchParams.delete('applicationId');
      window.history.replaceState(window.history.state, '', url.toString());
    };

    const startFlow = async (appId: string, resumeId?: string): Promise<void> => {
      isLoading.value = true;
      error.value = null;
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
        } catch (resumeError: unknown) {
          if (resumeId && resumeError instanceof ThunderIDAPIError && resumeError.statusCode === 400) {
            persistExecutionId(null);
            await persistChallengeToken(null);
            throw new ThunderIDRuntimeError(t('deviceGrant.errors.continue'), 'DEVICE_GRANT_ERROR', 'vue');
          }
          throw resumeError;
        }
        if (!resumeId) clearVerificationParameters();
        await applyResponse(response);
      } catch (cause: unknown) {
        handleError(toDeviceGrantError(cause, t('deviceGrant.errors.continue')));
      } finally {
        isLoading.value = false;
      }
    };

    const submit = async (payload: EmbeddedSignInFlowRequest, actionId?: string): Promise<void> => {
      isLoading.value = true;
      error.value = null;
      result.value = null;
      try {
        if (!executionId.value) return;

        const action = payload.action ?? actionId;
        const inputs: Record<string, unknown> = compileConsentInputs(
          payload.inputs ?? {},
          action,
          components.value,
          additionalData.value,
        );
        if (!hasUserCodeInput(components.value)) delete inputs['user_code'];
        const response = await executeEmbeddedDeviceGrantFlow({
          baseUrl,
          payload: {
            action,
            challengeToken: challengeToken.value,
            executionId: executionId.value,
            inputs,
          },
        });
        await applyResponse(response);
      } catch (cause: unknown) {
        handleError(toDeviceGrantError(cause, t('deviceGrant.errors.continue')));
      } finally {
        isLoading.value = false;
      }
    };

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    let timeoutSubmittedFor: number | null = null;
    watch(
      () => [additionalData.value['stepTimeout'], executionId.value] as const,
      ([stepTimeout, activeExecutionId]: readonly [unknown, string]) => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        timeoutHandle = null;
        const timeoutMs = Number(stepTimeout) || 0;
        if (timeoutMs <= 0 || !activeExecutionId) {
          isTimeoutDisabled.value = false;
          return;
        }

        timeoutHandle = setTimeout(
          () => {
            isTimeoutDisabled.value = true;
            const expiredError = new ThunderIDRuntimeError(
              t('errors.signin.timeout') || 'Time allowed to complete the step has expired.',
              'DEVICE_GRANT_ERROR',
              'vue',
            );
            const actionId = additionalData.value['consentPrompt']
              ? findConsentSubmitActionId(components.value)
              : undefined;
            if (actionId && timeoutSubmittedFor !== timeoutMs) {
              timeoutSubmittedFor = timeoutMs;
              void submit(
                {action: actionId, inputs: {[CONSENT_REASON_KEY]: ConsentConstants.REASON_TIMEOUT}},
                actionId,
              );
              return;
            }
            handleError(expiredError);
          },
          Math.max(0, timeoutMs - Date.now()),
        );
      },
    );
    onUnmounted(() => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    });

    const sdkReady: Ref<boolean> = (isInitialized as Ref<boolean> | undefined) ?? ref(true);
    const sdkIsLoading: Ref<boolean> = (sdkLoading as Ref<boolean> | undefined) ?? ref(false);
    const callbackReady: Ref<boolean> = computed(() => sdkReady.value && !sdkIsLoading.value && isStorageReady.value);

    watch(
      () => [sdkReady.value, sdkIsLoading.value] as const,
      async ([ready, loading]: readonly [boolean, boolean]) => {
        if (!ready || loading || isStorageReady.value) return;
        try {
          const temporaryData = await getStorageManager?.()?.getTemporaryData();
          const storedChallengeToken = temporaryData?.['challengeToken'];
          if (typeof storedChallengeToken === 'string') {
            challengeTokenRef.current = storedChallengeToken;
            challengeToken.value = storedChallengeToken;
          }
        } catch {
          // Flow continuation can still proceed without a cached token if the storage adapter fails.
        } finally {
          isStorageReady.value = true;
        }
      },
      {immediate: true},
    );

    useOAuthCallback({
      currentFlowId: executionId as Ref<string | null>,
      flowIdStorageKey: executionIdStorageKey,
      isInitialized: callbackReady,
      isSubmitting: isLoading,
      onError: (cause: unknown) => {
        persistExecutionId(null);
        void persistChallengeToken(null);
        handleError(toDeviceGrantError(cause, String(cause)));
      },
      onFlowChange: (response: EmbeddedDeviceGrantFlowResponse) => void applyResponse(response),
      onSubmit: async (payload: OAuthCallbackPayload) => {
        isLoading.value = true;
        try {
          return await executeEmbeddedDeviceGrantFlow({
            baseUrl,
            payload: {
              challengeToken: challengeTokenRef.current || challengeToken.value,
              executionId: payload.flowId,
              inputs: payload.inputs,
            },
          });
        } finally {
          isLoading.value = false;
        }
      },
      processedFlag: oauthCodeProcessedFlag,
      setFlowId: persistExecutionId,
    });

    watch(
      () => [sdkReady.value, sdkIsLoading.value, isStorageReady.value] as const,
      async ([ready, loading, storageReady]: readonly [boolean, boolean, boolean]) => {
        if (!ready || loading || !storageReady || flowStartAttempted.value) return;
        const url = new URL(window.location.href);
        const code = url.searchParams.get('user_code');
        if (code) initialValues.value = {user_code: code};

        const applicationIdFromUrl: string | null = url.searchParams.get('applicationId');
        const appId: string | undefined = applicationIdFromUrl?.trim() ? applicationIdFromUrl : applicationId;
        const hasOAuthCallback: boolean =
          url.searchParams.has('code') || url.searchParams.has('state') || url.searchParams.has('error');
        if (hasOAuthCallback || oauthCodeProcessedFlag.value) return;
        const storedExecutionId: string | null = sessionStorage.getItem(executionIdStorageKey);
        if (!appId && !storedExecutionId) {
          flowStartAttempted.value = true;
          const flowError: Error = new ThunderIDRuntimeError(
            t('deviceGrant.errors.start'),
            'DEVICE_GRANT_ERROR',
            'vue',
          );
          error.value = flowError;
          result.value = 'failure';
          emit('error', flowError);
          return;
        }
        if (flowStartAttempted.value) return;

        flowStartAttempted.value = true;
        await startFlow(appId ?? '', storedExecutionId ?? undefined);
      },
      {immediate: true},
    );

    return (): VNode =>
      h(
        BaseDeviceGrant,
        {
          className: props.className,
          components: components.value,
          additionalData: additionalData.value,
          error: error.value,
          initialValues: initialValues.value,
          isLoading: isLoading.value,
          isTimeoutDisabled: isTimeoutDisabled.value,
          onSubmit: (payload: EmbeddedSignInFlowRequest, component: EmbeddedFlowComponent) =>
            submit(payload, component.id),
          result: result.value,
          serverFieldErrors: serverFieldErrors.value,
          size: props.size,
          variant: props.variant,
        },
        slots['default'] ? {default: slots['default']} : undefined,
      );
  },
});

export default DeviceGrant;
