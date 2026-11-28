// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {FlowMetadataResponse, resolveFlowTemplateLiterals} from '@thunderid/browser';
import {type Ref, ref, watch} from 'vue';
import {extractErrorMessage, normalizeFlowResponse} from '../../utils/flowTransformer';
import useFlowMeta from '../useFlowMeta';
import useI18n from '../useI18n';

/**
 * Flow response of an invitation step.
 */
export interface InviteUserFlowResponse {
  challengeToken?: string;
  data?: {
    additionalData?: Record<string, string>;
    components?: any[];
    meta?: {
      components?: any[];
    };
  };
  error?: {
    code: string;
    description: {key: string; default?: string; defaultValue?: string};
    message: {key: string; default?: string; defaultValue?: string};
  };
  executionId?: string;
  /**
   * @deprecated The server identifies the execution by `executionId` and never sets this.
   */
  flowId?: string;
  flowStatus: 'INCOMPLETE' | 'COMPLETE' | 'ERROR';
  type?: 'VIEW' | 'REDIRECTION';
}

/**
 * Slot props of an invitation component's default scoped slot.
 */
export interface InviteFlowRenderProps {
  /** Additional data of the current step, such as the roles a ROLE_SELECT offers (`roleOptions`). */
  additionalData?: Record<string, string>;
  components: any[];
  error?: Error | null;
  /** Identifies the flow execution. */
  executionId?: string;
  fieldErrors: Record<string, string>;
  handleInputBlur: (name: string) => void;
  handleInputChange: (name: string, value: string) => void;
  handleSubmit: (component: any, data?: Record<string, any>) => Promise<void>;
  isLoading: boolean;
  isValid: boolean;
  meta: FlowMetadataResponse | null;
  resetFlow: () => void;
  subtitle?: string;
  title?: string;
  touched: Record<string, boolean>;
  values: Record<string, string>;
}

/**
 * The props of an invitation component that the flow reads.
 */
export interface InviteFlowProps {
  isInitialized: boolean;
  onError?: (error: Error) => void;
  onFlowChange?: (response: InviteUserFlowResponse) => void;
  onInitialize: (payload: Record<string, any>) => Promise<InviteUserFlowResponse>;
  onSubmit: (payload: Record<string, any>) => Promise<InviteUserFlowResponse>;
}

export interface UseInviteFlowOptions {
  /** The translation key of the message for a failure the server gives no message for. */
  errorKey: string;
  /** Called when the flow is reset. */
  onReset?: () => void;
  /** Called with the response to each submitted step, before the flow moves on. */
  onStepResponse?: (response: InviteUserFlowResponse) => void;
  props: InviteFlowProps;
  /** The payload that starts the flow. A new payload starts the flow over. */
  start: () => Record<string, unknown>;
}

export interface InviteFlow {
  apiError: Ref<Error | null>;
  currentFlow: Ref<InviteUserFlowResponse | null>;
  formErrors: Ref<Record<string, string>>;
  formValues: Ref<Record<string, string>>;
  handleInputBlur: (name: string) => void;
  handleInputChange: (name: string, value: string) => void;
  handleSubmit: (component: any, data?: Record<string, any>) => Promise<void>;
  isFlowInitialized: Ref<boolean>;
  isFormValid: Ref<boolean>;
  isLoading: Ref<boolean>;
  meta: () => FlowMetadataResponse | null;
  /** The current step's components, title and subtitle, and the components without the headings. */
  read: () => {components: any[]; componentsWithoutHeadings: any[]; subtitle?: string; title?: string};
  /** The slot props of the current step. */
  renderProps: () => InviteFlowRenderProps;
  resetFlow: () => void;
  resetForm: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  touchedFields: Ref<Record<string, boolean>>;
  validateForm: (components: any[]) => {errors: Record<string, string>; isValid: boolean};
}

const VALIDATED_TYPES: string[] = [
  'TEXT_INPUT',
  'EMAIL_INPUT',
  'SELECT',
  'USER_SELECT',
  'AUTH_FLOW_SELECT',
  'USER_TYPE_SELECT',
  'ROLE_SELECT',
];

