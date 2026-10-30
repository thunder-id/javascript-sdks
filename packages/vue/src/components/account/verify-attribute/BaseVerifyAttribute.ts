// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AttributeVerificationConstants,
  EmbeddedFlowComponent,
  EmbeddedSelfServiceFlowRequest,
  EmbeddedSelfServiceFlowResponse,
  EmbeddedSelfServiceFlowStatus,
  FieldError,
  FlowMetadataResponse,
  FlowStepComponents,
  Preferences,
  buildValidatorFromRules,
  getFlowStepComponents,
  resolveFlowTemplateLiterals,
  withVendorCSSClassPrefix,
} from '@thunderid/browser';
import {
  type Component,
  type PropType,
  type Ref,
  type SetupContext,
  type VNode,
  type VNodeArrayChildren,
  cloneVNode,
  defineComponent,
  h,
  isVNode,
  ref,
  watch,
} from 'vue';
import useFlowMeta from '../../../composables/useFlowMeta';
import {extractErrorMessage, normalizeFlowResponse} from '../../../utils/flowTransformer';
import getAuthComponentHeadings, {type AuthComponentHeadingsResult} from '../../../utils/getAuthComponentHeadings';
import useAdminTranslation from '../../admin/shared/useAdminTranslation';
import {renderVerificationComponents} from '../../auth/flow/AuthOptionFactory';
import Alert from '../../primitives/Alert';
import Button from '../../primitives/Button';
import Spinner from '../../primitives/Spinner';
import Typography from '../../primitives/Typography';

type VerificationState = 'loading' | 'active' | 'complete' | 'failed';

// Flow identifiers of the step's inputs (`ref`, else `id`) and actions (`id`).
const collectFlowIds = ({actions, inputs}: FlowStepComponents): {actions: Set<string>; fields: Set<string>} => ({
  actions: new Set(actions.map((component: EmbeddedFlowComponent) => component.id)),
  fields: new Set(inputs.map((component: EmbeddedFlowComponent) => component.ref ?? component.id)),
});

// Tags the nodes rendered from the flow with `thunderid-field-<ref>` and `thunderid-action-<id>`.
// The shared factory keys a node by its component id and names an input by its ref.
const withFlowTestIds = (node: VNode, ids: {actions: Set<string>; fields: Set<string>}): VNode => {
  const name: unknown = node.props?.['name'];
  let testId: string | undefined;
  if (typeof name === 'string' && ids.fields.has(name)) {
    testId = `thunderid-field-${name}`;
  } else if (node.key !== null && ids.actions.has(String(node.key))) {
    testId = `thunderid-action-${String(node.key)}`;
  }

  const children: VNode['children'] = Array.isArray(node.children)
    ? (node.children.map((child: unknown) =>
        isVNode(child) ? withFlowTestIds(child, ids) : child,
      ) as VNodeArrayChildren)
    : node.children;
  if (!testId && children === node.children) return node;

  const tagged: VNode = cloneVNode(node, testId ? {'data-testid': testId} : null);
  tagged.children = children;
  return tagged;
};

/**
 * Slot props of the default scoped slot, so the steps can be drawn with any UI.
 */
export interface BaseVerifyAttributeRenderProps {
  additionalData: Record<string, unknown>;
  /** The step's components, without its headings. */
  components: EmbeddedFlowComponent[];
  /**
   * Masked destination the code or link was sent to, when the flow reports it.
   */
  destination: string | null;
  /** Translated "Sent to …" line, set when the flow has its own prompt in `subtitle`. */
  destinationText: string | null;
  /** Translated error of the last request, or the refusal. */
  error: string | null;
  fieldErrors: Record<string, string>;
  handleInputChange: (name: string, value: string) => void;
  /** Sends a new code. Set only while the step has a resend action. */
  handleResend?: () => Promise<void>;
  /**
   * Submits a step. Pass `skipValidation` for an action, such as a resend, that sends no inputs.
   */
  handleSubmit: (
    component: EmbeddedFlowComponent,
    data?: Record<string, string>,
    skipValidation?: boolean,
  ) => Promise<void>;
  isAwaitingLink: boolean;
  isComplete: boolean;
  /** Whether the server refused the verification or the request failed; the flow cannot continue. */
  isFailed: boolean;
  isLoading: boolean;
  isValid: boolean;
  /** Closes the panel. Set only when the app passes `onCancel`. */
  onCancel?: () => void;
  /**
   * Confirms a link the user opened outside the app. Set only while the step waits for a link and the
   * app passes `onDone`.
   */
  onDone?: () => void;
  subtitle: string;
  /** Translated message for a recorded verification. */
  successMessage: string;
  title: string;
  touched: Record<string, boolean>;
  values: Record<string, string>;
}

