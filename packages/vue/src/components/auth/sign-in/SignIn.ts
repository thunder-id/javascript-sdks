// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  ConsentConstants,
  compileConsentDecisions,
  ThunderIDRuntimeError,
  type ConsentPurposeData,
  EmbeddedFlowComponent,
  EmbeddedFlowType,
  EmbeddedSignInFlowRequest,
  EmbeddedSignInFlowResponse,
  EmbeddedSignInFlowStatus,
  EmbeddedSignInFlowType,
  FlowMetadataResponse,
  isFlowExpiredError,
} from '@thunderid/browser';
import {
  type Component,
  type ComputedRef,
  type PropType,
  type Ref,
  type SetupContext,
  type VNode,
  computed,
  defineComponent,
  h,
  onMounted,
  onUnmounted,
  ref,
  shallowRef,
  watch,
} from 'vue';
import BaseSignIn from './BaseSignIn';
import type {FlowExpiryStep} from '../../../composables/auth/useFlowExpiry';
import useFlowExpiryHandling from '../../../composables/auth/useFlowExpiryHandling';
import type {FlowExpiryRedirect} from '../../../composables/auth/useFlowExpiryRedirect';
import {useOAuthCallback, type OAuthCallbackPayload} from '../../../composables/auth/useOAuthCallback';
import useFlowMeta from '../../../composables/useFlowMeta';
import useI18n from '../../../composables/useI18n';
import useThunderID from '../../../composables/useThunderID';
import {type FlowErrorBuilder, normalizeFlowResponse, resolveFlowError} from '../../../utils/flowTransformer';
import {initiateOAuthRedirect} from '../../../utils/oauth';
import {handlePasskeyAuthentication, handlePasskeyRegistration} from '../../../utils/passkey';

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
  /**
   * The countdown that sends the user back to the application once the flow expires. Set only with
   * `afterFlowExpiredUrl` and while the flow is expired.
   */
  flowExpiryRedirect: FlowExpiryRedirect | null;
  initialize: () => Promise<void>;
  /**
   * Whether the flow execution has expired: its time ran out, or the server refused it as expired. The flow
   * cannot continue: it is started again, or with `afterFlowExpiredUrl` the user is sent back to the application.
   */
  isFlowExpired: boolean;
  /**
   * Whether the flow was started again because the previous one expired, until the user submits a step. Lets
   * the UI tell the user why the form reset.
   */
  isFlowRestarted: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  isTimeoutDisabled?: boolean;
  meta: FlowMetadataResponse | null;
  onSubmit: (payload: EmbeddedSignInFlowRequest) => Promise<void>;
}

/**
 * SignIn — app-native sign-in component with full flow lifecycle management.
 *
 * Initializes the authentication flow, handles passkey authentication/registration,
 * OAuth redirect flows, and renders the UI via `BaseSignIn` or a scoped slot.
 *
 * @example
 * ```vue
 * <!-- Default UI -->
 * <SignIn
 *   @success="(data) => console.log('Authenticated:', data)"
 *   @error="(err) => console.error('Auth failed:', err)"
 * />
 *
 * <!-- Custom UI via scoped slot -->
 * <SignIn v-slot="{ components, onSubmit, isLoading, error }">
 *   <!-- your custom sign-in UI here -->
 * </SignIn>
 * ```
 */