// The flow writes its texts as translation templates, so the headings are resolved as the field labels are.
const extractHeadings = (components: any[], resolve: (text: string) => string): {subtitle?: string; title?: string} => {
  let title: string | undefined;
  let subtitle: string | undefined;
  components.forEach((comp: any) => {
    if (comp.type === 'TEXT') {
      if (comp.variant === 'HEADING_1' && !title) title = comp.label && resolve(comp.label);
      else if ((comp.variant === 'HEADING_2' || comp.variant === 'SUBTITLE_1') && !subtitle) {
        subtitle = comp.label && resolve(comp.label);
      }
    }
  });
  return {subtitle, title};
};

/**
 * Runs an invitation flow: starts it, keeps the step's form, and submits each step with the execution ID and the
 * latest challenge token.
 */
const useInviteFlow = ({errorKey, onReset, onStepResponse, props, start}: UseInviteFlowOptions): InviteFlow => {
  const {meta: metaRef} = useFlowMeta();
  const {t} = useI18n();

  const isLoading: Ref<boolean> = ref(false);
  const isFlowInitialized: Ref<boolean> = ref(false);
  const currentFlow: Ref<InviteUserFlowResponse | null> = ref(null);
  const apiError: Ref<Error | null> = ref(null);

  const formValues: Ref<Record<string, string>> = ref({});
  const formErrors: Ref<Record<string, string>> = ref({});
  const touchedFields: Ref<Record<string, boolean>> = ref({});
  const isFormValid: Ref<boolean> = ref(true);

  // The token the server issues with each step; the next request must send the latest one.
  let challengeToken: string | null = null;
  // The start payload the flow last ran with, or null while it has not started.
  let startedWith: string | null = null;

  const meta = (): FlowMetadataResponse | null => (metaRef as Ref<FlowMetadataResponse | null>).value;

  const handleError = (error: any): void => {
    const errorMessage: string = extractErrorMessage(error, t, errorKey);
    apiError.value = error instanceof Error ? error : new Error(errorMessage);
    props.onError?.(apiError.value);
  };

  const normalize = (response: InviteUserFlowResponse): InviteUserFlowResponse => {
    if (!response?.data?.meta?.components) return response;
    try {
      const {components} = normalizeFlowResponse(
        response,
        t,
        {defaultErrorKey: errorKey, resolveTranslations: false},
        meta(),
      );
      return {...response, data: {...response.data, components: components as any}};
    } catch {
      return response;
    }
  };

  const handleInputChange = (name: string, value: string): void => {
    formValues.value = {...formValues.value, [name]: value};
    const newErrors: Record<string, string> = {...formErrors.value};
    delete newErrors[name];
    formErrors.value = newErrors;
  };

  const handleInputBlur = (name: string): void => {
    touchedFields.value = {...touchedFields.value, [name]: true};
  };

  const validateForm = (components: any[]): {errors: Record<string, string>; isValid: boolean} => {
    const errors: Record<string, string> = {};
    const validateComponents = (comps: any[]): void => {
      comps.forEach((comp: any) => {
        if (VALIDATED_TYPES.includes(comp.type) && comp.required && comp.ref) {
          const value: string = formValues.value[comp.ref] || '';
          if (!value || value.trim() === '') {
            errors[comp.ref] = `${comp.label || comp.ref} is required`;
          }
          if (comp.type === 'EMAIL_INPUT' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors[comp.ref] = 'Please enter a valid email address';
          }
        }
        if (comp.components && Array.isArray(comp.components)) {
          validateComponents(comp.components);
        }
      });
    };
    validateComponents(components);
    return {errors, isValid: Object.keys(errors).length === 0};
  };

  const handleSubmit = async (component: any, data?: Record<string, any>): Promise<void> => {
    if (!currentFlow.value) return;

    const components: any[] = currentFlow.value.data?.components || [];
    const validation: {errors: Record<string, string>; isValid: boolean} = validateForm(components);
    if (!validation.isValid) {
      formErrors.value = validation.errors;
      isFormValid.value = false;
      const touched: Record<string, boolean> = {};
      Object.keys(validation.errors).forEach((key: string) => {
        touched[key] = true;
      });
      touchedFields.value = {...touchedFields.value, ...touched};
      return;
    }

    isLoading.value = true;
    apiError.value = null;
    isFormValid.value = true;

    try {
      const payload: Record<string, any> = {
        executionId: currentFlow.value.executionId,
        inputs: data || formValues.value,
        verbose: true,
        ...(challengeToken ? {challengeToken} : {}),
      };
      if (component?.id) payload['action'] = component.id;

      const response: InviteUserFlowResponse = normalize(await props.onSubmit(payload));
      challengeToken = response.challengeToken ?? null;
      props.onFlowChange?.(response);
      onStepResponse?.(response);

      if (response.flowStatus === 'ERROR') {
        handleError(response);
        return;
      }

      currentFlow.value = response;
      formValues.value = {};
      formErrors.value = {};
      touchedFields.value = {};

      if (response?.error) {
        handleError(response);
      }
    } catch (err) {
      handleError(err);
    } finally {
      isLoading.value = false;
    }
  };

  const clearState = (): void => {
    isFlowInitialized.value = false;
    currentFlow.value = null;
    apiError.value = null;
    formValues.value = {};
    formErrors.value = {};
    touchedFields.value = {};
    challengeToken = null;
    onReset?.();
  };

  const resetFlow = (): void => {
    clearState();
    startedWith = null;
  };

  const resetForm = (): void => {
    formValues.value = {};
    formErrors.value = {};
    touchedFields.value = {};
    apiError.value = null;
    isFormValid.value = true;
  };

  const startFlow = async (payload: Record<string, unknown>): Promise<void> => {
    isLoading.value = true;
    apiError.value = null;

    try {
      const response: InviteUserFlowResponse = normalize(await props.onInitialize({...payload, verbose: true}));
      challengeToken = response.challengeToken ?? null;
      currentFlow.value = response;
      isFlowInitialized.value = true;
      props.onFlowChange?.(response);

      if (response.flowStatus === 'ERROR') {
        handleError(response);
      }
    } catch (err) {
      handleError(err);
    } finally {
      isLoading.value = false;
    }
  };

  watch(
    () => [props.isInitialized, isFlowInitialized.value, JSON.stringify(start())] as [boolean, boolean, string],
    ([initialized, , startKey]: [boolean, boolean, string]) => {
      // Another flow to run: drop the current one and start over.
      if (startedWith !== null && startedWith !== startKey) clearState();

      if (initialized && !isFlowInitialized.value && startedWith !== startKey) {
        startedWith = startKey;
        startFlow(start());
      }
    },
    {immediate: true},
  );

  const read = (): {components: any[]; componentsWithoutHeadings: any[]; subtitle?: string; title?: string} => {
    const components: any[] = currentFlow.value?.data?.components || currentFlow.value?.data?.meta?.components || [];
    const {title, subtitle} = extractHeadings(components, (text: string): string =>
      resolveFlowTemplateLiterals(text, {meta: meta(), t}),
    );
    // Headings are drawn by the card header, so the built-in UI leaves them out of the form.
    const componentsWithoutHeadings: any[] = components.filter(
      (comp: any) => !(comp.type === 'TEXT' && (comp.variant === 'HEADING_1' || comp.variant === 'HEADING_2')),
    );
    return {components, componentsWithoutHeadings, subtitle, title};
  };

  const renderProps = (): InviteFlowRenderProps => {
    const {components, title, subtitle} = read();

    return {
      additionalData: currentFlow.value?.data?.additionalData,
      components,
      error: apiError.value,
      executionId: currentFlow.value?.executionId,
      fieldErrors: formErrors.value,
      handleInputBlur,
      handleInputChange,
      handleSubmit,
      isLoading: isLoading.value,
      isValid: isFormValid.value,
      meta: meta(),
      resetFlow,
      subtitle,
      title,
      touched: touchedFields.value,
      values: formValues.value,
    };
  };

  return {
    apiError,
    currentFlow,
    formErrors,
    formValues,
    handleInputBlur,
    handleInputChange,
    handleSubmit,
    isFlowInitialized,
    isFormValid,
    isLoading,
    meta,
    read,
    renderProps,
    resetFlow,
    resetForm,
    t,
    touchedFields,
    validateForm,
  };
};

export default useInviteFlow;