export interface BaseVerifyAttributeProps {
  /** Label of the attribute being verified, used in the default heading and success message. */
  attributeDisplayName?: string;
  buttonClassName?: string;
  className?: string;
  inputClassName?: string;
  isInitialized?: boolean;
  /** Called when the user closes the panel. The close action is shown only when this is set. */
  onCancel?: () => void;
  /** Called once the server has recorded the verification. */
  onComplete?: (response: EmbeddedSelfServiceFlowResponse) => void;
  /**
   * Called when the user selects Done after the flow sent a link, which they confirm outside the app.
   * The Done action is shown only when this is set.
   */
  onDone?: () => void;
  /** Called when the server refuses the verification or the request fails. */
  onError?: (error: Error) => void;
  onFlowChange?: (response: EmbeddedSelfServiceFlowResponse) => void;
  onInitialize?: () => Promise<EmbeddedSelfServiceFlowResponse>;
  onSubmit?: (payload: EmbeddedSelfServiceFlowRequest) => Promise<EmbeddedSelfServiceFlowResponse>;
  /** Component-level preferences to override global i18n and theme settings. */
  preferences?: Preferences;
  showSubtitle?: boolean;
  showTitle?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'outlined' | 'flat';
}

/**
 * BaseVerifyAttribute renders the server-described steps of a self attribute verification flow.
 * It takes the flow calls as props, so it stays independent of how the request reaches the server.
 *
 * It starts the flow once per mount, since starting one sends a message, and never retries a start
 * that failed.
 */
