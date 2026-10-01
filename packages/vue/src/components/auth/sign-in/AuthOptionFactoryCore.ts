// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  ConsentConstants,
  FieldType,
  FlowMetadataResponse,
  EmbeddedFlowComponent,
  EmbeddedFlowComponentType,
  EmbeddedFlowTextVariant,
  EmbeddedFlowEventType,
  resolveFlowTemplateLiterals,
  resolveLogoUri,
  ResolvedLogo,
  extractEmojiFromUri,
  isEmojiUri,
  ConsentPurposeData,
  ConsentPromptData,
  ConsentDecisions,
  ConsentPurposeDecision,
  ConsentAttributeElement,
} from '@thunderid/browser';
import type {FetchUsers} from '@thunderid/browser';
import DOMPurify from 'dompurify';
import {h, type VNode} from 'vue';
import {createVueLogger} from '../../../utils/logger';
import FacebookButton from '../../adapters/FacebookButton';
import GitHubButton from '../../adapters/GitHubButton';
import GoogleButton from '../../adapters/GoogleButton';
import MicrosoftButton from '../../adapters/MicrosoftButton';
import {createField} from '../../factories/FieldFactory';
import Button from '../../primitives/Button';
import Divider from '../../primitives/Divider';
import Select from '../../primitives/Select/Select';
import Typography from '../../primitives/Typography';
import BaseUserSelect from '../../primitives/UserSelect/BaseUserSelect';

const logger: ReturnType<typeof createVueLogger> = createVueLogger('AuthOptionFactory');

/**
 * Inline helper for consent optional attribute key (mirrors ConsentCheckboxList.getConsentOptionalKey).
 */
const getConsentOptionalKey = (purposeId: string | number, attr: string): string => `consent_${purposeId}_${attr}`;

/**
 * Replaces `emoji:` URIs embedded in HTML before DOMPurify sanitization.
 *
 * DOMPurify strips unknown URI schemes from attributes (e.g. `src="emoji:🦊"` → `src=""`).
 * Converting them to inline spans first preserves the emoji content through sanitization.
 *
 * Converts:
 *   - `<img src="emoji:X" alt="Y">` → `<span role="img" aria-label="Y">X</span>`
 *   - Any remaining `emoji:X` text occurrences → `X`
 */
