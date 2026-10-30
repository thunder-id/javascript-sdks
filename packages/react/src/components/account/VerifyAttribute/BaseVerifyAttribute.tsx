// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  AttributeVerificationConstants,
  EmbeddedFlowComponent,
  EmbeddedFlowComponentType,
  EmbeddedSelfServiceFlowRequest,
  EmbeddedSelfServiceFlowResponse,
  EmbeddedSelfServiceFlowStatus,
  FieldError,
  FlowStepComponents,
  Preferences,
  bem,
  buildValidatorFromRules,
  getFlowStepComponents,
  resolveFlowTemplateLiterals,
  withVendorCSSClassPrefix,
} from '@thunderid/browser';
import {
  FC,
  MutableRefObject,
  ReactElement,
  ReactNode,
  cloneElement,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import useStyles from './BaseVerifyAttribute.styles';
import ComponentRendererContext, {
  ComponentRendererMap,
} from '../../../contexts/ComponentRenderer/ComponentRendererContext';
import ComponentPreferencesContext from '../../../contexts/I18n/ComponentPreferencesContext';
import useTheme from '../../../contexts/Theme/useTheme';
import useThunderID from '../../../contexts/ThunderID/useThunderID';
import {FormField, useForm} from '../../../hooks/useForm';
import useTranslation from '../../../hooks/useTranslation';
import {cx} from '../../../styles/emotion';
import composeAffixedInputs from '../../../utils/composeAffixedInputs';
import {extractErrorMessage, normalizeFlowResponse} from '../../../utils/flowTransformer';
import getAuthComponentHeadings from '../../../utils/getAuthComponentHeadings';
import {renderVerificationComponents} from '../../auth/flow/AuthOptionFactory';
import AlertPrimitive from '../../primitives/Alert/Alert';
import Button from '../../primitives/Button/Button';
import Spinner from '../../primitives/Spinner/Spinner';
import Typography from '../../primitives/Typography/Typography';

type VerificationState = 'loading' | 'active' | 'complete' | 'failed';

interface FlowIds {
  actions: Set<string>;
  // Input name (`ref`, else `id`) to component type.
  fields: Map<string, string>;
}

// Flow identifiers of the step's inputs and actions.
const collectFlowIds = ({actions, inputs}: FlowStepComponents): FlowIds => ({
  actions: new Set(actions.map((component: EmbeddedFlowComponent) => component.id)),
  fields: new Map(inputs.map((component: EmbeddedFlowComponent) => [component.ref ?? component.id, component.type])),
});

// Tags the elements rendered from the flow with `thunderid-field-<ref>` and `thunderid-action-<id>`.
// The shared factory keys an element by its component id and names an input by its ref.
const withFlowTestIds = (node: ReactNode, ids: FlowIds): ReactNode => {
  if (Array.isArray(node)) return node.map((child: ReactNode) => withFlowTestIds(child, ids));
  if (!isValidElement(node)) return node;

  const props: {children?: ReactNode; name?: unknown} = node.props as {children?: ReactNode; name?: unknown};
  if (typeof props.name === 'string' && ids.fields.has(props.name)) {
    const testId = `thunderid-field-${props.name}`;

    // The OTP field renders one input per character and takes no test identifier, so wrap it.
    if (ids.fields.get(props.name) === EmbeddedFlowComponentType.OtpInput) {
      return (
        <div key={node.key} data-testid={testId}>
          {node}
        </div>
      );
    }

    return cloneElement(node as ReactElement<Record<string, unknown>>, {'data-testid': testId});
  }

  const testId: string | undefined =
    node.key !== null && ids.actions.has(String(node.key)) ? `thunderid-action-${String(node.key)}` : undefined;
  const children: ReactNode = props.children === undefined ? undefined : withFlowTestIds(props.children, ids);
  if (!testId && children === props.children) return node;

  return cloneElement(node as ReactElement<Record<string, unknown>>, {
    ...(testId && {'data-testid': testId}),
    ...(props.children !== undefined && {children}),
  });
};

/**
 * What {@link BaseVerifyAttribute} hands its `children` render function, so the steps can be drawn
 * with any UI.
 */
export interface BaseVerifyAttributeRenderProps {
  additionalData: Record<string, unknown>;
  /**
   * The step's components, without its headings.
   */
  components: EmbeddedFlowComponent[];
  /**
   * Masked destination the code or link was sent to, when the flow reports it.
   */
  destination: string | null;
  /**
   * Translated "Sent to …" line, set when the flow has its own prompt in `subtitle`.
   */
  destinationText: string | null;
  /**
   * Translated error of the last request, or the refusal.
   */
  error: string | null;
  fieldErrors: Record<string, string>;
  handleInputChange: (name: string, value: string) => void;
  /**
   * Sends a new code. Set only while the step has a resend action.
   */
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
  /**
   * Whether the server refused the verification or the request failed; the flow cannot continue.
   */
  isFailed: boolean;
  isLoading: boolean;
  isValid: boolean;
  /**
   * Closes the panel. Set only when the app passes `onCancel`.
   */
  onCancel?: () => void;
  /**
   * Confirms a link the user opened outside the app. Set only while the step waits for a link and
   * the app passes `onDone`.
   */
  onDone?: () => void;
  subtitle: string;
  /**
   * Translated message for a recorded verification.
   */
  successMessage: string;
  title: string;
  touched: Record<string, boolean>;
  values: Record<string, string>;
}

/**
 * Props for the BaseVerifyAttribute component.
 */
export interface BaseVerifyAttributeProps {
  /**
   * Label of the attribute being verified, used in the default heading and success message.
   */
  attributeDisplayName?: string;
  buttonClassName?: string;
  /**
   * Renders custom UI in place of the default steps. Receives the step, the values and their setters,
   * submit, resend, cancel, the destination, and the loading, error and completed state.
   */
  children?: (props: BaseVerifyAttributeRenderProps) => ReactNode;
  className?: string;
  inputClassName?: string;
  isInitialized?: boolean;
  /**
   * Called when the user closes the panel. The close action is shown only when this is set.
   */
  onCancel?: () => void;
  /**
   * Called once the server has recorded the verification.
   */
  onComplete?: (response: EmbeddedSelfServiceFlowResponse) => void;
  /**
   * Called when the user selects Done after the flow sent a link, which they confirm outside the app.
   * The Done action is shown only when this is set.
   */
  onDone?: () => void;
  /**
   * Called when the server refuses the verification or the request fails.
   */
  onError?: (error: Error) => void;
  onFlowChange?: (response: EmbeddedSelfServiceFlowResponse) => void;
  onInitialize?: () => Promise<EmbeddedSelfServiceFlowResponse>;
  onSubmit?: (payload: EmbeddedSelfServiceFlowRequest) => Promise<EmbeddedSelfServiceFlowResponse>;
  /**
   * Component-level preferences to override global i18n and theme settings.
   */
  preferences?: Preferences;
  showSubtitle?: boolean;
  showTitle?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'outlined' | 'flat';
}

/**
 * Internal component that renders the verification steps and manages flow state.
 *
 * @internal
 */
const BaseVerifyAttributeContent: FC<Omit<BaseVerifyAttributeProps, 'preferences'>> = ({
  attributeDisplayName = '',
  buttonClassName = '',
  children = undefined,
  className = '',
  inputClassName = '',
  isInitialized = true,
  onCancel = undefined,
  onComplete = undefined,
  onDone = undefined,
  onError = undefined,
  onFlowChange = undefined,
  onInitialize = undefined,
  onSubmit = undefined,
  showSubtitle = true,
  showTitle = true,
  size = 'medium',
  variant = 'outlined',
}: Omit<BaseVerifyAttributeProps, 'preferences'>): ReactElement => {
  const {theme, colorScheme} = useTheme();
  const customRenderers: ComponentRendererMap = useContext(ComponentRendererContext);
  const {t} = useTranslation();
  const {meta, vendor} = useThunderID();
  const styles: Record<string, string> = useStyles(theme, colorScheme);

  const [state, setState] = useState<VerificationState>('loading');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentFlow, setCurrentFlow] = useState<EmbeddedSelfServiceFlowResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Set before the first await, so a second call from a custom render cannot send a second code.
  const isSubmittingRef: MutableRefObject<boolean> = useRef(false);

  // Guards against a second initiation, which would send a second code.
  const initializationAttemptedRef: MutableRefObject<boolean> = useRef(false);
  const challengeTokenRef: MutableRefObject<string | null> = useRef<string | null>(null);

  const labelParams: Record<string, string> = {attribute: attributeDisplayName};

  const normalize = useCallback(
    (response: EmbeddedSelfServiceFlowResponse): EmbeddedSelfServiceFlowResponse => {
      if (!response?.data || Array.isArray(response.data.components)) {
        return response;
      }

      const {components} = normalizeFlowResponse(
        response,
        t,
        {defaultErrorKey: 'user.verification.error', resolveTranslations: false, throwOnError: false},
        meta,
      );

      return {...response, data: {...response.data, components}};
    },
    [t, meta],
  );

  const extractFormFields = useCallback(
    (components: EmbeddedFlowComponent[]): FormField[] =>
      getFlowStepComponents(components).inputs.map((component: EmbeddedFlowComponent) => {
        const ruleValidator = buildValidatorFromRules(component.validation);
        return {
          initialValue: '',
          name: component.ref ?? component.id,
          required: component.required ?? false,
          validator: (value: string) => {
            if (component.required && (!value || value.trim() === '')) {
              return t('validations.required.field.error');
            }
            if (ruleValidator && value) {
              const ruleMessage = ruleValidator(value);
              if (ruleMessage) {
                return t(ruleMessage);
              }
            }
            return null;
          },
        };
      }),
    [t],
  );

  const formFields: FormField[] = useMemo(
    () => extractFormFields(currentFlow?.data?.components ?? []),
    [currentFlow, extractFormFields],
  );

  const {
    values: formValues,
    touched: touchedFields,
    errors: formErrors,
    isValid: isFormValid,
    setValue: setFormValue,
    setTouched: setFormTouched,
    setTouchedFields,
    setErrors: setFormErrors,
    clearErrors: clearFormErrors,
    validateForm,
    touchAllFields,
    reset: resetForm,
  } = useForm<Record<string, string>>({
    fields: formFields,
    initialValues: {},
    requiredMessage: t('validations.required.field.error'),
    validateOnBlur: true,
    validateOnChange: false,
  });

  // Project server-side field errors into form state.
  useEffect(() => {
    clearFormErrors();
    const responseFieldErrors: FieldError[] | undefined = currentFlow?.data?.fieldErrors;
    if (!responseFieldErrors || responseFieldErrors.length === 0) {
      return;
    }
    const errors: Record<string, string> = {};
    const touched: Record<string, boolean> = {};
    responseFieldErrors.forEach((fe: FieldError) => {
      if (!(fe.identifier in errors)) {
        errors[fe.identifier] = fe.message;
        touched[fe.identifier] = true;
      }
    });
    setTouchedFields(touched);
    setFormErrors(errors);
  }, [currentFlow, setFormErrors, setTouchedFields, clearFormErrors]);

  const handleResponse = useCallback(
    (rawResponse: EmbeddedSelfServiceFlowResponse): void => {
      const response: EmbeddedSelfServiceFlowResponse = normalize(rawResponse);
      onFlowChange?.(response);

      if (response.challengeToken !== undefined) {
        challengeTokenRef.current = response.challengeToken ?? null;
      }

      if (response.flowStatus === EmbeddedSelfServiceFlowStatus.Error) {
        const message: string = extractErrorMessage(response, t, 'user.verification.error');
        setError(message);
        setState('failed');
        onError?.(new Error(message));
        return;
      }

      if (response.flowStatus === EmbeddedSelfServiceFlowStatus.Complete) {
        setError(null);
        setState('complete');
        onComplete?.(response);
        return;
      }

      // INCOMPLETE: render the step; a rejected code comes back with an error and without
      // additionalData, so keep the destination and code length of the step that sent the code.
      setCurrentFlow(
        (previous: EmbeddedSelfServiceFlowResponse | null): EmbeddedSelfServiceFlowResponse =>
          response.data?.additionalData || !previous?.data?.additionalData
            ? response
            : {...response, data: {...response.data, additionalData: previous.data.additionalData}},
      );
      resetForm();
      setError(response.error ? extractErrorMessage(response, t, 'user.verification.error') : null);
      setState('active');
    },
    [normalize, onFlowChange, onError, onComplete, resetForm, t],
  );

  const handleFailure = useCallback(
    (caughtError: unknown): void => {
      // Show a generic message; an API error body is not meant for the user.
      setError(t('user.verification.error'));
      setState('failed');
      onError?.(caughtError instanceof Error ? caughtError : new Error(String(caughtError)));
    },
    [onError, t],
  );

  useEffect(() => {
    if (!isInitialized || initializationAttemptedRef.current) {
      return;
    }
    initializationAttemptedRef.current = true;

    void (async (): Promise<void> => {
      try {
        const response: EmbeddedSelfServiceFlowResponse | undefined = await onInitialize?.();
        if (response) {
          handleResponse(response);
        }
      } catch (caughtError) {
        handleFailure(caughtError);
      }
    })();
  }, [isInitialized, onInitialize, handleResponse, handleFailure]);

  const handleInputChange = (name: string, value: string): void => {
    setFormValue(name, value);
  };

  const handleInputBlur = (name: string): void => {
    setFormTouched(name, true);
  };

  const handleSubmit = async (
    component: EmbeddedFlowComponent,
    data?: Record<string, string>,
    skipValidation?: boolean,
  ): Promise<void> => {
    if (!currentFlow || isSubmittingRef.current) return;

    if (!skipValidation) {
      touchAllFields();
      if (!validateForm().isValid) return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      const composedData: Record<string, string> = data ? composeAffixedInputs(data, vendor) : {};
      const inputs: Record<string, string> = Object.fromEntries(
        Object.entries(composedData).filter(
          ([, value]: [string, string]) => value !== null && value !== undefined && value !== '',
        ),
      );

      const response: EmbeddedSelfServiceFlowResponse | undefined = await onSubmit?.({
        executionId: currentFlow.executionId,
        ...(component.id && {action: component.id}),
        ...(challengeTokenRef.current ? {challengeToken: challengeTokenRef.current} : {}),
        inputs,
      });

      if (response) {
        handleResponse(response);
      }
    } catch (caughtError) {
      handleFailure(caughtError);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const additionalData: Record<string, unknown> = currentFlow?.data?.additionalData ?? {};
  const maskedDestination: unknown = additionalData[AttributeVerificationConstants.MASKED_DESTINATION_KEY];
  const destination: string | null =
    typeof maskedDestination === 'string' && maskedDestination ? maskedDestination : null;
  const headings: ReturnType<typeof getAuthComponentHeadings> = getAuthComponentHeadings(
    currentFlow?.data?.components ?? [],
    undefined,
    undefined,
    t('user.verification.heading', labelParams),
    t('user.verification.subheading.generic'),
  );
  const {componentsWithoutHeadings} = headings;
  const step: FlowStepComponents = getFlowStepComponents(componentsWithoutHeadings ?? []);
  // A step with nothing to enter or submit waits for the user to open a link sent to them.
  const isAwaitingLink: boolean = state === 'active' && formFields.length === 0 && step.actions.length === 0;
  const title: string = resolveFlowTemplateLiterals(headings.title, {meta, t});
  // The flow's own prompt wins; the destination is added beside it, or fills in when the flow has none.
  const hasFlowSubtitle = !!headings.headingComponents.subheading;
  let subtitle: string = resolveFlowTemplateLiterals(headings.subtitle, {meta, t});
  let destinationText: string | null = null;
  if (destination && hasFlowSubtitle) {
    destinationText = t('user.verification.destination', {destination});
  } else if (destination) {
    subtitle = t(isAwaitingLink ? 'user.verification.subheading.link' : 'user.verification.subheading', {destination});
  }

  const isLoading: boolean = state === 'loading' || isSubmitting;

  const containerClasses: string = cx(
    withVendorCSSClassPrefix('verify-attribute'),
    withVendorCSSClassPrefix(`verify-attribute--${size}`),
    withVendorCSSClassPrefix(`verify-attribute--${variant}`),
    styles['root'],
    variant === 'outlined' ? styles['card'] : '',
    className,
  );

  if (children) {
    const resend: EmbeddedFlowComponent | undefined = state === 'active' ? step.resend : undefined;

    return (
      <div className={containerClasses}>
        {children({
          additionalData,
          components: componentsWithoutHeadings ?? [],
          destination,
          destinationText,
          error,
          fieldErrors: formErrors,
          handleInputChange,
          handleResend: resend ? (): Promise<void> => handleSubmit(resend, undefined, true) : undefined,
          handleSubmit,
          isAwaitingLink,
          isComplete: state === 'complete',
          isFailed: state === 'failed',
          isLoading,
          isValid: isFormValid,
          onCancel,
          onDone: isAwaitingLink ? onDone : undefined,
          subtitle,
          successMessage: t('user.verification.success', labelParams),
          title,
          touched: touchedFields,
          values: formValues,
        })}
      </div>
    );
  }

  const alertClasses: string = cx(withVendorCSSClassPrefix(bem('verify-attribute', 'alert')), styles['alert']);

  return (
    <div className={containerClasses} aria-busy={isLoading}>
      {state === 'active' && (showTitle || showSubtitle) && (
        <div className={cx(withVendorCSSClassPrefix(bem('verify-attribute', 'header')), styles['header'])}>
          {showTitle && (
            <Typography
              variant="h5"
              className={cx(withVendorCSSClassPrefix(bem('verify-attribute', 'heading')), styles['heading'])}
            >
              {title}
            </Typography>
          )}
          {showSubtitle && (
            <Typography
              variant="body2"
              className={cx(withVendorCSSClassPrefix(bem('verify-attribute', 'subheading')), styles['subheading'])}
            >
              {subtitle}
            </Typography>
          )}
          {showSubtitle && destinationText && (
            <Typography
              variant="body2"
              className={cx(withVendorCSSClassPrefix(bem('verify-attribute', 'destination')), styles['subheading'])}
            >
              {destinationText}
            </Typography>
          )}
        </div>
      )}

      {state === 'loading' && (
        <div className={cx(withVendorCSSClassPrefix(bem('verify-attribute', 'loading')), styles['loading'])}>
          <Spinner size="medium" />
        </div>
      )}

      {error && (
        <AlertPrimitive variant="error" className={alertClasses}>
          <AlertPrimitive.Description>{error}</AlertPrimitive.Description>
        </AlertPrimitive>
      )}

      {state === 'complete' && (
        <AlertPrimitive variant="success" className={alertClasses}>
          <AlertPrimitive.Description>{t('user.verification.success', labelParams)}</AlertPrimitive.Description>
        </AlertPrimitive>
      )}

      {state === 'active' && (
        <div className={cx(withVendorCSSClassPrefix(bem('verify-attribute', 'content')), styles['content'])}>
          {withFlowTestIds(
            renderVerificationComponents(
              componentsWithoutHeadings ?? [],
              formValues,
              touchedFields,
              formErrors,
              isLoading,
              isFormValid,
              resetForm,
              handleInputChange,
              {
                _customRenderers: customRenderers,
                _theme: theme,
                additionalData,
                buttonClassName: cx(withVendorCSSClassPrefix(bem('verify-attribute', 'button')), buttonClassName),
                inputClassName: cx(withVendorCSSClassPrefix(bem('verify-attribute', 'input')), inputClassName),
                meta,
                onInputBlur: handleInputBlur,
                onSubmit: (component: EmbeddedFlowComponent, data?: Record<string, string>, skip?: boolean): void => {
                  void handleSubmit(component, data, skip);
                },
                size,
                t,
                variant,
                vendor,
              },
            ),
            collectFlowIds(step),
          )}
        </div>
      )}

      {(!!onCancel || (isAwaitingLink && !!onDone)) && (
        <div className={cx(withVendorCSSClassPrefix(bem('verify-attribute', 'actions')), styles['actions'])}>
          {isAwaitingLink && onDone && (
            <Button
              size="small"
              color="primary"
              variant="solid"
              onClick={onDone}
              data-testid="thunderid-action-verificationDone"
            >
              {t('user.verification.buttons.done.text')}
            </Button>
          )}
          {onCancel && (
            <Button
              size="small"
              color="secondary"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              data-testid="thunderid-action-verificationCancel"
            >
              {state === 'active' || state === 'loading'
                ? t('user.verification.buttons.cancel.text')
                : t('user.verification.buttons.close.text')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * BaseVerifyAttribute renders the server-described steps of a self attribute verification flow.
 * Accepts API functions as props to stay framework independent.
 */
const BaseVerifyAttribute: FC<BaseVerifyAttributeProps> = ({
  preferences = undefined,
  ...rest
}: BaseVerifyAttributeProps): ReactElement => {
  const content: ReactElement = <BaseVerifyAttributeContent {...rest} />;

  if (!preferences) return content;

  return <ComponentPreferencesContext.Provider value={preferences}>{content}</ComponentPreferencesContext.Provider>;
};

export default BaseVerifyAttribute;
