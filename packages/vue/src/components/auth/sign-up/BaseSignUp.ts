// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  EmbeddedFlowComponentType,
  EmbeddedFlowResponseType,
  EmbeddedSignUpFlowStatus,
  FlowMetadataResponse,
  isFlowExpiredError,
  withVendorCSSClassPrefix,
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
  onUnmounted,
  ref,
  shallowRef,
  watch,
} from 'vue';
import useFlowExpiryHandling from '../../../composables/auth/useFlowExpiryHandling';
import type {FlowExpiryRedirect} from '../../../composables/auth/useFlowExpiryRedirect';
import useFlowMeta from '../../../composables/useFlowMeta';
import useI18n from '../../../composables/useI18n';
import {normalizeFlowResponse, resolveFlowError} from '../../../utils/flowTransformer';
import getAuthComponentHeadings from '../../../utils/getAuthComponentHeadings';
import {createVueLogger} from '../../../utils/logger';
import {handlePasskeyRegistration} from '../../../utils/passkey';
import Alert from '../../primitives/Alert';
import Card from '../../primitives/Card';
import Spinner from '../../primitives/Spinner';
import Typography from '../../primitives/Typography';
import {renderSignUpComponents} from '../flow/AuthOptionFactory';
import FlowExpired from '../flow/FlowExpired';

const logger: ReturnType<typeof createVueLogger> = createVueLogger('BaseSignUp');

/**
 * Passkey registration tracking state.
 */
interface PasskeyState {
  actionId: string | null;
  creationOptions: string | null;
  error: Error | null;
  flowId: string | null;
  isActive: boolean;
}

/**
 * Render props passed to the default scoped slot.
 */
export interface BaseSignUpRenderProps {
  additionalData: Record<string, unknown>;
  components: any[];
  error?: Error | null;
  fieldErrors: Record<string, string>;
  /**
   * The countdown that sends the user back to the application once the flow expires. Set only with
   * `afterFlowExpiredUrl` and while the flow is expired.
   */
  flowExpiryRedirect: FlowExpiryRedirect | null;
  handleInputChange: (name: string, value: string) => void;
  handleSubmit: (component: any, data?: Record<string, any>) => Promise<void>;
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
  isLoading: boolean;
  isValid: boolean;
  messages: {message: string; type: string}[];
  subtitle: string;
  title: string;
  touched: Record<string, boolean>;
  validateForm: () => {fieldErrors: Record<string, string>; isValid: boolean};
  values: Record<string, string>;
}

export interface BaseSignUpProps {
  /**
   * Where to send the user once the flow expires, e.g. the application's URL. With it, an expired flow counts
   * down and redirects there. Without it, the flow is started again in place.
   */
  afterFlowExpiredUrl?: string;
  afterSignUpUrl?: string;
  buttonClassName?: string;
  className?: string;
  error?: Error | null;
  errorClassName?: string;
  inputClassName?: string;
  isInitialized?: boolean;
  messageClassName?: string;
  onComplete?: (response: any) => void;
  onError?: (error: Error) => void;
  onFlowChange?: (response: any) => void;
  onInitialize?: (payload?: any) => Promise<any>;
  onSubmit?: (payload: any) => Promise<any>;
  shouldRedirectAfterSignUp?: boolean;
  showLogo?: boolean;
  showSubtitle?: boolean;
  showTitle?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'elevated' | 'outlined' | 'flat';
}

interface FieldDefinition {
  name: string;
  required: boolean;
  type: string;
}

const extractFormFields = (components: any[]): FieldDefinition[] => {
  const fields: FieldDefinition[] = [];
  const process = (comps: any[]): void => {
    comps.forEach((c: any) => {
      if (
        c.type === EmbeddedFlowComponentType.TextInput ||
        c.type === EmbeddedFlowComponentType.PasswordInput ||
        c.type === EmbeddedFlowComponentType.EmailInput ||
        c.type === EmbeddedFlowComponentType.Select
      ) {
        const fieldName: string = c.ref || c.id;
        fields.push({name: fieldName, required: c.required || false, type: c.type});
      }
      if (c.components && Array.isArray(c.components)) {
        process(c.components);
      }
    });
  };
  process(components);
  return fields;
};