const resolveEmojiUrisInHtml = (html: string): string => {
  const withEmojiImages: string = html.replace(
    /<img([^>]*)src="(emoji:[^"]+)"([^>]*)\/?>/gi,
    (_match: string, pre: string, src: string, post: string): string => {
      const emoji: string = extractEmojiFromUri(src);
      if (!emoji) {
        return _match;
      }
      const altMatch: RegExpMatchArray | null = /alt="([^"]*)"/i.exec(pre + post);
      const label: string = altMatch ? altMatch[1] : emoji;
      return `<span role="img" aria-label="${label}">${emoji}</span>`;
    },
  );
  return withEmojiImages.replace(/emoji:([^\s"<>&]+)/g, (_: string, rest: string): string =>
    isEmojiUri(`emoji:${rest}`) ? rest : `emoji:${rest}`,
  );
};

type TranslationFn = (key: string, params?: Record<string, string | number>) => string;

/**
 * Get the appropriate FieldType for an input component.
 */
const getFieldType = (variant: EmbeddedFlowComponentType): FieldType => {
  switch (variant) {
    case EmbeddedFlowComponentType.EmailInput:
      return FieldType.Email;
    case EmbeddedFlowComponentType.PhoneInput:
      return FieldType.Tel;
    case EmbeddedFlowComponentType.PasswordInput:
      return FieldType.Password;
    case EmbeddedFlowComponentType.TextInput:
    default:
      return FieldType.Text;
  }
};

/**
 * Get typography variant from component variant.
 */
const getTypographyVariant = (variant: string): any => {
  const variantMap: Record<string, string> = {
    BODY_1: 'body1',
    BODY_2: 'body2',
    BUTTON_TEXT: 'body2',
    CAPTION: 'caption',
    HEADING_1: 'h1',
    HEADING_2: 'h2',
    HEADING_3: 'h3',
    HEADING_4: 'h4',
    HEADING_5: 'h5',
    HEADING_6: 'h6',
    OVERLINE: 'overline',
    SUBTITLE_1: 'subtitle1',
    SUBTITLE_2: 'subtitle2',
  } as Record<EmbeddedFlowTextVariant, string>;

  return variantMap[variant] || 'h3';
};

/**
 * Check if a button text or action matches a social provider.
 */
const matchesSocialProvider = (actionId: string, eventType: string, buttonText: string, provider: string): boolean => {
  const providerId = `${provider}_auth`;
  const providerMatches: boolean = actionId === providerId || eventType === providerId;

  if (buttonText.toLowerCase().includes(provider)) {
    return true;
  }

  return providerMatches;
};

/**
 * Create an auth component (VNode) from a flow component configuration.
 */
const createAuthComponentFromFlow = (
  component: EmbeddedFlowComponent,
  formValues: Record<string, string>,
  touchedFields: Record<string, boolean>,
  formErrors: Record<string, string>,
  isLoading: boolean,
  isFormValid: boolean,
  resetForm: () => void,
  onInputChange: (name: string, value: string) => void,
  options: {
    additionalData?: Record<string, any>;
    buttonClassName?: string;
    /** Data source for USER_SELECT fields. */
    fetchUsers?: FetchUsers;
    inStack?: boolean;
    inputClassName?: string;
    isTimeoutDisabled?: boolean;
    key?: string | number;
    meta?: FlowMetadataResponse | null;
    onInputBlur?: (name: string) => void;
    onSubmit?: (component: EmbeddedFlowComponent, data?: Record<string, any>, skipValidation?: boolean) => void;
    size?: 'small' | 'medium' | 'large';
    t?: TranslationFn;
    variant?: any;
  } = {},
): VNode | null => {
  const key: string | number = options.key ?? component.id;

  /** Resolve any remaining {{t()}} or {{meta()}} template expressions in a string at render time. */
  const resolve = (text: string | undefined): string => {
    if (!text || (!options.t && !options.meta)) {
      return text || '';
    }
    return resolveFlowTemplateLiterals(text, {meta: options.meta, t: options.t || ((k: string): string => k)});
  };

  switch (component.type) {
    case EmbeddedFlowComponentType.TextInput:
    case EmbeddedFlowComponentType.PasswordInput:
    case EmbeddedFlowComponentType.EmailInput:
    case EmbeddedFlowComponentType.PhoneInput: {
      const identifier: string = component.ref ?? '';
      const value: string = formValues[identifier] || '';
      const isTouched: boolean = touchedFields[identifier] || false;
      const error: string | undefined = isTouched ? formErrors[identifier] : undefined;
      const fieldType: FieldType = getFieldType(component.type);

      return createField({
        className: options.inputClassName,
        error,
        label: resolve(component.label) || '',
        name: identifier,
        onBlur: () => options.onInputBlur?.(identifier),
        onChange: (newValue: string) => onInputChange(identifier, newValue),
        placeholder: resolve(component.placeholder) || '',
        required: component.required || false,
        type: fieldType,
        value,
      });
    }

    case EmbeddedFlowComponentType.OtpInput: {
      const identifier: string = component.ref ?? '';
      const value: string = formValues[identifier] || '';
      const isTouched: boolean = touchedFields[identifier] || false;
      const error: string | undefined = isTouched ? formErrors[identifier] : undefined;

      // The server reports the length and character set of the code it generated, so the field
      // matches the OTP the user received. An older server omits both and the defaults apply.
      const reportedLength: number = Number(options.additionalData?.['otpLength']);
      const otpLength: number | undefined =
        Number.isInteger(reportedLength) && reportedLength > 0 ? reportedLength : undefined;
      const numericOnly: boolean = options.additionalData?.['otpNumericOnly'] !== 'false';

      return createField({
        className: options.inputClassName,
        error,
        label: resolve(component.label) || '',
        length: otpLength,
        name: identifier,
        numericOnly,
        onBlur: () => options.onInputBlur?.(identifier),
        onChange: (newValue: string) => onInputChange(identifier, newValue),
        placeholder: resolve(component.placeholder) || '',
        required: component.required || false,
        type: FieldType.Otp,
        value,
      });
    }

    case EmbeddedFlowComponentType.Action: {
      const actionId: string = component.id;
      const eventType: string = component.eventType || '';
      const buttonText: string = resolve(component.label);
      const componentVariant: string = component.variant || '';

      const shouldSkipValidation: boolean = eventType.toUpperCase() !== EmbeddedFlowEventType.Submit;

      // Determine the button type based on the event type. Default to 'submit' if not recognized.
      const buttonTypeEnum = {
        [EmbeddedFlowEventType.Submit]: 'submit',
        [EmbeddedFlowEventType.Reset]: 'reset',
        [EmbeddedFlowEventType.Cancel]: 'button',
        [EmbeddedFlowEventType.Trigger]: 'button',
        [EmbeddedFlowEventType.Back]: 'button',
      };
      const buttonType: HTMLButtonElement['type'] = buttonTypeEnum[eventType.toUpperCase()] ?? 'submit';

      const handleClick = (): void => {
        if (options.onSubmit) {
          const formData: Record<string, any> = {};
          Object.keys(formValues).forEach((field: string) => {
            formData[field] = formValues[field];
          });

          const consentPrompt: ConsentPromptData | undefined = options.additionalData?.['consentPrompt'] as
            | ConsentPromptData
            | undefined;
          if (consentPrompt && eventType.toUpperCase() === EmbeddedFlowEventType.Submit) {
            const isDeny: boolean = componentVariant.toLowerCase() !== 'primary';
            const decisions: ConsentDecisions = {
              approved: !isDeny,
              ...(isDeny ? {reason: ConsentConstants.REASON_USER_DENIED} : {}),
              purposes: consentPrompt.purposes.map(
                (p: ConsentPurposeData): ConsentPurposeDecision => ({
                  approved: !isDeny,
                  elements: [
                    // Permission purposes carry no essential elements, so the server sends null here
                    ...(p.essential ?? []).map((e): ConsentAttributeElement => ({approved: !isDeny, name: e.name})),
                    ...(p.optional ?? []).map(
                      (e): ConsentAttributeElement => ({
                        approved: !isDeny && formValues[getConsentOptionalKey(p.purposeId, e.name)] === 'true',
                        name: e.name,
                      }),
                    ),
                  ],
                  purposeName: p.purposeName ?? '',
                }),
              ),
            };
            formData['consent_decisions'] = JSON.stringify(decisions);
          }

          // For submit events, pass the form data to the onSubmit callback. For other event types, reset the form and call onSubmit with an empty data object.
          if (eventType.toUpperCase() === EmbeddedFlowEventType.Submit) {
            options.onSubmit(component, formData, shouldSkipValidation);
          } else {
            resetForm();
            options.onSubmit(component, {}, shouldSkipValidation);
          }
        }
      };

      // Render branded social login buttons for known action IDs
      if (matchesSocialProvider(actionId, eventType, buttonText, 'google')) {
        return h(GoogleButton, {class: options.buttonClassName, key, onClick: handleClick});
      }
      if (matchesSocialProvider(actionId, eventType, buttonText, 'github')) {
        return h(GitHubButton, {class: options.buttonClassName, key, onClick: handleClick});
      }
      if (matchesSocialProvider(actionId, eventType, buttonText, 'facebook')) {
        return h(FacebookButton, {class: options.buttonClassName, key, onClick: handleClick});
      }
      if (matchesSocialProvider(actionId, eventType, buttonText, 'microsoft')) {
        return h(MicrosoftButton, {class: options.buttonClassName, key, onClick: handleClick});
      }

      // Generic button for other providers / actions
      const startIconVNode: VNode | null = component.startIcon
        ? h('img', {
            alt: '',
            'aria-hidden': 'true',
            src: component.startIcon,
            style: {height: '1.25em', objectFit: 'contain', width: '1.25em'},
          })
        : null;

      const endIconVNode: VNode | null = component.endIcon
        ? h('img', {
            alt: '',
            'aria-hidden': 'true',
            src: component.endIcon,
            style: {height: '1.25em', objectFit: 'contain', width: '1.25em'},
          })
        : null;

      return h(
        Button,
        {
          class: options.buttonClassName,
          color: component.variant?.toLowerCase() === 'primary' ? 'primary' : 'secondary',
          'data-testid': 'thunderid-signin-submit',
          disabled:
            isLoading ||
            (!isFormValid && !shouldSkipValidation) ||
            options.isTimeoutDisabled ||
            (component as any).config?.disabled,
          endIcon: endIconVNode ?? undefined,
          fullWidth: true,
          key,
          onClick: handleClick,
          startIcon: startIconVNode ?? undefined,
          variant: component.variant?.toLowerCase() === 'primary' ? 'solid' : 'outline',
          type: buttonType,
        },
        {default: () => buttonText || 'Submit'},
      );
    }

    case EmbeddedFlowComponentType.Text: {
      const variant: any = getTypographyVariant(component.variant ?? '');
      const align: string = typeof (component as any).align === 'string' ? (component as any).align : 'left';

      return h(
        Typography,
        {
          key,
          style: {marginBottom: '0.5rem', textAlign: align},
          variant,
        },
        {default: () => resolve(component.label)},
      );
    }

    case EmbeddedFlowComponentType.Divider: {
      const dividerLabel: string = resolve(component.label) || '';
      return h(Divider, {key}, dividerLabel ? {default: () => dividerLabel} : undefined);
    }

    case EmbeddedFlowComponentType.Select: {
      const identifier: string = component.ref ?? '';
      const value: string = formValues[identifier] || '';
      const isTouched: boolean = touchedFields[identifier] || false;
      const error: string | undefined = isTouched ? formErrors[identifier] : undefined;

      const selectOptions: {label: string; value: string}[] = ((component as any).options || []).map((opt: any) => ({
        label: typeof opt === 'string' ? opt : String(opt.label ?? opt.value ?? ''),
        value: typeof opt === 'string' ? opt : String(opt.value ?? ''),
      }));

      return h(Select, {
        class: options.inputClassName,
        error,
        key,
        label: resolve(component.label) || '',
        modelValue: value,
        name: identifier,
        onBlur: () => options.onInputBlur?.(identifier),
        'onUpdate:modelValue': (val: string) => onInputChange(identifier, val),
        options: selectOptions,
        placeholder: resolve(component.placeholder),
        required: component.required,
      });
    }

    case EmbeddedFlowComponentType.UserSelect: {
      if (!options.fetchUsers) {
        logger.warn('USER_SELECT is only rendered where a signed-in user is available (InviteUser). Skipping render.');
        return null;
      }

      const identifier: string = component.ref ?? '';
      const value: string = formValues[identifier] || '';
      const isTouched: boolean = touchedFields[identifier] || false;
      const error: string | undefined = isTouched ? formErrors[identifier] : undefined;

      return h(BaseUserSelect, {
        class: options.inputClassName,
        component,
        error,
        fetchUsers: options.fetchUsers,
        key,
        label: resolve(component.label) || '',
        modelValue: value,
        name: identifier,
        onBlur: () => options.onInputBlur?.(identifier),
        'onUpdate:modelValue': (val: string) => onInputChange(identifier, val),
        placeholder: resolve(component.placeholder),
        required: component.required,
      });
    }

    case EmbeddedFlowComponentType.Block: {
      if (component.components && component.components.length > 0) {
        const blockChildren: (VNode | null)[] = component.components
          .map((childComponent: any, index: number) =>
            createAuthComponentFromFlow(
              childComponent,
              formValues,
              touchedFields,
              formErrors,
              isLoading,
              isFormValid,
              resetForm,
              onInputChange,
              {
                ...options,
                key: childComponent.id || `${component.id}_${index}`,
              },
            ),
          )
          .filter(Boolean);

        // The submit button's `type="submit"` (and pressing Enter in a field) would
        // otherwise trigger the browser's native form submission — a GET request to
        // the current URL with all field values (including passwords) as query params.
        // Actual submission is handled entirely via `onSubmit`/`handleClick` above.
        return h(
          'form',
          {
            id: component.id,
            key,
            onSubmit: (event: Event): void => event.preventDefault(),
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: 'calc(var(--thunderid-spacing-unit) * 2)',
            },
          },
          blockChildren,
        );
      }
      return null;
    }

    case EmbeddedFlowComponentType.RichText: {
      // NOTE: Content comes from ThunderID's own servers (server-driven UI).
      // Emoji URIs are resolved first because DOMPurify strips unknown URI schemes.
      // Manually sanitizes with `DOMPurify` before setting innerHTML (defense-in-depth).
      return h('div', {
        innerHTML: DOMPurify.sanitize(resolveEmojiUrisInHtml(resolve(component.label))),
        key,
        style: {overflowWrap: 'anywhere'},
      });
    }

    case EmbeddedFlowComponentType.Image: {
      // Bare numbers (e.g. "48") are valid HTML width/height attributes but are
      // unit-less and ignored as CSS style properties — normalize to px.
      const toCSSLength = (value: string): string => (/^\d+(\.\d+)?$/.test(value) ? `${value}px` : value);
      const explicitHeight: string = toCSSLength(resolve((component as any).height?.toString()));
      const explicitWidth: string = toCSSLength(resolve((component as any).width?.toString()));
      const alt: string = resolve((component as any).alt) || resolve(component.label) || 'Image';
      const resolvedSrc: string = resolve((component as any).src);
      // When only one dimension is explicit, let the other scale to preserve aspect
      // ratio instead of stretching it to the block-level fallback (100% width).
      const height: string = explicitHeight || (explicitWidth ? 'auto' : options.inStack ? '50px' : 'auto');
      const width: string = explicitWidth || (explicitHeight ? 'auto' : options.inStack ? '50px' : '100%');

      if (!resolvedSrc) {
        return null;
      }

      const resolvedLogo: ResolvedLogo = resolveLogoUri(resolvedSrc, alt);

      if (resolvedLogo.kind === 'emoji') {
        return h(
          'span',
          {
            'aria-label': alt,
            key,
            role: 'img',
            style: {display: 'inline-block', fontSize: height !== 'auto' ? height : '2.5em', lineHeight: 1},
          },
          resolvedLogo.glyph,
        );
      }

      return h('img', {
        alt,
        key,
        src: resolvedLogo.imgSrc,
        style: {
          height,
          objectFit: 'contain',
          width,
        },
      });
    }

    case EmbeddedFlowComponentType.Icon: {
      // Flow icon registry is not yet available in the Vue SDK.
      logger.warn(`Icon component type is not yet supported in the Vue SDK. Skipping render.`);
      return null;
    }

    case EmbeddedFlowComponentType.Stack: {
      const direction: string = (component as any).direction || 'row';
      const gap: number = (component as any).gap ?? 2;
      const align: string = (component as any).align || 'center';
      const justify: string = (component as any).justify || 'flex-start';

      const stackStyle: Record<string, string> = {
        alignItems: align,
        display: 'flex',
        flexDirection: direction,
        flexWrap: 'wrap',
        gap: `${gap * 0.5}rem`,
        justifyContent: justify,
      };

      const stackChildren: (VNode | null)[] = component.components
        ? component.components.map((childComponent: any, index: number) =>
            createAuthComponentFromFlow(
              childComponent,
              formValues,
              touchedFields,
              formErrors,
              isLoading,
              isFormValid,
              resetForm,
              onInputChange,
              {
                ...options,
                inStack: true,
                key: childComponent.id || `${component.id}_${index}`,
              },
            ),
          )
        : [];

      return h('div', {key, style: stackStyle}, stackChildren.filter(Boolean));
    }

    case EmbeddedFlowComponentType.Consent: {
      // Consent component is not yet implemented in the Vue SDK.
      logger.warn(`Consent component type is not yet fully supported in the Vue SDK.`);
      return null;
    }

    case EmbeddedFlowComponentType.Timer: {
      const textTemplate: string = resolve((component as any).label) || 'Time remaining: {time}';
      const timeoutMs: number = Number(options.additionalData?.['stepTimeout']) || 0;
      const expiresIn: number = timeoutMs > 0 ? Math.max(0, Math.floor((timeoutMs - Date.now()) / 1000)) : 0;
      const timerText: string = textTemplate.replace('{time}', String(expiresIn));

      return h('div', {class: 'thunderid-flow-timer', key}, timerText);
    }

    default:
      logger.warn(`Unsupported component type: ${(component as any).type}. Skipping render.`);
      return null;
  }
};