const BaseVerifyAttribute: Component = defineComponent({
  name: 'BaseVerifyAttribute',
  props: {
    attributeDisplayName: {default: '', type: String},
    buttonClassName: {default: '', type: String},
    className: {default: '', type: String},
    inputClassName: {default: '', type: String},
    isInitialized: {default: true, type: Boolean},
    onCancel: {default: undefined, type: Function as PropType<() => void>},
    onComplete: {default: undefined, type: Function as PropType<(response: EmbeddedSelfServiceFlowResponse) => void>},
    onDone: {default: undefined, type: Function as PropType<() => void>},
    onError: {default: undefined, type: Function as PropType<(error: Error) => void>},
    onFlowChange: {
      default: undefined,
      type: Function as PropType<(response: EmbeddedSelfServiceFlowResponse) => void>,
    },
    onInitialize: {default: undefined, type: Function as PropType<() => Promise<EmbeddedSelfServiceFlowResponse>>},
    onSubmit: {
      default: undefined,
      type: Function as PropType<(payload: EmbeddedSelfServiceFlowRequest) => Promise<EmbeddedSelfServiceFlowResponse>>,
    },
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    showSubtitle: {default: true, type: Boolean},
    showTitle: {default: true, type: Boolean},
    size: {default: 'medium', type: String as PropType<'small' | 'medium' | 'large'>},
    variant: {default: 'outlined', type: String as PropType<'outlined' | 'flat'>},
  },
  setup(props: BaseVerifyAttributeProps, {slots}: SetupContext): () => VNode {
    const {meta: flowMetaRef} = useFlowMeta();
    const t: ReturnType<typeof useAdminTranslation> = useAdminTranslation(() => props.preferences);

    const state: Ref<VerificationState> = ref<VerificationState>('loading');
    const isSubmitting: Ref<boolean> = ref(false);
    const currentFlow: Ref<EmbeddedSelfServiceFlowResponse | null> = ref(null);
    const error: Ref<string | null> = ref(null);

    const formValues: Ref<Record<string, string>> = ref({});
    const touchedFields: Ref<Record<string, boolean>> = ref({});
    const formErrors: Ref<Record<string, string>> = ref({});
    const isFormValid: Ref<boolean> = ref(true);

    // Guards against a second initiation, which would send a second code.
    let initializationAttempted = false;
    let challengeToken: string | null = null;

    const meta = (): FlowMetadataResponse | null => (flowMetaRef as Ref<FlowMetadataResponse | null>)?.value ?? null;
    const labelParams = (): Record<string, string> => ({attribute: props.attributeDisplayName ?? ''});

    const normalize = (response: EmbeddedSelfServiceFlowResponse): EmbeddedSelfServiceFlowResponse => {
      if (!response?.data || Array.isArray(response.data.components)) {
        return response;
      }

      const {components} = normalizeFlowResponse(
        response,
        t,
        {defaultErrorKey: 'user.verification.error', resolveTranslations: false, throwOnError: false},
        meta(),
      );

      return {...response, data: {...response.data, components}};
    };

    const inputs = (): EmbeddedFlowComponent[] =>
      getFlowStepComponents(currentFlow.value?.data?.components ?? []).inputs;

    const validate = (): boolean => {
      const errors: Record<string, string> = {};
      const touched: Record<string, boolean> = {};

      inputs().forEach((component: EmbeddedFlowComponent) => {
        const name: string = component.ref ?? component.id;
        const value: string = formValues.value[name] ?? '';
        const ruleValidator: ((value: string) => string | null) | null = buildValidatorFromRules(component.validation);
        touched[name] = true;

        if (component.required && value.trim() === '') {
          errors[name] = t('validations.required.field.error');
        } else if (ruleValidator && value) {
          const ruleMessage: string | null = ruleValidator(value);
          if (ruleMessage) errors[name] = t(ruleMessage);
        }
      });

      touchedFields.value = touched;
      formErrors.value = errors;
      isFormValid.value = Object.keys(errors).length === 0;

      return isFormValid.value;
    };

    const resetForm = (): void => {
      formValues.value = {};
      touchedFields.value = {};
      isFormValid.value = true;

      // Project server-side field errors into form state.
      const errors: Record<string, string> = {};
      const touched: Record<string, boolean> = {};
      (currentFlow.value?.data?.fieldErrors ?? []).forEach((fieldError: FieldError) => {
        if (!(fieldError.identifier in errors)) {
          errors[fieldError.identifier] = fieldError.message;
          touched[fieldError.identifier] = true;
        }
      });
      formErrors.value = errors;
      touchedFields.value = touched;
    };

    const handleResponse = (rawResponse: EmbeddedSelfServiceFlowResponse): void => {
      const response: EmbeddedSelfServiceFlowResponse = normalize(rawResponse);
      props.onFlowChange?.(response);

      if (response.challengeToken !== undefined) {
        challengeToken = response.challengeToken ?? null;
      }

      if (response.flowStatus === EmbeddedSelfServiceFlowStatus.Error) {
        const message: string = extractErrorMessage(response, t, 'user.verification.error');
        error.value = message;
        state.value = 'failed';
        props.onError?.(new Error(message));
        return;
      }

      if (response.flowStatus === EmbeddedSelfServiceFlowStatus.Complete) {
        error.value = null;
        state.value = 'complete';
        props.onComplete?.(response);
        return;
      }

      // INCOMPLETE: render the step; a rejected code comes back with an error and without
      // additionalData, so keep the destination and code length of the step that sent the code.
      const previous: EmbeddedSelfServiceFlowResponse | null = currentFlow.value;
      currentFlow.value =
        response.data?.additionalData || !previous?.data?.additionalData
          ? response
          : {...response, data: {...response.data, additionalData: previous.data.additionalData}};
      resetForm();
      error.value = response.error ? extractErrorMessage(response, t, 'user.verification.error') : null;
      state.value = 'active';
    };

    const handleFailure = (caughtError: unknown): void => {
      // Show a generic message; an API error body is not meant for the user.
      error.value = t('user.verification.error');
      state.value = 'failed';
      props.onError?.(caughtError instanceof Error ? caughtError : new Error(String(caughtError)));
    };

    watch(
      () => props.isInitialized,
      (initialized: boolean | undefined) => {
        if (!initialized || initializationAttempted) return;
        initializationAttempted = true;

        void (async (): Promise<void> => {
          try {
            const response: EmbeddedSelfServiceFlowResponse | undefined = await props.onInitialize?.();
            if (response) handleResponse(response);
          } catch (caughtError: unknown) {
            handleFailure(caughtError);
          }
        })();
      },
      {immediate: true},
    );

    const handleInputChange = (name: string, value: string): void => {
      formValues.value = {...formValues.value, [name]: value};
      // Revalidate after a failed submit, so a corrected value enables the action again.
      if (!isFormValid.value) validate();
    };

    const handleInputBlur = (name: string): void => {
      touchedFields.value = {...touchedFields.value, [name]: true};
    };

    const handleSubmit = async (
      component: EmbeddedFlowComponent,
      data?: Record<string, string>,
      skipValidation?: boolean,
    ): Promise<void> => {
      // A second call from a custom render while one is in flight would send a second code.
      if (!currentFlow.value || isSubmitting.value) return;
      if (!skipValidation && !validate()) return;

      isSubmitting.value = true;
      error.value = null;

      try {
        const stepInputs: Record<string, string> = Object.fromEntries(
          Object.entries(data ?? {}).filter(
            ([, value]: [string, string]) => value !== null && value !== undefined && value !== '',
          ),
        );

        const response: EmbeddedSelfServiceFlowResponse | undefined = await props.onSubmit?.({
          executionId: currentFlow.value.executionId,
          ...(component.id && {action: component.id}),
          ...(challengeToken ? {challengeToken} : {}),
          inputs: stepInputs,
        });

        if (response) handleResponse(response);
      } catch (caughtError: unknown) {
        handleFailure(caughtError);
      } finally {
        isSubmitting.value = false;
      }
    };

    return (): VNode => {
      const additionalData: Record<string, unknown> = currentFlow.value?.data?.additionalData ?? {};
      const maskedDestination: unknown = additionalData[AttributeVerificationConstants.MASKED_DESTINATION_KEY];
      const destination: string | null =
        typeof maskedDestination === 'string' && maskedDestination ? maskedDestination : null;
      const headings: AuthComponentHeadingsResult = getAuthComponentHeadings(
        currentFlow.value?.data?.components ?? [],
        undefined,
        undefined,
        t('user.verification.heading', labelParams()),
        t('user.verification.subheading.generic'),
      );
      const {componentsWithoutHeadings} = headings;
      const step: FlowStepComponents = getFlowStepComponents(componentsWithoutHeadings);
      const flowIds: ReturnType<typeof collectFlowIds> = collectFlowIds(step);
      // A step with nothing to enter or submit waits for the user to open a link sent to them.
      const isAwaitingLink: boolean = state.value === 'active' && inputs().length === 0 && step.actions.length === 0;
      const title: string = resolveFlowTemplateLiterals(headings.title, {meta: meta(), t});
      // The flow's own prompt wins; the destination is added beside it, or fills in when the flow has none.
      let subtitle: string = resolveFlowTemplateLiterals(headings.subtitle, {meta: meta(), t});
      let destinationText: string | null = null;
      if (destination && headings.headingComponents.subheading) {
        destinationText = t('user.verification.destination', {destination});
      } else if (destination) {
        subtitle = t(isAwaitingLink ? 'user.verification.subheading.link' : 'user.verification.subheading', {
          destination,
        });
      }

      const isLoading: boolean = state.value === 'loading' || isSubmitting.value;
      const px: typeof withVendorCSSClassPrefix = withVendorCSSClassPrefix;
      const containerClass: string = [
        px('verify-attribute'),
        px(`verify-attribute--${props.size}`),
        px(`verify-attribute--${props.variant}`),
        props.className,
      ]
        .filter(Boolean)
        .join(' ');

      if (slots['default']) {
        const resend: EmbeddedFlowComponent | undefined = state.value === 'active' ? step.resend : undefined;
        const renderProps: BaseVerifyAttributeRenderProps = {
          additionalData,
          components: componentsWithoutHeadings,
          destination,
          destinationText,
          error: error.value,
          fieldErrors: formErrors.value,
          handleInputChange,
          handleResend: resend ? (): Promise<void> => handleSubmit(resend, undefined, true) : undefined,
          handleSubmit,
          isAwaitingLink,
          isComplete: state.value === 'complete',
          isFailed: state.value === 'failed',
          isLoading,
          isValid: isFormValid.value,
          onCancel: props.onCancel,
          onDone: isAwaitingLink ? props.onDone : undefined,
          subtitle,
          successMessage: t('user.verification.success', labelParams()),
          title,
          touched: touchedFields.value,
          values: formValues.value,
        };

        return h('div', {class: containerClass}, slots['default'](renderProps));
      }

      const showDone: boolean = isAwaitingLink && !!props.onDone;

      return h('div', {'aria-busy': isLoading, class: containerClass}, [
        state.value === 'active' && (props.showTitle || props.showSubtitle)
          ? h('div', {class: px('verify-attribute__header')}, [
              props.showTitle
                ? h(Typography, {class: px('verify-attribute__heading'), variant: 'h5'}, () => title)
                : null,
              props.showSubtitle
                ? h(Typography, {class: px('verify-attribute__subheading'), variant: 'body2'}, () => subtitle)
                : null,
              props.showSubtitle && destinationText
                ? h(Typography, {class: px('verify-attribute__destination'), variant: 'body2'}, () => destinationText)
                : null,
            ])
          : null,
        state.value === 'loading' ? h('div', {class: px('verify-attribute__loading')}, [h(Spinner)]) : null,
        error.value ? h(Alert, {class: px('verify-attribute__alert'), severity: 'error'}, () => error.value) : null,
        state.value === 'complete'
          ? h(Alert, {class: px('verify-attribute__alert'), severity: 'success'}, () =>
              t('user.verification.success', labelParams()),
            )
          : null,
        state.value === 'active'
          ? h(
              'div',
              {class: px('verify-attribute__content')},
              renderVerificationComponents(
                componentsWithoutHeadings,
                formValues.value,
                touchedFields.value,
                formErrors.value,
                isLoading,
                isFormValid.value,
                resetForm,
                handleInputChange,
                {
                  additionalData,
                  buttonClassName: [px('verify-attribute__button'), props.buttonClassName].filter(Boolean).join(' '),
                  inputClassName: [px('verify-attribute__input'), props.inputClassName].filter(Boolean).join(' '),
                  meta: meta(),
                  onInputBlur: handleInputBlur,
                  onSubmit: (component: EmbeddedFlowComponent, data?: Record<string, string>, skip?: boolean): void => {
                    void handleSubmit(component, data, skip);
                  },
                  size: props.size,
                  t,
                  variant: props.variant,
                },
              ).map((node: VNode) => withFlowTestIds(node, flowIds)),
            )
          : null,
        props.onCancel || showDone
          ? h('div', {class: px('verify-attribute__actions')}, [
              showDone
                ? h(
                    Button,
                    {
                      color: 'primary',
                      'data-testid': 'thunderid-action-verificationDone',
                      onClick: () => props.onDone?.(),
                      size: 'small',
                      variant: 'solid',
                    },
                    () => t('user.verification.buttons.done.text'),
                  )
                : null,
              props.onCancel
                ? h(
                    Button,
                    {
                      color: 'secondary',
                      'data-testid': 'thunderid-action-verificationCancel',
                      disabled: isSubmitting.value,
                      onClick: () => props.onCancel?.(),
                      size: 'small',
                      variant: 'outline',
                    },
                    () =>
                      state.value === 'active' || state.value === 'loading'
                        ? t('user.verification.buttons.cancel.text')
                        : t('user.verification.buttons.close.text'),
                  )
                : null,
            ])
          : null,
      ]);
    };
  },
});

export default BaseVerifyAttribute;