/**
 * BaseSignUp — app-native sign-up presentation component.
 *
 * Manages the sign-up flow lifecycle including initialization, form state,
 * passkey registration, popup-based social OAuth, and renders the server-driven UI.
 */
const BaseSignUp: Component = defineComponent({
  name: 'BaseSignUp',
  props: {
    afterFlowExpiredUrl: {default: undefined, type: String},
    afterSignUpUrl: {default: undefined, type: String},
    buttonClassName: {default: '', type: String},
    className: {default: '', type: String},
    error: {default: null, type: Object as PropType<Error | null>},
    errorClassName: {default: '', type: String},
    inputClassName: {default: '', type: String},
    isInitialized: {default: false, type: Boolean},
    messageClassName: {default: '', type: String},
    onComplete: {default: undefined, type: Function as PropType<(response: any) => void>},
    onError: {default: undefined, type: Function as PropType<(error: Error) => void>},
    onFlowChange: {
      default: undefined,
      type: Function as PropType<(response: any) => void>,
    },
    onInitialize: {
      default: undefined,
      type: Function as PropType<(payload?: any) => Promise<any>>,
    },
    onSubmit: {
      default: undefined,
      type: Function as PropType<(payload: any) => Promise<any>>,
    },
    showSubtitle: {default: true, type: Boolean},
    showTitle: {default: true, type: Boolean},
    size: {
      default: 'medium',
      type: String as PropType<'small' | 'medium' | 'large'>,
    },
    variant: {
      default: 'outlined',
      type: String as PropType<'elevated' | 'outlined' | 'flat'>,
    },
  },
  emits: ['error', 'complete', 'flowChange'],
  setup(props: any, {slots}: SetupContext): () => VNode | null {
    const {meta: flowMetaRef} = useFlowMeta();
    const {t} = useI18n();

    // ── State ──
    const isLoading: Ref<boolean> = ref(false);
    const isFlowInitialized: Ref<boolean> = ref(false);
    const currentFlow: Ref<any | null> = ref(null);
    // Bumped to run the initialization again for an expired flow.
    const restartCount: Ref<number> = ref(0);
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
      canRestart: true,
      // Deferred, since the restart is defined further down.
      restart: (): void => {
        startFlowAgain();
      },
      step: () => currentFlow.value,
    });
    // Raw error source, resolved on read so the message follows a language change.
    const apiErrorSource: Ref<unknown> = shallowRef(null);
    const apiError: ComputedRef<Error | null> = computed(() =>
      apiErrorSource.value === null ? null : resolveFlowError(apiErrorSource.value, t),
    );
    const flowMessages: Ref<{message: string; type: string}[]> = ref([]);
    const passkeyState: Ref<PasskeyState> = ref({
      actionId: null,
      creationOptions: null,
      error: null,
      flowId: null,
      isActive: false,
    });

    // Form state
    const formValues: Ref<Record<string, string>> = ref({});
    const touchedFields: Ref<Record<string, boolean>> = ref({});
    const formErrors: Ref<Record<string, string>> = ref({});
    const isFormValid: Ref<boolean> = ref(true);

    // One-time flags (plain mutable, not reactive)
    let initializationAttempted = false;
    let passkeyProcessed = false;

    // ── Helpers ──

    const handleError = (error: any): void => {
      if (isFlowExpiredError(error)) {
        expireFlow();
      }
      apiErrorSource.value = error;
      flowMessages.value = [{message: apiError.value!.message, type: 'error'}];
    };

    // An expiry the flow restarts from in place is not an error for the application.
    const reportError = (error: unknown): void => {
      if (restartsInPlace.value && isFlowExpiredError(error)) return;
      props.onError?.(error as Error);
    };

    // Flow messages hold plain strings, so refresh the error message on a language change.
    watch(
      () => apiError.value?.message,
      (message: string | undefined) => {
        if (message) {
          flowMessages.value = [{message, type: 'error'}];
        }
      },
    );

    const normalizeFlowResponseLocal = (response: any): any => {
      if (response?.data?.components && Array.isArray(response.data.components)) {
        return response;
      }
      if (response?.data) {
        const {components} = normalizeFlowResponse(
          response,
          t,
          {defaultErrorKey: 'components.signUp.errors.generic', resolveTranslations: false},
          (flowMetaRef as Ref<FlowMetadataResponse | null>).value,
        );
        return {...response, data: {...response.data, components: components as any}};
      }
      return response;
    };

    const setupFormFields = (flowResponse: any): void => {
      const fields: FieldDefinition[] = extractFormFields(flowResponse.data?.components || []);
      const initialValues: Record<string, string> = {};
      fields.forEach((f: FieldDefinition) => {
        initialValues[f.name] = '';
      });
      formValues.value = initialValues;
      touchedFields.value = {};
      formErrors.value = {};
      isFormValid.value = true;
    };

    const computeFormErrors = (): Record<string, string> => {
      const components: any[] = currentFlow.value?.data?.components || [];
      const fields: FieldDefinition[] = extractFormFields(components);
      const errors: Record<string, string> = {};
      fields.forEach((field: FieldDefinition) => {
        const value: string = formValues.value[field.name] || '';
        if (field.required && (!value || value.trim() === '')) {
          errors[field.name] = t('validations.required.field.error') || 'This field is required';
        }
        if (
          (field.type === EmbeddedFlowComponentType.EmailInput || field.type === 'EMAIL') &&
          value &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ) {
          errors[field.name] = t('field.email.invalid') || 'Invalid email address';
        }
      });
      return errors;
    };

    const touchAllFields = (): void => {
      const fields: FieldDefinition[] = extractFormFields(currentFlow.value?.data?.components || []);
      const newTouched: Record<string, boolean> = {};
      fields.forEach((f: FieldDefinition) => {
        newTouched[f.name] = true;
      });
      touchedFields.value = newTouched;
    };

    const validateForm = (): {fieldErrors: Record<string, string>; isValid: boolean} => {
      touchAllFields();
      const errors: Record<string, string> = computeFormErrors();
      formErrors.value = errors;
      const valid: boolean = Object.keys(errors).length === 0;
      isFormValid.value = valid;
      return {fieldErrors: errors, isValid: valid};
    };

    /**
     *
     * Reset the formvalues
     */
    const resetForm = (): void => {
      const fields: FieldDefinition[] = extractFormFields(props.components || []);
      const freshValues: Record<string, string> = {};
      fields.forEach((f: FieldDefinition) => {
        freshValues[f.name] = '';
      });
      formValues.value = freshValues;
      touchedFields.value = {};
      apiErrorSource.value = null;
      formErrors.value = {};
      isFormValid.value = true;
    };

    // ── Input handlers ──

    const handleInputChange = (name: string, value: string): void => {
      formValues.value = {...formValues.value, [name]: value};
    };

    const handleInputBlur = (name: string): void => {
      touchedFields.value = {...touchedFields.value, [name]: true};
    };

    // ── Popup OAuth for social sign-up ──

    // Tears down the active popup's listener and poll, so neither outlives the component.
    let cleanupActivePopup: (() => void) | null = null;
    onUnmounted(() => cleanupActivePopup?.());

    const handleRedirectionIfNeeded = (response: any, existingPopup?: Window): boolean => {
      if (response?.type !== EmbeddedFlowResponseType.Redirection || !response?.data?.redirectURL) {
        return false;
      }

      const redirectUrl: string = response.data.redirectURL;
      // The reused popup can still deliver the previous round's callback (a late postMessage, or the old callback URL
      // until the new navigation commits), so only a callback carrying this round's state is accepted.
      const expectedState: string | null = new URL(redirectUrl).searchParams.get('state');
      const isThisRound = (state: unknown): boolean => !expectedState || state === expectedState;
      // A chained redirect arrives after an async round trip, with no user activation to open a new popup, so the
      // popup from the previous redirect is navigated instead.
      const reusablePopup: Window | null = existingPopup && !existingPopup.closed ? existingPopup : null;

      if (reusablePopup) {
        reusablePopup.location.href = redirectUrl;
      }

      const popup: Window | null =
        reusablePopup ?? window.open(redirectUrl, 'oauth_popup', 'width=500,height=600,scrollbars=yes,resizable=yes');

      if (!popup) {
        logger.error('Failed to open popup window');
        return false;
      }

      let hasProcessedCallback = false;
      let popupMonitor: ReturnType<typeof setInterval> | null = null;
      let messageHandler: ((event: MessageEvent) => Promise<void>) | null = null;

      const cleanup = (): void => {
        if (messageHandler) window.removeEventListener('message', messageHandler);
        if (popupMonitor) clearInterval(popupMonitor);
      };
      cleanupActivePopup = cleanup;

      const processOAuthCode = async (code: string, state: string): Promise<void> => {
        const payload: any = {
          ...(currentFlow.value?.flowId && {flowId: currentFlow.value.flowId}),
          action: '',
          flowType: currentFlow.value?.flowType || 'REGISTRATION',
          inputs: {code, state},
        };

        try {
          const continueResponse: any = await props.onSubmit(payload);
          cleanup();
          props.onFlowChange?.(continueResponse);

          if (continueResponse.flowStatus === EmbeddedSignUpFlowStatus.Complete) {
            props.onComplete?.(continueResponse);
          } else if (continueResponse.flowStatus === EmbeddedSignUpFlowStatus.Incomplete) {
            // The provider callback can lead straight into another redirect (e.g. the account-linking
            // re-authentication), so follow it in the same popup.
            if (continueResponse?.type === EmbeddedFlowResponseType.Redirection) {
              if (!handleRedirectionIfNeeded(continueResponse, popup)) {
                // Keep the current step rather than showing the redirect as a step of its own.
                popup.close();
                const popupError: Error = new Error(t('errors.signup.popup.failure'));
                handleError(popupError);
                props.onError?.(popupError);
              }
              return;
            }

            currentFlow.value = continueResponse;
            setupFormFields(continueResponse);

            // Display error from INCOMPLETE response
            if (continueResponse?.error) {
              handleError(continueResponse);
            }
          }
          popup.close();
        } catch (err) {
          handleError(err);
          reportError(err);
          popup.close();
          cleanup();
        }
      };

      messageHandler = async (event: MessageEvent): Promise<void> => {
        if (event.source !== popup) return;
        const expectedOrigin: string = props.afterSignUpUrl
          ? new URL(props.afterSignUpUrl).origin
          : window.location.origin;
        if (event.origin !== expectedOrigin && event.origin !== window.location.origin) return;
        const {code, state} = event.data;
        // The poll may already have picked up this callback.
        if (code && state && isThisRound(state) && !hasProcessedCallback) {
          hasProcessedCallback = true;
          await processOAuthCode(code, state);
        }
      };

      window.addEventListener('message', messageHandler);

      popupMonitor = setInterval(async () => {
        try {
          if (popup.closed) {
            cleanup();
            return;
          }
          if (hasProcessedCallback) return;
          try {
            const popupUrl: string = popup.location.href;
            if (popupUrl && (popupUrl.includes('code=') || popupUrl.includes('error='))) {
              const url: URL = new URL(popupUrl);
              const code: string | null = url.searchParams.get('code');
              const state: string | null = url.searchParams.get('state');
              const error: string | null = url.searchParams.get('error');

              if (!isThisRound(state)) return;
              hasProcessedCallback = true;

              if (error) {
                logger.error('OAuth error');
                popup.close();
                cleanup();
                return;
              }
              if (code && state) {
                await processOAuthCode(code, state);
              }
            }
          } catch {
            // Cross-origin error expected during OAuth redirect
          }
        } catch {
          logger.error('Error monitoring popup');
        }
      }, 1000);

      return true;
    };

    // ── Submit handler ──

    const handleSubmit = async (
      component: any,
      data?: Record<string, any>,
      skipValidation?: boolean,
    ): Promise<void> => {
      if (!currentFlow.value) return;

      if (!skipValidation) {
        const validation: {fieldErrors: Record<string, string>; isValid: boolean} = validateForm();
        if (!validation.isValid) return;
      }

      isLoading.value = true;
      clearFlowRestarted();
      apiErrorSource.value = null;
      flowMessages.value = [];

      try {
        const filteredInputs: Record<string, any> = {};
        if (data) {
          Object.entries(data).forEach(([key, value]: [string, any]) => {
            if (value !== null && value !== undefined && value !== '') {
              filteredInputs[key] = value;
            }
          });
        }

        const payload: any = {
          ...(currentFlow.value.flowId && {flowId: currentFlow.value.flowId}),
          flowType: currentFlow.value.flowType || 'REGISTRATION',
          ...(component.id && {action: component.id}),
          inputs: filteredInputs,
        };

        const rawResponse: any = await props.onSubmit(payload);
        const response: any = normalizeFlowResponseLocal(rawResponse);
        props.onFlowChange?.(response);

        if (response.flowStatus === EmbeddedSignUpFlowStatus.Complete) {
          props.onComplete?.(response);
          return;
        }

        if (response.flowStatus === EmbeddedSignUpFlowStatus.Incomplete) {
          if (handleRedirectionIfNeeded(response)) return;

          if (response.data?.additionalData?.passkeyCreationOptions) {
            const {passkeyCreationOptions} = response.data.additionalData;
            const effectiveFlowId: string | undefined = response.flowId || currentFlow.value?.flowId;
            passkeyProcessed = false;
            passkeyState.value = {
              actionId: component.id || 'submit',
              creationOptions: passkeyCreationOptions,
              error: null,
              flowId: effectiveFlowId || null,
              isActive: true,
            };
            isLoading.value = false;
            return;
          }

          currentFlow.value = response;
          setupFormFields(response);

          // Display error from INCOMPLETE response
          if (response?.error) {
            handleError(response);
          }
        }
      } catch (err) {
        handleError(err);
        reportError(err);
      } finally {
        isLoading.value = false;
      }
    };

    // ── Passkey registration watch ──

    watch(
      () => passkeyState.value,
      async (state: PasskeyState) => {
        if (!state.isActive || !state.creationOptions || !state.flowId) return;
        if (passkeyProcessed) return;
        passkeyProcessed = true;

        try {
          const passkeyResponse: string = await handlePasskeyRegistration(state.creationOptions);
          const passkeyObj: any = JSON.parse(passkeyResponse);
          const inputs: Record<string, string> = {
            attestationObject: passkeyObj.response.attestationObject,
            clientDataJSON: passkeyObj.response.clientDataJSON,
            credentialId: passkeyObj.id,
          };

          const payload: any = {
            actionId: state.actionId || 'submit',
            flowId: state.flowId,
            flowType: currentFlow.value?.flowType || 'REGISTRATION',
            inputs,
          } as any;

          const nextResponse: any = await props.onSubmit(payload);
          const processed: any = normalizeFlowResponseLocal(nextResponse);
          props.onFlowChange?.(processed);

          if (processed.flowStatus === EmbeddedSignUpFlowStatus.Complete) {
            props.onComplete?.(processed);
          } else {
            currentFlow.value = processed;
            setupFormFields(processed);

            // Display error from INCOMPLETE response
            if (processed?.error) {
              handleError(processed);
            }
          }

          passkeyState.value = {actionId: null, creationOptions: null, error: null, flowId: null, isActive: false};
        } catch (error: unknown) {
          passkeyState.value = {...passkeyState.value, error: error as Error, isActive: false};
          handleError(error);
          reportError(error);
        }
      },
      {deep: true},
    );

    // ── Flow initialization ──

    watch(
      () => [props.isInitialized, isFlowInitialized.value, restartCount.value] as [boolean, boolean, number],
      ([initialized, flowInit]: [boolean, boolean, number]) => {
        // Skip if URL has OAuth code params. `window` is unavailable during SSR
        // (e.g. Nuxt) — initialization simply proceeds and the check re-runs
        // once this watch re-evaluates on the client.
        if (typeof window !== 'undefined') {
          const urlParams: URLSearchParams = new URL(window.location.href).searchParams;
          if (urlParams.get('code') || urlParams.get('state')) return;
        }

        if (initialized && !flowInit && !initializationAttempted) {
          initializationAttempted = true;

          (async (): Promise<void> => {
            isLoading.value = true;
            apiErrorSource.value = null;
            flowMessages.value = [];

            try {
              const rawResponse: any = await props.onInitialize();
              const response: any = normalizeFlowResponseLocal(rawResponse);
              currentFlow.value = response;
              isFlowInitialized.value = true;
              props.onFlowChange?.(response);

              if (response.flowStatus === EmbeddedSignUpFlowStatus.Complete) {
                props.onComplete?.(response);
                return;
              }
              if (response.flowStatus === EmbeddedSignUpFlowStatus.Incomplete) {
                setupFormFields(response);

                // Display error from INCOMPLETE response
                if (response?.error) {
                  handleError(response);
                }
              }
            } catch (err) {
              handleError(err);
              reportError(err);
            } finally {
              isLoading.value = false;
            }
          })();
        }
      },
      {immediate: true},
    );

    /**
     * Starts an expired flow again: clears it, drops the expired execution from the URL so it is not resumed,
     * and runs the initialization once more.
     */
    const startFlowAgain = (): void => {
      currentFlow.value = null;
      apiErrorSource.value = null;
      flowMessages.value = [];
      if (typeof window !== 'undefined' && window.location?.href) {
        const url: URL = new URL(window.location.href);
        url.searchParams.delete('executionId');
        window.history.replaceState({}, '', url.toString());
      }
      initializationAttempted = false;
      isFlowInitialized.value = false;
      restartCount.value += 1;
    };

    // ── Render ──

    return (): VNode | null => {
      const containerClass: string = [
        withVendorCSSClassPrefix('signup'),
        withVendorCSSClassPrefix(`signup--${props.size}`),
        withVendorCSSClassPrefix(`signup--${props.variant}`),
        props.className,
      ]
        .filter(Boolean)
        .join(' ');

      // Scoped slot / render props
      if (slots['default']) {
        const renderProps: BaseSignUpRenderProps = {
          additionalData: currentFlow.value?.data?.additionalData ?? {},
          components: currentFlow.value?.data?.components || [],
          error: apiError.value,
          fieldErrors: formErrors.value,
          flowExpiryRedirect: flowExpiryRedirect.value,
          handleInputChange,
          handleSubmit,
          isFlowExpired: isFlowExpired.value,
          isFlowRestarted: isFlowRestarted.value,
          isLoading: isLoading.value,
          isValid: isFormValid.value,
          messages: flowMessages.value,
          subtitle: t('signup.subheading') || 'Create your account',
          title: t('signup.heading') || 'Sign Up',
          touched: touchedFields.value,
          validateForm: (): {fieldErrors: Record<string, string>; isValid: boolean} => {
            const result: {fieldErrors: Record<string, string>; isValid: boolean} = validateForm();
            return {fieldErrors: result.fieldErrors, isValid: result.isValid};
          },
          values: formValues.value,
        };
        return h('div', {class: containerClass}, slots['default'](renderProps));
      }

      if (isFlowExpired.value) {
        return h(Card, {class: containerClass, variant: props.variant}, () =>
          h(FlowExpired, {
            onRestart: restartsInPlace.value ? restartFlow : undefined,
            redirect: flowExpiryRedirect.value,
          }),
        );
      }

      // Loading state
      if (!isFlowInitialized.value && isLoading.value) {
        return h(Card, {class: containerClass, variant: props.variant}, () =>
          h('div', {style: 'display:flex;justify-content:center;padding:2rem'}, h(Spinner)),
        );
      }

      // No flow available
      if (!currentFlow.value) {
        return h(Card, {class: containerClass, variant: props.variant}, () =>
          h(
            Alert,
            {variant: 'error'},
            () => t('errors.signup.flow.initialization.failure') || 'Failed to initialize sign-up flow',
          ),
        );
      }

      // Extract headings
      const componentsToRender: any[] = currentFlow.value.data?.components || [];
      const {title, subtitle, componentsWithoutHeadings} = getAuthComponentHeadings(
        componentsToRender,
        undefined,
        undefined,
        t('signup.heading') || 'Sign Up',
        t('signup.subheading') || 'Create your account',
      );

      const meta: FlowMetadataResponse | null = (flowMetaRef as Ref<FlowMetadataResponse | null>).value;

      const renderedComponents: VNode[] =
        componentsWithoutHeadings.length > 0
          ? renderSignUpComponents(
              componentsWithoutHeadings,
              formValues.value,
              touchedFields.value,
              formErrors.value,
              isLoading.value,
              isFormValid.value,
              resetForm,
              handleInputChange,
              {
                additionalData: currentFlow.value.data?.additionalData,
                buttonClassName: props.buttonClassName,
                inputClassName: props.inputClassName,
                isFormComplete: Object.keys(computeFormErrors()).length === 0,
                meta,
                onInputBlur: handleInputBlur,
                onSubmit: handleSubmit,
                size: props.size,
                t,
                variant: props.variant,
              },
            )
          : [];

      return h(Card, {class: containerClass, variant: props.variant}, () => [
        // Header with title/subtitle
        props.showTitle || props.showSubtitle
          ? h('div', {style: 'padding: 1rem 1rem 0'}, [
              props.showTitle ? h(Typography, {variant: 'h5'}, () => title) : null,
              props.showSubtitle
                ? h(Typography, {style: 'margin-top: 0.25rem', variant: 'body1'}, () => subtitle)
                : null,
            ])
          : null,
        isFlowRestarted.value
          ? h(
              'div',
              {style: 'padding: 0 1rem'},
              h(Alert, {severity: 'info'}, () => t('flow.expired.restarted')),
            )
          : null,
        // External error
        props.error
          ? h(
              'div',
              {style: 'padding: 0 1rem'},
              h(Alert, {variant: 'error'}, () => props.error.message),
            )
          : null,
        // Flow messages
        flowMessages.value.length > 0
          ? h(
              'div',
              {style: 'padding: 0 1rem'},
              flowMessages.value.map((msg: {message: string; type: string}, i: number) =>
                h(Alert, {key: i, variant: msg.type === 'error' ? 'error' : 'info'}, () => msg.message),
              ),
            )
          : null,
        // Components
        h(
          'div',
          {style: 'padding: 1rem'},
          renderedComponents.length > 0
            ? renderedComponents
            : [
                h(
                  Alert,
                  {variant: 'warning'},
                  () => t('errors.signup.components.not.available') || 'No components available',
                ),
              ],
        ),
      ]);
    };
  },
});

export default BaseSignUp;