export type {TranslationFn};

/**
 * Processes an array of components and renders them as VNodes for sign-in.
 */
export const renderSignInComponents = (
  components: EmbeddedFlowComponent[],
  formValues: Record<string, string>,
  touchedFields: Record<string, boolean>,
  formErrors: Record<string, string>,
  isLoading: boolean,
  isFormValid: boolean,
  resetForm: () => void,
  onInputChange: (name: string, value: string) => void,
  options?: {
    additionalData?: Record<string, any>;
    buttonClassName?: string;
    inputClassName?: string;
    isTimeoutDisabled?: boolean;
    meta?: FlowMetadataResponse | null;
    onInputBlur?: (name: string) => void;
    onSubmit?: (component: EmbeddedFlowComponent, data?: Record<string, any>, skipValidation?: boolean) => void;
    size?: 'small' | 'medium' | 'large';
    t?: TranslationFn;
    variant?: any;
  },
): VNode[] =>
  components
    .map((component: any, index: number) =>
      createAuthComponentFromFlow(
        component,
        formValues,
        touchedFields,
        formErrors,
        isLoading,
        isFormValid,
        resetForm,
        onInputChange,
        {
          ...options,
          key: component.id || index,
        },
      ),
    )
    .filter((v): v is VNode => v !== null);

