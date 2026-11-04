// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  withVendorCSSClassPrefix,
  EmbeddedSignInFlowRequest,
  EmbeddedFlowComponent,
  FieldError,
  FlowMetadataResponse,
} from '@thunderid/browser';
import {
  type ComputedRef,
  type Component,
  type PropType,
  type Ref,
  type SetupContext,
  type VNode,
  computed,
  defineComponent,
  h,
  ref,
  watch,
} from 'vue';
import useFlow from '../../../composables/useFlow';
import useFlowMeta from '../../../composables/useFlowMeta';
import useI18n from '../../../composables/useI18n';
import {extractErrorMessage} from '../../../utils/flowTransformer';
import Alert from '../../primitives/Alert';
import Card from '../../primitives/Card';
import Spinner from '../../primitives/Spinner';
import Typography from '../../primitives/Typography';
import {renderSignInComponents} from '../flow/AuthOptionFactory';

/**
 * Render props passed to the default scoped slot for custom UI rendering.
 */
export interface BaseSignInRenderProps {
  additionalData: Record<string, unknown>;
  components: EmbeddedFlowComponent[];
  error?: Error | null;
  fieldErrors: Record<string, string>;
  handleInputChange: (name: string, value: string) => void;
  handleSubmit: (component: EmbeddedFlowComponent, data?: Record<string, any>) => Promise<void>;
  isLoading: boolean;
  isTimeoutDisabled?: boolean;
  isValid: boolean;
  messages: {message: string; type: string}[];
  meta: FlowMetadataResponse | null;
  subtitle: string | undefined;
  title: string;
  touched: Record<string, boolean>;
  validateForm: () => {fieldErrors: Record<string, string>; isValid: boolean};
  values: Record<string, string>;
}

export interface BaseSignInProps {
  additionalData?: Record<string, any>;
  buttonClassName?: string;
  className?: string;
  components?: EmbeddedFlowComponent[];
  error?: Error | null;
  errorClassName?: string;
  inputClassName?: string;
  initialValues?: Record<string, string>;
  isLoading?: boolean;
  isTimeoutDisabled?: boolean;
  messageClassName?: string;
  onSubmit?: (payload: EmbeddedSignInFlowRequest, component: EmbeddedFlowComponent) => Promise<void>;
  serverFieldErrors?: FieldError[] | null;
  size?: 'small' | 'medium' | 'large';
  variant?: 'elevated' | 'outlined' | 'flat';
}

interface FieldDefinition {
  name: string;
  required: boolean;
  type: string;
}

const extractFormFields = (flowComponents: EmbeddedFlowComponent[]): FieldDefinition[] => {
  const fields: FieldDefinition[] = [];
  const process = (comps: EmbeddedFlowComponent[]): void => {
    comps.forEach((c: any) => {
      if (
        c.type === 'TEXT_INPUT' ||
        c.type === 'PASSWORD_INPUT' ||
        c.type === 'EMAIL_INPUT' ||
        c.type === 'SELECT' ||
        // A Resolve OU step's organization unit input.
        c.type === 'OU_SELECT'
      ) {
        fields.push({name: c.ref, required: c.required || false, type: c.type});
      }
      if (c.components) {
        process(c.components);
      }
    });
  };
  process(flowComponents);
  return fields;
};

/**
 * BaseSignIn — unstyled app-native sign-in presentation component.
 *
 * Renders the server-driven UI components from an embedded authentication flow.
 * Manages local form state (values, touched, errors) and delegates submission to the parent SignIn component.
 *
 * Supports render props via the `default` scoped slot for complete UI customization.
 *
 * @example
 * ```vue
 * <!-- Default UI -->
 * <BaseSignIn :components="flowComponents" :on-submit="handleSubmit" />
 *
 * <!-- Custom UI via scoped slot -->
 * <BaseSignIn :components="flowComponents" :on-submit="handleSubmit" v-slot="{ values, handleInputChange, handleSubmit }">
 *   <input :value="values.username" @input="handleInputChange('username', $event.target.value)" />
 *   <button @click="handleSubmit(submitComponent)">Sign In</button>
 * </BaseSignIn>
 * ```
 */
