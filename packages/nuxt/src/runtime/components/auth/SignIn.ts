// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {navigateTo} from '#app';
import {
  CONSENT_INVALID_KEY_PREFIX,
  CONSENT_MODIFIED_KEY_PREFIX,
  ConsentConstants,
  getConsentElementDecision,
  ThunderIDRuntimeError,
  type ConsentPurposeData,
  type EmbeddedFlowComponent,
  EmbeddedFlowType,
  type EmbeddedSignInFlowRequest,
  type EmbeddedSignInFlowResponse,
  EmbeddedSignInFlowStatus,
  EmbeddedSignInFlowType,
  type FlowMetadataResponse,
} from '@thunderid/browser';
import {
  BaseSignIn,
  extractErrorMessage,
  handlePasskeyAuthentication,
  handlePasskeyRegistration,
  initiateOAuthRedirect,
  normalizeFlowResponse,
  useFlowMeta,
  useI18n,
  useOAuthCallback,
  type OAuthCallbackPayload,
} from '@thunderid/vue';
import {
  type Component,
  type PropType,
  type Ref,
  type SetupContext,
  type VNode,
  defineComponent,
  h,
  onUnmounted,
  ref,
  watch,
} from 'vue';
import {useThunderID} from '#imports';

interface PasskeyState {
  actionId: string | null;
  challenge: string | null;
  creationOptions: string | null;
  error: Error | null;
  executionId: string | null;
  isActive: boolean;
}

/**
 * Render props passed to the default scoped slot for custom UI rendering.
 */
export interface SignInRenderProps {
  additionalData?: Record<string, any>;
  components: EmbeddedFlowComponent[];
  error: Error | null;
  initialize: () => Promise<void>;
  isInitialized: boolean;
  isLoading: boolean;
  isTimeoutDisabled?: boolean;
  meta: FlowMetadataResponse | null;
  onSubmit: (payload: EmbeddedSignInFlowRequest) => Promise<void>;
}

/**
 * Nuxt-specific SignIn container for the embedded (app-native) sign-in flow.
 *
 * Unlike `BaseSignUp` (which drives its own flow lifecycle internally),
 * `BaseSignIn` from `@thunderid/vue` is a pure rendering component: it only
 * ever calls `props.onSubmit` and expects the caller to own flow state
 * (`components`, `executionId`, loading/error) and pass it down as props.
 * This container is that owner, mirroring the Vue SDK's `SignIn` container
 * almost line-for-line, with two Nuxt-specific differences:
 *
 * 1. All navigation goes through Nuxt's `navigateTo` instead of
 *    `window.location`, so redirects work correctly during SSR.
 * 2. Flow completion is detected via the synthesized
 *    `{ flowStatus: Complete }` response from the Nuxt `useThunderID().signIn`
 *    composable (the server has already consumed the flow assertion and set
 *    the session cookie in `signin.post.ts`), not a `redirectUrl` field.
 *
 * @example
 * ```vue
 * <SignIn @success="onSignIn" @error="onError" />
 * ```
 */