/**
 * Processes an array of components and renders them as VNodes for sign-up.
 * Identical to renderSignInComponents — separated for semantic clarity.
 */
export const renderSignUpComponents = (
  components: EmbeddedFlowComponent[],
  formValues: Record<string, string>,
  touchedFields: Record<string, boolean>,
  formErrors: Record<string, string>,
  isLoading: boolean,
  isFormValid: boolean,
  resetForm: () => void,
  onInputChange: (name: string, value: string) => void,
  options?: {
    additionalData?: Record<string, any>;
    buttonClassName?: string;
    inputClassName?: string;
    isTimeoutDisabled?: boolean;
    meta?: FlowMetadataResponse | null;
    onInputBlur?: (name: string) => void;
    onSubmit?: (component: EmbeddedFlowComponent, data?: Record<string, any>, skipValidation?: boolean) => void;
    size?: 'small' | 'medium' | 'large';
    t?: TranslationFn;
    variant?: any;
  },
): VNode[] =>
  components
    .map((component: any, index: number) =>
      createAuthComponentFromFlow(
        component,
        formValues,
        touchedFields,
        formErrors,
        isLoading,
        isFormValid,
        resetForm,
        onInputChange,
        {
          ...options,
          key: component.id || index,
        },
      ),
    )
    .filter((v): v is VNode => v !== null);