const BaseSignIn: Component = defineComponent({
  name: 'BaseSignIn',
  props: {
    additionalData: {
      default: (): Record<string, any> => ({}),
      type: Object as PropType<Record<string, any>>,
    },
    buttonClassName: {default: '', type: String},
    className: {default: '', type: String},
    components: {
      default: (): EmbeddedFlowComponent[] => [],
      type: Array as PropType<EmbeddedFlowComponent[]>,
    },
    error: {default: null, type: Object as PropType<Error | null>},
    errorClassName: {default: '', type: String},
    inputClassName: {default: '', type: String},
    initialValues: {
      default: (): Record<string, string> => ({}),
      type: Object as PropType<Record<string, string>>,
    },
    isLoading: {default: false, type: Boolean},
    isTimeoutDisabled: {default: false, type: Boolean},
    messageClassName: {default: '', type: String},
    // Declared explicitly (not just in the `BaseSignInProps` TS interface) because Vue treats any
    // undeclared `onXxx`-named prop as a DOM event-listener fallthrough rather than a component
    // prop. Without this, `props.onSubmit` is `undefined` at runtime — the callback instead falls
    // through onto the rendered DOM tree via `{...attrs}` and fires when a native `submit` event
    // bubbles up from a nested `<form>`, delivering the raw `SubmitEvent` instead of the flow payload.
    onSubmit: {
      default: undefined,
      type: Function as PropType<
        (payload: EmbeddedSignInFlowRequest, component: EmbeddedFlowComponent) => Promise<void>
      >,
    },
    serverFieldErrors: {default: null, type: Array as PropType<FieldError[] | null>},
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
      additionalData: Record<string, any>;
      buttonClassName: string;
      className: string;
      components: EmbeddedFlowComponent[];
      error: Error | null;
      errorClassName: string;
      inputClassName: string;
      initialValues: Record<string, string>;
      isLoading: boolean;
      isTimeoutDisabled: boolean;
      messageClassName: string;
      onSubmit?: (payload: EmbeddedSignInFlowRequest, component: EmbeddedFlowComponent) => Promise<void>;
      serverFieldErrors: FieldError[] | null;
      size: 'small' | 'medium' | 'large';
      variant: 'elevated' | 'outlined' | 'flat';
    }>,
    {slots, emit, attrs}: SetupContext,
  ): () => VNode | null {
    const {meta: metaRef} = useFlowMeta();
    const {t} = useI18n();
    const {subtitle: flowSubtitle, title: flowTitle, messages: flowMessages, addMessage, clearMessages} = useFlow();

    const isSubmitting: Ref<boolean> = ref(false);
    const apiError: Ref<Error | null> = ref(null);

    const isLoading: ComputedRef<boolean> = computed<boolean>(() => props.isLoading || isSubmitting.value);

    // Form state
    const formValues: Ref<Record<string, string>> = ref({});
    const touchedFields: Ref<Record<string, boolean>> = ref({});
    const serverFormErrors: Ref<Record<string, string>> = ref({});

    // Reset form state when components change (new flow step)
    watch(
      () => props.components,
      (newComponents: EmbeddedFlowComponent[]) => {
        const fields: FieldDefinition[] = extractFormFields(newComponents || []);
        const freshValues: Record<string, string> = {...props.initialValues};
        fields.forEach((f: FieldDefinition) => {
          freshValues[f.name] = props.initialValues[f.name] ?? '';
        });
        formValues.value = freshValues;
        touchedFields.value = {};
        serverFormErrors.value = {};
      },
      {deep: false, immediate: true},
    );

    watch(
      () => props.initialValues,
      (initialValues: Record<string, string>) => {
        formValues.value = {...formValues.value, ...initialValues};
      },
      {deep: true},
    );

    // Keep server validation errors in editable form state so users can correct and resubmit fields.
    watch(
      () => props.serverFieldErrors,
      (fieldErrors: FieldError[] | null) => {
        const errors: Record<string, string> = {};
        const touched: Record<string, boolean> = {};
        (fieldErrors ?? []).forEach((fieldError: FieldError) => {
          if (!(fieldError.identifier in errors)) {
            errors[fieldError.identifier] = fieldError.message;
            touched[fieldError.identifier] = true;
          }
        });
        serverFormErrors.value = errors;
        if (Object.keys(touched).length > 0) {
          touchedFields.value = {...touchedFields.value, ...touched};
        }
      },
      {immediate: true},
    );

    // Computed form errors based on current values + touched
    const formErrors: ComputedRef<Record<string, string>> = computed<Record<string, string>>(() => {
      const fields: FieldDefinition[] = extractFormFields(props.components || []);
      const errors: Record<string, string> = {...serverFormErrors.value};
      fields.forEach((field: FieldDefinition) => {
        const value: string = formValues.value[field.name] || '';
        const isTouched: boolean = touchedFields.value[field.name] || false;
        if (!(field.name in errors) && field.required && isTouched && (!value || value.trim() === '')) {
          errors[field.name] = t('validations.required.field.error') || 'This field is required';
        }
        if (
          !(field.name in errors) &&
          field.type === 'EMAIL_INPUT' &&
          value &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
        ) {
          errors[field.name] = t('field.email.invalid') || 'Invalid email address';
        }
      });
      return errors;
    });

    const isFormValid: ComputedRef<boolean> = computed<boolean>(() => Object.keys(formErrors.value).length === 0);

    const handleError = (error: any): void => {
      const errorMessage: string = extractErrorMessage(error, t);
      apiError.value = error instanceof Error ? error : new Error(errorMessage);
      clearMessages();
      addMessage({message: errorMessage, type: 'error'});
    };

    const handleInputChange = (name: string, value: string): void => {
      formValues.value = {...formValues.value, [name]: value};
      if (name in serverFormErrors.value) {
        const errors: Record<string, string> = {...serverFormErrors.value};
        delete errors[name];
        serverFormErrors.value = errors;
      }
    };

    const handleInputBlur = (name: string): void => {
      touchedFields.value = {...touchedFields.value, [name]: true};
    };

    const touchAllFields = (): void => {
      const fields: FieldDefinition[] = extractFormFields(props.components || []);
      const newTouched: Record<string, boolean> = {};
      fields.forEach((f: FieldDefinition) => {
        newTouched[f.name] = true;
      });
      touchedFields.value = newTouched;
    };

    const validateForm = (): {fieldErrors: Record<string, string>; isValid: boolean} => {
      touchAllFields();
      const errors: Record<string, string> = formErrors.value;
      return {fieldErrors: errors, isValid: Object.keys(errors).length === 0};
    };

    const handleSubmit = async (
      component: EmbeddedFlowComponent,
      data?: Record<string, any>,
      skipValidation?: boolean,
    ): Promise<void> => {
      if (!skipValidation) {
        const {isValid} = validateForm();
        if (!isValid) return;
      }

      isSubmitting.value = true;
      apiError.value = null;
      clearMessages();

      try {
        const filteredInputs: Record<string, any> = {};
        if (data) {
          Object.keys(data).forEach((key: string) => {
            if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
              filteredInputs[key] = data[key];
            }
          });
        }

        const payload: EmbeddedSignInFlowRequest = {
          ...((component as any).id ? {action: (component as any).id} : {}),
          inputs: filteredInputs,
        };

        await props.onSubmit?.(payload, component);
      } catch (err: unknown) {
        handleError(err);
        emit('error', err);
      } finally {
        isSubmitting.value = false;
      }
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
      isSubmitting.value = false;
      apiError.value = null;
      clearMessages();
    };

    const renderComponents = (): VNode[] =>
      renderSignInComponents(
        props.components || [],
        formValues.value,
        touchedFields.value,
        formErrors.value,
        isLoading.value,
        isFormValid.value,
        resetForm,
        handleInputChange,
        {
          additionalData: props.additionalData,
          buttonClassName: props.buttonClassName,
          inputClassName: props.inputClassName,
          isTimeoutDisabled: props.isTimeoutDisabled,
          meta: (metaRef as Ref<FlowMetadataResponse | null>).value,
          onInputBlur: handleInputBlur,
          onSubmit: handleSubmit,
          size: props.size,
          t,
        },
      );

    return (): VNode | null => {
      const containerClass: string = [
        withVendorCSSClassPrefix('signin'),
        withVendorCSSClassPrefix(`signin--${props.size}`),
        withVendorCSSClassPrefix(`signin--${props.variant}`),
        props.className,
      ]
        .filter(Boolean)
        .join(' ');

      // If a scoped slot is provided, use render props pattern
      if (slots['default']) {
        const renderProps: BaseSignInRenderProps = {
          additionalData: props.additionalData,
          components: props.components || [],
          error: apiError.value,
          fieldErrors: formErrors.value,
          handleInputChange,
          handleSubmit,
          isLoading: isLoading.value,
          isTimeoutDisabled: props.isTimeoutDisabled,
          isValid: isFormValid.value,
          messages: (flowMessages as Ref<{message: string; type: string}[]>).value || [],
          meta: (metaRef as Ref<FlowMetadataResponse | null>).value,
          subtitle: (flowSubtitle as Ref<string | undefined>).value,
          title: (flowTitle as Ref<string>).value || t('signin.heading') || 'Sign In',
          touched: touchedFields.value,
          validateForm,
          values: formValues.value,
        };
        return h(
          'div',
          {...attrs, class: [containerClass, (attrs as any).class].filter(Boolean).join(' ')},
          slots['default'](renderProps),
        );
      }

      // Loading state
      if (isLoading.value && (!props.components || props.components.length === 0)) {
        return h(Card, {class: containerClass, variant: props.variant}, () =>
          h('div', {style: 'display:flex;justify-content:center;padding:2rem'}, h(Spinner)),
        );
      }

      // No components available
      if (!props.components || props.components.length === 0) {
        return h(Card, {class: containerClass, variant: props.variant}, () =>
          h(Alert, {severity: 'warning'}, () =>
            h(
              Typography,
              {variant: 'body1'},
              () => t('errors.signin.components.not.available') || 'No sign-in options available',
            ),
          ),
        );
      }

      const messages: {message: string; type: string}[] =
        (flowMessages as Ref<{message: string; type: string}[]>).value || [];
      const externalError: Error | null = props.error;

      return h(
        Card,
        {...attrs, class: [containerClass, (attrs as any).class].filter(Boolean).join(' '), variant: props.variant},
        () => [
          // Show errors and flow messages
          (externalError || messages.length > 0) &&
            h(
              'div',
              {class: [withVendorCSSClassPrefix('signin__messages'), props.messageClassName].filter(Boolean).join(' ')},
              [
                externalError &&
                  h(Alert, {severity: 'error'}, () => h(Typography, {variant: 'body2'}, () => externalError.message)),
                ...messages.map((msg: {message: string; type: string}, index: number) =>
                  h(Alert, {key: index, severity: msg.type === 'error' ? 'error' : 'info'}, () =>
                    h(Typography, {variant: 'body2'}, () => msg.message),
                  ),
                ),
              ],
            ),
          // Render flow components
          h('div', {class: withVendorCSSClassPrefix('signin__content')}, renderComponents()),
        ],
      );
    };
  },
});

export default BaseSignIn;
