// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  FieldError,
  FlowExecutionError,
  FlowMetadataResponse,
  Preferences,
  buildValidatorFromRules,
  logger,
  resolveFlowTemplateLiterals,
} from '@thunderid/browser';
import {useCallback, useEffect, useRef, useState} from 'react';
import useThunderID from '../../contexts/ThunderID/useThunderID';
import {extractErrorMessage, normalizeFlowResponse} from '../../utils/flowTransformer';
import useTranslation, {UseTranslation} from '../useTranslation';
import useStepExpiry from './useStepExpiry';

/**
 * Flow response structure from the backend.
 */
export interface InviteUserFlowResponse {
  challengeToken?: string;
  data?: {
    additionalData?: Record<string, any>;
    components?: any[];
    fieldErrors?: FieldError[];
    meta?: {
      components?: any[];
    };
  };
  error?: FlowExecutionError;
  executionId: string;
  flowStatus: 'INCOMPLETE' | 'COMPLETE' | 'ERROR';
  type?: 'VIEW' | 'REDIRECTION';
}

/**
 * What an invite component hands its `children` render function, so the steps can be drawn with any UI.
 */
export interface InviteFlowRenderProps {
  /**
   * Additional data from the current flow response (e.g. rootOuId, inviteLink).
   */
  additionalData?: Record<string, any>;

  /**
   * Flow components from the current step.
   */
  components: any[];

  /**
   * API error (if any).
   */
  error?: Error | null;

  /**
   * Current flow execution ID.
   */
  executionId?: string;

  /**
   * Field validation errors.
   */
  fieldErrors: Record<string, string>;

  /**
   * Current flow execution ID.
   */
  flowExecId?: string;

  /**
   * Function to handle input blur.
   */
  handleInputBlur: (name: string) => void;

  /**
   * Function to handle input changes.
   */
  handleInputChange: (name: string, value: string) => void;

  /**
   * Function to handle form submission.
   */
  handleSubmit: (component: any, data?: Record<string, any>) => Promise<void>;

  /**
   * Loading state.
   */
  isLoading: boolean;

  /**
   * Whether the form is valid.
   */
  isValid: boolean;

  /**
   * Flow metadata returned by the platform (v2 only). `null` while loading or unavailable.
   */
  meta: FlowMetadataResponse | null;

  /**
   * Reset the flow to invite another user.
   */
  resetFlow: () => void;

  /**
   * Subtitle for the current step.
   */
  subtitle?: string;

  /**
   * Title for the current step.
   */
  title?: string;

  /**
   * Touched fields.
   */
  touched: Record<string, boolean>;

  /**
   * Form values for the current step.
   */
  values: Record<string, string>;
}

/**
 * Options for {@link useInviteFlow}.
 */
export interface UseInviteFlowOptions {
  /** The translation key of the message for a failure the server gives no message for. */
  errorKey: string;
  /** Whether the SDK is initialized; the flow starts once it is. */
  isInitialized?: boolean;
  onError?: (error: Error) => void;
  onFlowChange?: (response: InviteUserFlowResponse) => void;
  /** Makes the authenticated request that starts the flow. */
  onInitialize: (payload: Record<string, any>) => Promise<InviteUserFlowResponse>;
  /** Makes the authenticated request that submits a step. */
  onSubmit: (payload: Record<string, any>) => Promise<InviteUserFlowResponse>;
  preferences?: Preferences;
  /** What starts the flow besides `verbose`: the flow type, or the flow ID. */
  start: Record<string, unknown>;
}

/**
 * The state and actions of an invite flow, for an invite component to draw.
 */
export interface InviteFlow {
  apiError: Error | null;
  /** The step's components, normalized. */
  components: any[];
  /** The step's components without its headings, for the built-in UI. */
  componentsWithoutHeadings: any[];
  currentFlow: InviteUserFlowResponse | null;
  expireStep: () => void;
  formErrors: Record<string, string>;
  formValues: Record<string, string>;
  handleInputBlur: (name: string) => void;
  handleInputChange: (name: string, value: string) => void;
  handleSubmit: (component: any, data?: Record<string, any>) => Promise<void>;
  isFlowInitialized: boolean;
  isFormValid: boolean;
  isLoading: boolean;
  isStepExpired: boolean;
  meta: FlowMetadataResponse | null;
  /** What the component hands its `children` render function. */
  renderProps: InviteFlowRenderProps;
  resetFlow: () => void;
  resetForm: () => void;
  subtitle?: string;
  t: UseTranslation['t'];
  title?: string;
  touchedFields: Record<string, boolean>;
  validateForm: (components: any[]) => {errors: Record<string, string>; isValid: boolean};
}