const SignIn: Component = defineComponent({
  emits: ['error', 'success'],
  name: 'SignIn',
  props: {
    className: {default: '', type: String},
    size: {
      default: 'medium',
      type: String as PropType<'small' | 'medium' | 'large'>,
    },
    variant: {
      default: 'outlined',
      type: String as PropType<'elevated' | 'outlined' | 'flat'>,
    },
  },
  setup(
    props: Readonly<{className: string; size: 'small' | 'medium' | 'large'; variant: 'elevated' | 'outlined' | 'flat'}>,
    {slots, emit, attrs}: SetupContext,
  ): () => VNode | null {
    const {
      applicationId,
      afterSignInUrl,
      signIn,
      isInitialized,
      isLoading: sdkLoading,
      scopes,
      getStorageManager,
      vendor,
    } = useThunderID();
    const {meta: flowMeta} = useFlowMeta();
    const {t} = useI18n();

    const executionIdStorageKey = `${vendor}_execution_id`;

    // Flow state
    const components: Ref<EmbeddedFlowComponent[]> = ref([]);
    const additionalData: Ref<Record<string, any>> = ref({});
    const currentExecutionId: Ref<string | null> = ref(null);
    const challengeTokenRef: {current: string | null} = {current: null};
    const isFlowInitialized: Ref<boolean> = ref(false);
    const flowError: Ref<Error | null> = ref(null);
    const isSubmitting: Ref<boolean> = ref(false);
    const isTimeoutDisabled: Ref<boolean> = ref(false);
    const passkeyState: Ref<PasskeyState> = ref({
      actionId: null,
      challenge: null,
      creationOptions: null,
      error: null,
      executionId: null,
      isActive: false,
    });

    // Track one-time initialization and OAuth processing
    let initializationAttempted = false;
    const oauthCodeProcessedFlag: {value: boolean} = {value: false};
    let passkeyProcessed = false;

    // ── Helpers ──────────────────────────────────────────────────────────

    const persistExecutionId = (executionId: string | null): void => {
      currentExecutionId.value = executionId;
      if (!import.meta.client) return;
      if (executionId) {
        sessionStorage.setItem(executionIdStorageKey, executionId);
      } else {
        sessionStorage.removeItem(executionIdStorageKey);
      }
    };

    const clearFlowState = async (): Promise<void> => {
      persistExecutionId(null);
      isFlowInitialized.value = false;
      await setChallengeToken(null);
      const sm = getStorageManager?.();
      if (sm) {
        await sm.removeHybridDataParameter('authId');
      }
      isTimeoutDisabled.value = false;
      oauthCodeProcessedFlag.value = false;
    };

    interface UrlParams {
      applicationId: string | null;
      authId: string | null;
      code: string | null;
      error: string | null;
      errorDescription: string | null;
      executionId: string | null;
      nonce: string | null;
      state: string | null;
    }

    const emptyUrlParams: UrlParams = {
      applicationId: null,
      authId: null,
      code: null,
      error: null,
      errorDescription: null,
      executionId: null,
      nonce: null,
      state: null,
    };

    // `window` is unavailable during SSR — every caller falls back to empty params.
    const getUrlParams = (): UrlParams => {
      if (!import.meta.client) return emptyUrlParams;
      const params: URLSearchParams = new URLSearchParams(window?.location?.search ?? '');
      return {
        applicationId: params.get('applicationId'),
        authId: params.get('authId'),
        code: params.get('code'),
        error: params.get('error'),
        errorDescription: params.get('error_description'),
        executionId: params.get('executionId'),
        nonce: params.get('nonce'),
        state: params.get('state'),
      };
    };

    const cleanupOAuthUrlParams = (): void => {
      if (!import.meta.client || !window?.location?.href) return;
      const url: URL = new URL(window.location.href);
      ['error', 'error_description', 'code', 'state', 'nonce'].forEach((p: string) => url.searchParams.delete(p));
      window.history.replaceState({}, '', url.toString());
    };

    const cleanupFlowUrlParams = (): void => {
      if (!import.meta.client || !window?.location?.href) return;
      const url: URL = new URL(window.location.href);
      ['executionId', 'authId', 'applicationId'].forEach((p: string) => url.searchParams.delete(p));
      window.history.replaceState({}, '', url.toString());
    };

    const setError = (error: Error): void => {
      flowError.value = error;
      isFlowInitialized.value = true;
      emit('error', error);
    };

    /**
     * Updates challengeTokenRef immediately and persists via the provider's
     * StorageManager so the token survives OAuth redirects.
     */
    const setChallengeToken = async (challengeToken: string | null): Promise<void> => {
      challengeTokenRef.current = challengeToken;
      if (!import.meta.client) return;
      try {
        const sm = getStorageManager?.();
        if (sm) {
          if (challengeToken) {
            await sm.setTemporaryDataParameter('challengeToken', challengeToken);
          } else {
            await sm.removeTemporaryDataParameter('challengeToken');
          }
        }
      } catch {
        // Ignore storage failures; the in-memory ref still has the current value.
      }
    };

    // ── Flow completion — establishes redirect via afterSignInUrl ──────────
    // The Nuxt `signIn()` composable synthesizes `{authData: {}, flowStatus:
    // Complete}` once the server has consumed the flow assertion and set the
    // session cookie (see `signin.post.ts`); there is no `redirectUrl` field
    // to read here (unlike the pure-client Vue/React flow), so the redirect
    // target is always `afterSignInUrl`.
    const handleComplete = async (authData: Record<string, any>): Promise<void> => {
      emit('success', authData);
      persistExecutionId(null);
      isFlowInitialized.value = false;

      if (!afterSignInUrl) return;

      if (import.meta.client) {
        const url: URL = new URL(afterSignInUrl as string, window.location.origin);
        Object.entries(authData || {}).forEach(([key, value]: [string, any]) => {
          if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value));
          }
        });
        await navigateTo(url.pathname + url.search + url.hash);
      } else {
        await navigateTo(afterSignInUrl as string);
      }
    };

    // ── Flow initialization ───────────────────────────────────────────────

    const initializeFlow = async (): Promise<void> => {
      const urlParams: UrlParams = getUrlParams();

      oauthCodeProcessedFlag.value = false;

      // Restore any challenge token persisted before an OAuth redirect.
      if (import.meta.client) {
        try {
          const sm = getStorageManager?.();
          const tempData: any = await sm?.getTemporaryData?.();
          if (tempData?.challengeToken) {
            challengeTokenRef.current = tempData.challengeToken as string;
          }
        } catch {
          // Ignore — the flow will re-fetch a fresh challengeToken from the next response.
        }
      }

      if (urlParams.authId) {
        const sm = getStorageManager?.();
        if (sm) {
          await sm.setHybridDataParameter('authId', urlParams.authId);
        }
      }

      const effectiveApplicationId: string | null | undefined = applicationId || urlParams.applicationId;

      // Reported through `error` (state, event and render props) only: the flow is started from a watcher, where a
      // thrown error would go unhandled.
      if (!urlParams.executionId && !effectiveApplicationId) {
        setError(
          new ThunderIDRuntimeError(
            'Either executionId or applicationId is required for authentication',
            'SIGN_IN_ERROR',
            'nuxt',
          ),
        );
        return;
      }

      try {
        flowError.value = null;

        const response: EmbeddedSignInFlowResponse = (
          urlParams.executionId
            ? await signIn({executionId: urlParams.executionId})
            : await signIn({
                applicationId: effectiveApplicationId,
                flowType: EmbeddedFlowType.Authentication,
                ...(scopes && {scopes}),
              })
        ) as EmbeddedSignInFlowResponse;

        if (response.flowStatus === EmbeddedSignInFlowStatus.Complete) {
          isFlowInitialized.value = true;
          await handleComplete((response as any).authData || {});
          return;
        }

        // Handle OAuth redirect types
        if (response.type === EmbeddedSignInFlowType.Redirection) {
          const redirectURL: string | undefined = (response.data as any)?.redirectURL || (response as any)?.redirectURL;
          if (redirectURL && import.meta.client) {
            if (response.executionId) persistExecutionId(response.executionId);
            if (urlParams.authId) {
              const sm = getStorageManager?.();
              if (sm) {
                await sm.setHybridDataParameter('authId', urlParams.authId);
              }
            }
            initiateOAuthRedirect(redirectURL, vendor);
            return;
          }
        }

        const {
          executionId: normalizedExecutionId,
          components: normalizedComponents,
          additionalData: normalizedAdditionalData,
        } = normalizeFlowResponse(response, t, {resolveTranslations: false}, flowMeta.value);

        if (normalizedExecutionId && normalizedComponents) {
          await setChallengeToken(response.challengeToken ?? null);
          persistExecutionId(normalizedExecutionId);
          components.value = normalizedComponents;
          additionalData.value = normalizedAdditionalData ?? {};
          isFlowInitialized.value = true;
          isTimeoutDisabled.value = false;
          cleanupFlowUrlParams();
        }
      } catch (error: unknown) {
        const err: any = error as any;
        clearFlowState();
        setError(new Error(extractErrorMessage(err, t)));
        initializationAttempted = false;
      }
    };

    // ── Submit handler ────────────────────────────────────────────────────

    const handleSubmit = async (payload: EmbeddedSignInFlowRequest): Promise<void> => {
      const effectiveExecutionId: string | null = payload.executionId || currentExecutionId.value;

      if (!effectiveExecutionId) {
        throw new Error('No active flow ID');
      }

      const processedInputs: Record<string, any> = {...payload.inputs};

      // Auto-compile consent decisions if on a consent prompt step
      if (additionalData.value?.['consentPrompt']) {
        try {
          const consentRaw: any = additionalData.value['consentPrompt'];
          const purposes: ConsentPurposeData[] =
            typeof consentRaw === 'string' ? JSON.parse(consentRaw) : consentRaw.purposes || consentRaw;

          let isDeny = false;
          if (payload.action) {
            const findAction = (comps: any[]): any => {
              if (!comps?.length) return null;
              const found: any = comps.find((c: any) => c.id === payload.action);
              if (found) return found;
              return comps.reduce((acc: any, c: any) => acc || (c.components ? findAction(c.components) : null), null);
            };
            const submitAction: any = findAction(components.value as any[]);
            if (submitAction && submitAction.variant?.toLowerCase() !== 'primary') {
              isDeny = true;
            }
          }

          const decisions: Record<string, unknown> = {
            approved: !isDeny,
            ...(isDeny ? {reason: ConsentConstants.REASON_USER_DENIED} : {}),
            purposes: purposes.map((p) => ({
              approved: !isDeny,
              elements: [
                ...(p.essential ?? []).map((e) => ({approved: !isDeny, name: e.name})),
                ...(p.optional ?? []).map((e) => {
                  const key = `__consent_opt__${p.purposeId}__${e.name}`;
                  return getConsentElementDecision(
                    p.purposeId,
                    e,
                    !isDeny && processedInputs[key] === 'true',
                    processedInputs,
                  );
                }),
              ],
              purposeName: p.purposeName,
            })),
          };
          processedInputs['consent_decisions'] = JSON.stringify(decisions);

          Object.keys(processedInputs).forEach((key: string) => {
            if (
              key.startsWith('__consent_opt__') ||
              key.startsWith(CONSENT_MODIFIED_KEY_PREFIX) ||
              key.startsWith(CONSENT_INVALID_KEY_PREFIX)
            ) {
              delete processedInputs[key];
            }
          });
        } catch {
          // Ignore consent construction failures
        }
      }

      try {
        isSubmitting.value = true;
        flowError.value = null;

        const response: EmbeddedSignInFlowResponse = (await signIn({
          executionId: effectiveExecutionId,
          ...(challengeTokenRef.current ? {challengeToken: challengeTokenRef.current} : {}),
          ...payload,
          inputs: processedInputs,
        })) as EmbeddedSignInFlowResponse;

        // Handle OAuth redirect
        if (response.type === EmbeddedSignInFlowType.Redirection) {
          const redirectURL: string | undefined = (response.data as any)?.redirectURL || (response as any)?.redirectURL;
          if (redirectURL && import.meta.client) {
            if (response.executionId) persistExecutionId(response.executionId);
            const urlParams: UrlParams = getUrlParams();
            if (urlParams.authId) {
              const sm = getStorageManager?.();
              if (sm) {
                await sm.setHybridDataParameter('authId', urlParams.authId);
              }
            }
            initiateOAuthRedirect(redirectURL, vendor);
            return;
          }
        }

        // Handle passkey challenge in response
        if (
          response.data?.additionalData?.['passkeyChallenge'] ||
          response.data?.additionalData?.['passkeyCreationOptions']
        ) {
          const {passkeyChallenge, passkeyCreationOptions} = response.data.additionalData as any;
          passkeyProcessed = false;
          passkeyState.value = {
            actionId: 'submit',
            challenge: passkeyChallenge || null,
            creationOptions: passkeyCreationOptions || null,
            error: null,
            executionId: response.executionId || effectiveExecutionId,
            isActive: true,
          };
          isSubmitting.value = false;
          return;
        }

        // Handle error flow status
        if (response.flowStatus === EmbeddedSignInFlowStatus.Error) {
          clearFlowState();
          const err: Error = new Error(extractErrorMessage(response, t));
          setError(err);
          cleanupFlowUrlParams();
          throw err;
        }

        // Handle flow completion
        if (response.flowStatus === EmbeddedSignInFlowStatus.Complete) {
          isSubmitting.value = false;
          await setChallengeToken(null);
          await handleComplete((response as any).authData || {});
          return;
        }

        await setChallengeToken(response.challengeToken ?? null);

        const {
          executionId: normalizedExecutionId,
          components: normalizedComponents,
          additionalData: normalizedAdditionalData,
        } = normalizeFlowResponse(response, t, {resolveTranslations: false}, flowMeta.value);

        // Update flow state for next step
        if (normalizedExecutionId && normalizedComponents) {
          persistExecutionId(normalizedExecutionId);
          components.value = normalizedComponents;
          additionalData.value = normalizedAdditionalData ?? {};
          isTimeoutDisabled.value = false;
          isFlowInitialized.value = true;
          cleanupFlowUrlParams();

          if ((response as any)?.error) {
            flowError.value = new Error(extractErrorMessage(response, t));
          }
        }
      } catch (error: unknown) {
        const err: any = error as any;
        if (err instanceof Error && flowError.value === err) {
          // Already set; re-throw
          throw err;
        }
        clearFlowState();
        setError(new Error(extractErrorMessage(err, t)));
      } finally {
        isSubmitting.value = false;
      }
    };

    // ── Step timeout ──────────────────────────────────────────────────────

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    const scheduleTimeout = (timeoutMs: number): void => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (timeoutMs <= 0 || !isFlowInitialized.value) {
        isTimeoutDisabled.value = false;
        return;
      }
      const remaining: number = Math.max(0, Math.floor((timeoutMs - Date.now()) / 1000));
      if (remaining <= 0) {
        isTimeoutDisabled.value = true;
        setError(new Error(t('errors.signin.timeout') || 'Time allowed to complete the step has expired.'));
        return;
      }
      timeoutHandle = setTimeout(() => {
        isTimeoutDisabled.value = true;
        setError(new Error(t('errors.signin.timeout') || 'Time allowed to complete the step has expired.'));
      }, remaining * 1000);
    };

    watch(
      () => [additionalData.value?.['stepTimeout'], isFlowInitialized.value] as [number | undefined, boolean],
      ([timeoutMs]: [number | undefined, boolean]) => {
        scheduleTimeout(Number(timeoutMs) || 0);
      },
    );

    onUnmounted(() => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    });

    // ── Passkey processing ────────────────────────────────────────────────

    watch(
      () => passkeyState.value,
      async (state: PasskeyState) => {
        if (!state.isActive || (!state.challenge && !state.creationOptions) || !state.executionId) return;
        if (passkeyProcessed) return;
        passkeyProcessed = true;

        try {
          let inputs: Record<string, string>;

          if (state.challenge) {
            const passkeyResponse: string = await handlePasskeyAuthentication(state.challenge);
            const obj: any = JSON.parse(passkeyResponse);
            inputs = {
              authenticatorData: obj.response.authenticatorData,
              clientDataJSON: obj.response.clientDataJSON,
              credentialId: obj.id,
              signature: obj.response.signature,
              userHandle: obj.response.userHandle,
            };
          } else if (state.creationOptions) {
            const passkeyResponse: string = await handlePasskeyRegistration(state.creationOptions);
            const obj: any = JSON.parse(passkeyResponse);
            inputs = {
              attestationObject: obj.response.attestationObject,
              clientDataJSON: obj.response.clientDataJSON,
              credentialId: obj.id,
            };
          } else {
            throw new Error('No passkey challenge or creation options available');
          }

          await handleSubmit({executionId: state.executionId, inputs});

          passkeyState.value = {
            actionId: null,
            challenge: null,
            creationOptions: null,
            error: null,
            executionId: null,
            isActive: false,
          };
        } catch (error: unknown) {
          const err: Error = error as Error;
          passkeyState.value = {...passkeyState.value, error: err, isActive: false};
          flowError.value = err;
          emit('error', err);
        }
      },
      {deep: true},
    );

    // ── OAuth callback (via composable) ─────────────────────────────────

    useOAuthCallback({
      currentFlowId: currentExecutionId,
      flowIdStorageKey: executionIdStorageKey,
      isInitialized,
      isSubmitting,
      onError: (err: any) => {
        // Guard against double-processing when handleSubmit already set the error
        if (!flowError.value) {
          clearFlowState();
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      },
      onSubmit: (payload: OAuthCallbackPayload) => handleSubmit({executionId: payload.flowId, inputs: payload.inputs}),
      processedFlag: oauthCodeProcessedFlag,
      setFlowId: persistExecutionId,
    });

    // Initialize flow when SDK is ready (OAuth callback is handled by useOAuthCallback)
    watch(
      () =>
        [
          isInitialized.value,
          sdkLoading?.value ?? false,
          isFlowInitialized.value,
          currentExecutionId.value,
          isSubmitting.value,
        ] as [boolean, boolean, boolean, string | null, boolean],
      ([initialized, loading, flowInit, executionId, submitting]: [
        boolean,
        boolean,
        boolean,
        string | null,
        boolean,
      ]) => {
        const urlParams: UrlParams = getUrlParams();
        const hasOAuthCode = !!urlParams.code;
        const hasOAuthState = !!urlParams.state;

        // Initialize flow when SDK is ready and no flow is active
        if (
          initialized &&
          !loading &&
          !flowInit &&
          !initializationAttempted &&
          !executionId &&
          !hasOAuthCode &&
          !hasOAuthState &&
          !submitting &&
          !oauthCodeProcessedFlag.value
        ) {
          initializationAttempted = true;
          initializeFlow();
        }
      },
      {immediate: true},
    );

    // ── Render ────────────────────────────────────────────────────────────

    return (): VNode | null => {
      const combinedIsLoading: boolean = (sdkLoading?.value ?? false) || isSubmitting.value || !isInitialized.value;

      // Scoped slot / render props pattern
      if (slots['default']) {
        const renderProps: SignInRenderProps = {
          additionalData: additionalData.value,
          components: components.value,
          error: flowError.value,
          initialize: initializeFlow,
          isInitialized: isFlowInitialized.value,
          isLoading: combinedIsLoading,
          isTimeoutDisabled: isTimeoutDisabled.value,
          meta: flowMeta.value,
          onSubmit: handleSubmit,
        };
        return h('div', {}, slots['default'](renderProps));
      }

      // Default BaseSignIn rendering
      return h(BaseSignIn, {
        ...attrs,
        additionalData: additionalData.value,
        class: props.className,
        components: components.value,
        error: flowError.value,
        isLoading: combinedIsLoading || !isFlowInitialized.value,
        isTimeoutDisabled: isTimeoutDisabled.value,
        onError: (err: Error) => emit('error', err),
        onSubmit: handleSubmit,
        size: props.size,
        variant: props.variant,
      });
    };
  },
});

export default SignIn;