const SignIn: Component = defineComponent({
  name: 'SignIn',
  props: {
    /**
     * Where to send the user once the flow expires, e.g. the application's URL. With it, an expired flow counts
     * down and redirects there. Without it, the flow is started again in place. Set it when the sign-in runs on
     * a page of its own, such as a login portal, rather than inside the application.
     */
    afterFlowExpiredUrl: {default: undefined, type: String},
    className: {default: '', type: String},
    /**
     * Bounds the sign-in to this organization unit: sent as `ouId` on the request that starts the
     * `AUTHENTICATION` flow, and never on a continuation.
     */
    organizationUnitId: {default: undefined, type: String},
    size: {
      default: 'medium',
      type: String as PropType<'small' | 'medium' | 'large'>,
    },
    variant: {
      default: 'outlined',
      type: String as PropType<'elevated' | 'outlined' | 'flat'>,
    },
  },
  emits: ['error', 'success'],
  setup(
    props: Readonly<{
      afterFlowExpiredUrl?: string;
      className: string;
      organizationUnitId?: string;
      size: 'small' | 'medium' | 'large';
      variant: 'elevated' | 'outlined' | 'flat';
    }>,
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
    // Raw source behind the banner, resolved on read so the message follows a language change.
    const flowErrorSource: Ref<unknown> = shallowRef(null);
    const flowError: ComputedRef<Error | null> = computed(() =>
      flowErrorSource.value === null ? null : resolveFlowError(flowErrorSource.value, t),
    );
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

    const flowExpiryStep: Ref<FlowExpiryStep | null> = shallowRef(null);
    // The application the flow was started for. Kept since the URL that carried it is cleaned up, and an
    // expired flow is started again for it.
    const startedApplicationId: Ref<string | null> = ref(null);
    // A flow an authorize request started cannot be started again here: the server refuses to start a sign-in
    // directly for such an application, so the user has to go back to it.
    const isStartedByAuthorizeRequest: Ref<boolean> = ref(false);
    const {
      clearFlowRestarted,
      expireFlow,
      flowExpiryRedirect,
      isFlowExpired,
      isFlowRestarted,
      restartFlow,
      restartsInPlace,
    } = useFlowExpiryHandling({
      afterFlowExpiredUrl: () => props.afterFlowExpiredUrl,
      canRestart: () => Boolean(applicationId || startedApplicationId.value) && !isStartedByAuthorizeRequest.value,
      // Deferred, since the restart is defined further down.
      restart: (): void => {
        void startFlowAgain();
      },
      step: flowExpiryStep,
    });

    // Track one-time initialization and OAuth processing
    let initializationAttempted = false;
    const oauthCodeProcessedFlag: {value: boolean} = {value: false};
    let passkeyProcessed = false;

    // ── Helpers ──────────────────────────────────────────────────────────

    const persistExecutionId = (executionId: string | null): void => {
      currentExecutionId.value = executionId;
      if (executionId) {
        sessionStorage.setItem(executionIdStorageKey, executionId);
      } else {
        sessionStorage.removeItem(executionIdStorageKey);
      }
    };

    /**
     * Persist the authId from the URL against its execution, so another tab's sign-in cannot
     * replace it. ThunderIDVueClient.signIn() reads it back with getFlowAuthId(executionId).
     */
    const storeAuthId = async (authId: string | null, executionId: string | null | undefined): Promise<void> => {
      const sm = getStorageManager();
      if (sm && authId && executionId) {
        await sm.setFlowAuthId(executionId, authId);
      }
    };

    const clearAuthId = async (executionId: string | null | undefined): Promise<void> => {
      const sm = getStorageManager();
      if (sm && executionId) {
        await sm.removeFlowAuthId(executionId);
      }
    };

    const clearFlowState = async (): Promise<void> => {
      const executionIdToClear: string | null = currentExecutionId.value;
      persistExecutionId(null);
      isFlowInitialized.value = false;
      await setChallengeToken(null);
      await clearAuthId(executionIdToClear);
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

    const getUrlParams = (): UrlParams => {
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
      if (!window?.location?.href) return;
      const url: URL = new URL(window.location.href);
      ['error', 'error_description', 'code', 'state', 'nonce'].forEach((p: string) => url.searchParams.delete(p));
      window.history.replaceState({}, '', url.toString());
    };

    const cleanupFlowUrlParams = (): void => {
      if (!window?.location?.href) return;
      const url: URL = new URL(window.location.href);
      ['executionId', 'authId', 'applicationId'].forEach((p: string) => url.searchParams.delete(p));
      window.history.replaceState({}, '', url.toString());
    };

    const setError = (source: unknown): void => {
      flowErrorSource.value = source;
      isFlowInitialized.value = true;
      emit('error', flowError.value);
    };

    const sessionExpiredError: FlowErrorBuilder = (translate) =>
      new ThunderIDRuntimeError(
        translate('errors.signin.session.expired') ||
          'Your session has expired. Please return to the application and sign in again.',
        'SIGN_IN_ERROR',
        'vue',
      );

    /**
     * Marks the flow as expired. Unless the flow is started again in place, the error follows from the expiry,
     * set by the watcher below; once already expired, it is set again here since a new submission clears it.
     */
    const handleFlowExpired = (): void => {
      if (isFlowExpired.value && !restartsInPlace.value) {
        setError(sessionExpiredError);
      } else {
        expireFlow();
      }
    };

    // A flow that starts again in place needs no error: the user only sees the notice on the new flow.
    watch(
      () => isFlowExpired.value && !restartsInPlace.value,
      (isExpiredForGood: boolean) => {
        if (isExpiredForGood) {
          setError(sessionExpiredError);
        }
      },
    );

    /**
     * Updates challengeTokenRef immediately and persists via the provider's
     * StorageManager so the token survives OAuth redirects.
     */
    const setChallengeToken = async (challengeToken: string | null): Promise<void> => {
      challengeTokenRef.current = challengeToken;
      try {
        const sm = getStorageManager();
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

    // ── Flow initialization ───────────────────────────────────────────────

    const initializeFlow = async (): Promise<void> => {
      const urlParams: UrlParams = getUrlParams();

      oauthCodeProcessedFlag.value = false;

      await storeAuthId(urlParams.authId, urlParams.executionId);

      const effectiveApplicationId: string | null | undefined =
        applicationId || urlParams.applicationId || startedApplicationId.value;
      if (effectiveApplicationId) {
        startedApplicationId.value = effectiveApplicationId;
      }
      if (urlParams.authId) {
        isStartedByAuthorizeRequest.value = true;
      }

      if (!urlParams.executionId && !effectiveApplicationId) {
        const err: ThunderIDRuntimeError = new ThunderIDRuntimeError(
          'Either executionId or applicationId is required for authentication',
          'SIGN_IN_ERROR',
          'vue',
        );
        setError(err);
        return;
      }

      try {
        flowErrorSource.value = null;

        let response: EmbeddedSignInFlowResponse;

        if (urlParams.executionId) {
          response = (await signIn({executionId: urlParams.executionId})) as EmbeddedSignInFlowResponse;
        } else {
          response = (await signIn({
            applicationId: effectiveApplicationId,
            flowType: EmbeddedFlowType.Authentication,
            ...(scopes && {scopes}),
            ...(props.organizationUnitId ? {ouId: props.organizationUnitId} : {}),
          })) as EmbeddedSignInFlowResponse;
        }

        // Handle OAuth redirect types
        if (response.type === EmbeddedSignInFlowType.Redirection) {
          const redirectURL: string | undefined = (response.data as any)?.redirectURL || (response as any)?.redirectURL;
          if (redirectURL && window?.location) {
            if (response.executionId) persistExecutionId(response.executionId);
            await storeAuthId(urlParams.authId, response.executionId);
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
          flowExpiryStep.value = {expiresIn: response.expiresIn};
          // The URL's authId belongs to this execution even when the URL had no executionId.
          await storeAuthId(urlParams.authId, normalizedExecutionId);
          cleanupFlowUrlParams();
        }
      } catch (error: unknown) {
        // An execution the server refused as expired takes the same path as any other expiry.
        if (isFlowExpiredError(error)) {
          handleFlowExpired();
          return;
        }
        const err: any = error as any;
        clearFlowState();
        setError(err);
        initializationAttempted = false;
      }
    };

    /**
     * Starts an expired flow again for the application it was started for. The expired execution is dropped
     * from the URL and storage first, so the new flow does not resume it.
     */
    const startFlowAgain = async (): Promise<void> => {
      await clearFlowState();
      cleanupFlowUrlParams();
      flowExpiryStep.value = null;
      await initializeFlow();
    };

    // ── Submit handler ────────────────────────────────────────────────────

    const handleSubmit = async (payload: EmbeddedSignInFlowRequest): Promise<void> => {
      const effectiveExecutionId: string | null = payload.executionId || currentExecutionId.value;

      if (!effectiveExecutionId) {
        throw new Error('No active flow ID');
      }

      let processedInputs: Record<string, any> = {...payload.inputs};

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

          processedInputs = compileConsentDecisions(processedInputs, purposes, {
            approved: !isDeny,
            ...(isDeny ? {reason: ConsentConstants.REASON_USER_DENIED} : {}),
          });
        } catch {
          // Ignore consent construction failures
        }
      }

      clearFlowRestarted();

      try {
        isSubmitting.value = true;
        flowErrorSource.value = null;

        const response: EmbeddedSignInFlowResponse = (await signIn({
          executionId: effectiveExecutionId,
          ...(challengeTokenRef.current ? {challengeToken: challengeTokenRef.current} : {}),
          ...payload,
          inputs: processedInputs,
        })) as EmbeddedSignInFlowResponse;

        // Handle OAuth redirect
        if (response.type === EmbeddedSignInFlowType.Redirection) {
          const redirectURL: string | undefined = (response.data as any)?.redirectURL || (response as any)?.redirectURL;
          if (redirectURL && window?.location) {
            if (response.executionId) persistExecutionId(response.executionId);
            const urlParams: UrlParams = getUrlParams();
            await storeAuthId(urlParams.authId, response.executionId);
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

        await setChallengeToken(response.challengeToken ?? null);

        const {
          executionId: normalizedExecutionId,
          components: normalizedComponents,
          additionalData: normalizedAdditionalData,
        } = normalizeFlowResponse(response, t, {resolveTranslations: false}, flowMeta.value);

        // Handle error flow status
        if (response.flowStatus === EmbeddedSignInFlowStatus.Error) {
          clearFlowState();
          setError(response);
          cleanupFlowUrlParams();
          // flowError is cached, so the catch below recognizes this instance and rethrows it.
          throw flowError.value!;
        }

        // Handle flow completion
        if (response.flowStatus === EmbeddedSignInFlowStatus.Complete) {
          const redirectUrl: string | undefined = (response as any)?.redirectUrl || (response as any)?.redirect_uri;
          const finalRedirectUrl: string | undefined = redirectUrl || afterSignInUrl;

          isSubmitting.value = false;
          persistExecutionId(null);
          isFlowInitialized.value = false;
          await clearAuthId(response.executionId || effectiveExecutionId);
          cleanupOAuthUrlParams();
          await setChallengeToken(null);

          emit('success', {
            redirectUrl: finalRedirectUrl,
            ...(response.data || {}),
          });

          if (finalRedirectUrl && window?.location) {
            window.location.href = finalRedirectUrl;
          }
          return;
        }

        // Update flow state for next step
        if (normalizedExecutionId && normalizedComponents) {
          persistExecutionId(normalizedExecutionId);
          components.value = normalizedComponents;
          additionalData.value = normalizedAdditionalData ?? {};
          isTimeoutDisabled.value = false;
          isFlowInitialized.value = true;
          flowExpiryStep.value = {expiresIn: response.expiresIn};
          cleanupFlowUrlParams();

          if ((response as any)?.error) {
            flowErrorSource.value = response;
          }
        }
      } catch (error: unknown) {
        const err: any = error as any;
        if (err instanceof Error && flowError.value === err) {
          // Already set; re-throw
          throw err;
        }
        if (isFlowExpiredError(err)) {
          handleFlowExpired();
          return;
        }
        clearFlowState();
        setError(err);
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
      const expiredError: FlowErrorBuilder = (translate) =>
        new Error(translate('errors.signin.timeout') || 'Time allowed to complete the step has expired.');
      if (remaining <= 0) {
        isTimeoutDisabled.value = true;
        setError(expiredError);
        return;
      }
      timeoutHandle = setTimeout(() => {
        isTimeoutDisabled.value = true;
        setError(expiredError);
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
          flowErrorSource.value = err;
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

    // ── Lifecycle ─────────────────────────────────────────────────────────

    onMounted(async () => {
      const urlParams: UrlParams = getUrlParams();

      // Restore any challenge token persisted before an OAuth redirect.
      try {
        const sm = getStorageManager();
        const tempData: any = await sm?.getTemporaryData?.();
        if (tempData?.challengeToken) {
          challengeTokenRef.current = tempData.challengeToken as string;
        }
      } catch {
        // Ignore — the flow will re-fetch a fresh challengeToken from the next response.
      }

      await storeAuthId(urlParams.authId, urlParams.executionId);
    });

    // Initialize flow when SDK is ready (OAuth callback is handled by useOAuthCallback)
    watch(
      () =>
        [
          isInitialized.value,
          sdkLoading.value,
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
    );

    // ── Render ────────────────────────────────────────────────────────────

    return (): VNode | null => {
      const combinedIsLoading: boolean = sdkLoading.value || isSubmitting.value || !isInitialized.value;

      // Scoped slot / render props pattern
      if (slots['default']) {
        const renderProps: SignInRenderProps = {
          additionalData: additionalData.value,
          components: components.value,
          error: flowError.value,
          flowExpiryRedirect: flowExpiryRedirect.value,
          initialize: initializeFlow,
          isFlowExpired: isFlowExpired.value,
          isFlowRestarted: isFlowRestarted.value,
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
        flowExpiryRedirect: flowExpiryRedirect.value,
        isFlowExpired: isFlowExpired.value,
        isFlowRestarted: isFlowRestarted.value,
        isLoading: combinedIsLoading || !isFlowInitialized.value,
        isTimeoutDisabled: isTimeoutDisabled.value,
        onError: (err: Error) => emit('error', err),
        onRestart: restartsInPlace.value ? restartFlow : undefined,
        onSubmit: handleSubmit,
        size: props.size,
        variant: props.variant,
      });
    };
  },
});

export default SignIn;