/**
 * Processes an array of components and renders them as VNodes for invite-user flows.
 * Identical to renderSignInComponents — separated for semantic clarity.
 */
export const renderInviteUserComponents = (
  components: EmbeddedFlowComponent[],
  formValues: Record<string, string>,
  touchedFields: Record<string, boolean>,
  formErrors: Record<string, string>,
  isLoading: boolean,
  isFormValid: boolean,
  resetForm: () => void,
  onInputChange: (name: string, value: string) => void,
  options?: {
    additionalData?: Record<string, any>;
    buttonClassName?: string;
    /** Data source for USER_SELECT fields. */
    fetchUsers?: FetchUsers;
    inputClassName?: string;
    isTimeoutDisabled?: boolean;
    meta?: FlowMetadataResponse | null;
    onInputBlur?: (name: string) => void;
    onSubmit?: (component: EmbeddedFlowComponent, data?: Record<string, any>, skipValidation?: boolean) => void;
    size?: 'small' | 'medium' | 'large';
    t?: TranslationFn;
    variant?: any;
  },
): VNode[] =>
  components
    .map((component: any, index: number) =>
      createAuthComponentFromFlow(
        component,
        formValues,
        touchedFields,
        formErrors,
        isLoading,
        isFormValid,
        resetForm,
        onInputChange,
        {
          ...options,
          key: component.id || index,
        },
      ),
    )
    .filter((v): v is VNode => v !== null);