// Component types that collect a value the step requires.
const VALIDATED_TYPES: string[] = [
  'TEXT_INPUT',
  'EMAIL_INPUT',
  'SELECT',
  'PHONE_INPUT',
  'OTP_INPUT',
  'DATE_INPUT',
  'USER_SELECT',
  'AUTH_FLOW_SELECT',
  'USER_TYPE_SELECT',
  'ROLE_SELECT',
];

/**
 * Runs an invite flow an administrator drives from an application: starts it, submits each step with the
 * administrator's requests, and keeps the step's form state. Shared by the invite components, which differ only in
 * what starts the flow.
 *
 * @param options - What starts the flow and the requests that run it.
 * @returns The flow's state and actions.
 */
const useInviteFlow = ({
  errorKey,
  isInitialized = true,
  onError,
  onFlowChange,
  onInitialize,
  onSubmit,
  preferences,
  start,
}: UseInviteFlowOptions): InviteFlow => {
  const {meta, isInitialized: isSdkInitialized, getStorageManager} = useThunderID();
  const {t} = useTranslation(preferences?.i18n);
  const [isLoading, setIsLoading] = useState(false);
  const [isFlowInitialized, setIsFlowInitialized] = useState(false);
  const [currentFlow, setCurrentFlow] = useState<InviteUserFlowResponse | null>(null);
  const [apiError, setApiError] = useState<Error | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [isFormValid, setIsFormValid] = useState(true);
  // A custom renderer can expire the step from the client; it holds until the next step response.
  const {expireStep, isStepExpired} = useStepExpiry(currentFlow);
  const challengeTokenRef: any = useRef<string | null>(null);
  // The latest start fields, so a new object each render does not start the flow again.
  const startRef: any = useRef(start);
  startRef.current = start;

  /**
   * Project server-side validation errors from the most recent flow response into the
   * local formErrors state so they render alongside client-side errors. First error
   * per field wins, matching the SDK's single-string-per-field render-prop shape.
   */
  useEffect(() => {
    const responseFieldErrors: FieldError[] | undefined = (currentFlow?.data as any)?.fieldErrors;
    if (!responseFieldErrors || responseFieldErrors.length === 0) {
      return;
    }
    const errors: Record<string, string> = {};
    const touched: Record<string, boolean> = {};
    for (const fe of responseFieldErrors) {
      if (!(fe.identifier in errors)) {
        errors[fe.identifier] = fe.message;
        touched[fe.identifier] = true;
      }
    }
    setFormErrors(errors);
    setTouchedFields((prev: Record<string, boolean>) => ({...prev, ...touched}));
  }, [currentFlow]);

  const initializationAttemptedRef: any = useRef(false);

  /**
   * Restore any challenge token persisted before an OAuth redirect.
   */
  useEffect(() => {
    if (!isSdkInitialized) return;

    (async (): Promise<void> => {
      try {
        const storageManager: any = await getStorageManager();
        const tempData: any = await storageManager?.getTemporaryData();
        if (tempData?.challengeToken) {
          challengeTokenRef.current = tempData.challengeToken as string;
        }
      } catch {
        // StorageManager unavailable — continue without persisted token
      }
    })();
  }, [isSdkInitialized]);

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
   * Handle error responses and extract meaningful error messages.
   * Uses the transformer's extractErrorMessage function for consistency.
   */
  const handleError: any = useCallback(
    (error: any) => {
      const errorMessage: string = extractErrorMessage(error, t, errorKey);

      // Set the API error state
      setApiError(error instanceof Error ? error : new Error(errorMessage));

      // Call the onError callback if provided
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    },
    [t, onError, errorKey],
  );

  /**
   * Normalize flow response to ensure component-driven format.
   * Transforms data.meta.components to data.components.
   */
  const normalizeFlowResponseLocal: any = useCallback(
    (response: InviteUserFlowResponse): InviteUserFlowResponse => {
      if (!response?.data?.meta?.components) {
        return response;
      }

      try {
        const {components} = normalizeFlowResponse(
          response,
          t,
          {
            defaultErrorKey: errorKey,
            resolveTranslations: false,
          },
          meta,
        );

        return {
          ...response,
          data: {
            ...response.data,
            components: components as any,
          },
        };
      } catch {
        // If transformer throws (e.g., error response), return as-is
        return response;
      }
    },
    [t, errorKey],
  );

  /**
   * Handle input value changes.
   */
  const handleInputChange: any = useCallback((name: string, value: string) => {
    setFormValues((prev: any) => ({...prev, [name]: value}));
    // Clear error when user starts typing
    setFormErrors((prev: any) => {
      const newErrors: any = {...prev};
      delete newErrors[name];
      return newErrors;
    });
  }, []);

  /**
   * Handle input blur.
   */
  const handleInputBlur: any = useCallback((name: string) => {
    setTouchedFields((prev: any) => ({...prev, [name]: true}));
  }, []);

  /**
   * Validate required fields based on components.
   */
  const validateForm: any = useCallback(
    (components: any[]): {errors: Record<string, string>; isValid: boolean} => {
      const errors: Record<string, string> = {};

      const validateComponents = (comps: any[]): any => {
        comps.forEach((comp: any) => {
          if (VALIDATED_TYPES.includes(comp.type) && comp.ref) {
            const value: any = formValues[comp.ref];
            if (comp.required && (!value || value.trim() === '')) {
              errors[comp.ref] = `${comp.label || comp.ref} is required`;
            } else {
              // Email validation
              if (comp.type === 'EMAIL_INPUT' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                errors[comp.ref] = 'Please enter a valid email address';
              }
              // Evaluate declarative validation rules from meta.components[].validation.
              if (value && !errors[comp.ref]) {
                const ruleValidator = buildValidatorFromRules(comp.validation);
                if (ruleValidator) {
                  const message = ruleValidator(value);
                  if (message) {
                    errors[comp.ref] = t(message);
                  }
                }
              }
            }
          }
          if (comp.components && Array.isArray(comp.components)) {
            validateComponents(comp.components);
          }
        });
      };

      validateComponents(components);

      return {errors, isValid: Object.keys(errors).length === 0};
    },
    [formValues],
  );

  /**
   * Handle form submission.
   */
  const handleSubmit: any = useCallback(
    async (component: any, data?: Record<string, any>) => {
      if (!currentFlow) {
        return;
      }

      // Validate form before submission
      const components: any = currentFlow.data?.components || [];
      const validation: any = validateForm(components);

      if (!validation.isValid) {
        setFormErrors(validation.errors);
        setIsFormValid(false);
        // Mark all fields as touched
        const touched: Record<string, boolean> = {};
        Object.keys(validation.errors).forEach((key: any) => {
          touched[key] = true;
        });
        setTouchedFields((prev: any) => ({...prev, ...touched}));
        return;
      }

      setIsLoading(true);
      setApiError(null);
      setIsFormValid(true);

      try {
        // Build payload with form values
        const inputs: any = data || formValues;

        const payload: Record<string, any> = {
          executionId: currentFlow.executionId,
          inputs,
          verbose: true,
          ...(challengeTokenRef.current ? {challengeToken: challengeTokenRef.current} : {}),
        };

        // Add action ID if component has one
        if (component?.id) {
          payload['action'] = component.id;
        }

        const rawResponse: any = await onSubmit(payload);
        const response: any = normalizeFlowResponseLocal(rawResponse);
        onFlowChange?.(response);

        await setChallengeToken(response.challengeToken ?? null);

        // Check for error status
        if (response.flowStatus === 'ERROR') {
          handleError(response);
          return;
        }

        // Update current flow and reset form for next step
        setCurrentFlow(response);
        setFormValues({});
        setFormErrors({});
        setTouchedFields({});

        // Display error from INCOMPLETE response
        if (response?.error) {
          handleError(response);
        }
      } catch (err) {
        handleError(err);
      } finally {
        setIsLoading(false);
      }
    },
    [currentFlow, formValues, validateForm, onSubmit, onFlowChange, handleError, normalizeFlowResponseLocal],
  );

  /**
   * Reset the flow to invite another user.
   */
  const resetFlow: any = useCallback(() => {
    setIsFlowInitialized(false);
    setCurrentFlow(null);
    setApiError(null);
    setFormValues({});
    setFormErrors({});
    setTouchedFields({});
    initializationAttemptedRef.current = false;
  }, []);

  /**
   * reset form values, errors, and touched fields to initial state
   */
  const resetForm = useCallback(() => {
    setFormValues({});
    setFormErrors({});
    setTouchedFields({});
    setApiError(null);
    setIsFormValid(true);
  }, []);

  /**
   * Initialize the flow on component mount.
   */
  useEffect(() => {
    if (isInitialized && !isFlowInitialized && !initializationAttemptedRef.current) {
      initializationAttemptedRef.current = true;

      (async (): Promise<void> => {
        setIsLoading(true);
        setApiError(null);

        try {
          const payload: any = {
            ...startRef.current,
            verbose: true,
          };

          const rawResponse: any = await onInitialize(payload);
          const response: any = normalizeFlowResponseLocal(rawResponse);
          await setChallengeToken(response.challengeToken ?? null);
          setCurrentFlow(response);
          setIsFlowInitialized(true);
          onFlowChange?.(response);

          // Check for immediate error
          if (response.flowStatus === 'ERROR') {
            handleError(response);
          }
        } catch (err) {
          handleError(err);
        } finally {
          setIsLoading(false);
        }
      })();
    }
  }, [isInitialized, isFlowInitialized, onInitialize, onFlowChange, handleError, normalizeFlowResponseLocal]);

  /**
   * Recalculate form validity whenever form values or components change.
   * This ensures the submit button is enabled/disabled correctly as the user types.
   */
  useEffect(() => {
    if (currentFlow && isFlowInitialized) {
      const components: any = currentFlow.data?.components || [];
      if (components.length > 0) {
        const validation: any = validateForm(components);
        setIsFormValid(validation.isValid);
      }
    }
  }, [formValues, currentFlow, isFlowInitialized, validateForm]);

  /**
   * Extract title and subtitle from components.
   */
  const extractHeadings: any = useCallback(
    (components: any[]): {subtitle?: string; title?: string} => {
      // The flow writes its texts as translation templates, so resolve them here as the field labels are.
      const resolve = (text: string): string => resolveFlowTemplateLiterals(text, {meta, t});
      let title: string | undefined;
      let subtitle: string | undefined;

      components.forEach((comp: any) => {
        if (comp.type === 'TEXT') {
          if (comp.variant === 'HEADING_1' && !title) {
            title = comp.label && resolve(comp.label);
          } else if ((comp.variant === 'HEADING_2' || comp.variant === 'SUBTITLE_1') && !subtitle) {
            subtitle = comp.label && resolve(comp.label);
          }
        }
      });

      return {subtitle, title};
    },
    [meta, t],
  );

  // Get components from normalized response, with fallback to meta.components
  const components: any = currentFlow?.data?.components || currentFlow?.data?.meta?.components || [];
  const {title, subtitle} = extractHeadings(components);
  // Headings are drawn by the card header, so the built-in UI leaves them out of the form.
  const componentsWithoutHeadings: any[] = components.filter(
    (comp: any) => !(comp.type === 'TEXT' && (comp.variant === 'HEADING_1' || comp.variant === 'HEADING_2')),
  );

  const renderProps: InviteFlowRenderProps = {
    additionalData: currentFlow?.data?.additionalData,
    components,
    error: apiError,
    executionId: currentFlow?.executionId,
    fieldErrors: formErrors,
    handleInputBlur,
    handleInputChange,
    handleSubmit,
    isLoading,
    isValid: isFormValid,
    meta,
    resetFlow,
    subtitle,
    title,
    touched: touchedFields,
    values: formValues,
  };

  return {
    apiError,
    components,
    componentsWithoutHeadings,
    currentFlow,
    expireStep,
    formErrors,
    formValues,
    handleInputBlur,
    handleInputChange,
    handleSubmit,
    isFlowInitialized,
    isFormValid,
    isLoading,
    isStepExpired,
    meta,
    renderProps,
    resetFlow,
    resetForm,
    subtitle,
    t,
    title,
    touchedFields,
    validateForm,
  };
};

export default useInviteFlow;
