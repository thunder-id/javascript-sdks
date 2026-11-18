// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  ChangePasswordFormEvaluation,
  PasswordPolicy,
  PasswordRuleResult,
  Preferences,
  evaluateChangePasswordForm,
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
  ref,
  watch,
} from 'vue';
import useI18n from '../../../composables/useI18n';
import Alert from '../../primitives/Alert/Alert';
import Button from '../../primitives/Button/Button';
import {CheckIcon, XIcon} from '../../primitives/Icons';
import PasswordField from '../../primitives/PasswordField/PasswordField';

/**
 * The values collected by the form and emitted on `submit`.
 */
export interface ChangePasswordValues {
  /**
   * The current value, empty when the user left it blank. It isn't required on the client, since
   * only the server knows whether the user already holds a value to prove.
   */
  currentPassword: string;
  newPassword: string;
}

type BaseChangeCredentialProps = Readonly<{
  cardLayout: boolean;
  className: string;
  credentialDisplayName: string;
  error: string | null;
  fieldErrors: Record<string, string>;
  loading: boolean;
  policy: PasswordPolicy;
  preferences?: Preferences;
  showRequirements: boolean;
  success: boolean;
  t?: (key: string, params?: Record<string, string | number>) => string;
  title?: string;
  unavailable: boolean;
}>;

const ruleIcon = (passed: boolean): VNode => (passed ? CheckIcon() : XIcon());

/**
 * Presentational change-credential form: current value, new value and confirmation.
 *
 * Holds no context and performs no network calls: it renders the fields, evaluates the
 * policy for the checklist and the submit gate, and emits `submit` with the validated
 * values. Use `ChangeCredential` for the context-wired variant.
 */
const BaseChangeCredential: Component = defineComponent({
  name: 'BaseChangeCredential',
  props: {
    /** Whether to wrap the form in a bordered card. */
    cardLayout: {default: false, type: Boolean},
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /**
     * The human-readable name of the credential, substituted into every default label,
     * placeholder and message (for example "Change {credential}", "New {credential}").
     * Defaults to `Password`. `ChangeCredential` resolves this from the attribute's own
     * `displayName` in the user schema; set it directly here when using this presentational
     * component without that context.
     */
    credentialDisplayName: {default: 'Password', type: String},
    /** A form-level error, typically a server failure that maps to no single field. */
    error: {default: null, type: String as PropType<string | null>},
    /** Server-supplied errors keyed by field name (`currentPassword`, `newPassword`). */
    fieldErrors: {default: () => ({}), type: Object as PropType<Record<string, string>>},
    /** Whether a submission is in flight. */
    loading: {default: false, type: Boolean},
    /**
     * The rules the new value must satisfy. Defaults to no rules, in which case the
     * checklist is empty and the only submit gate is a non-empty value; the caller is
     * expected to source this from the user type schema (see `ChangeCredential`) or supply
     * its own.
     */
    policy: {default: () => ({}), type: Object as PropType<PasswordPolicy>},
    /** Component-level preferences to override global preferences. */
    preferences: {default: undefined, type: Object as PropType<Preferences>},
    /** Whether to render the live requirement checklist. */
    showRequirements: {default: true, type: Boolean},
    /** Whether the last submission succeeded. */
    success: {default: false, type: Boolean},
    /** Translation function, injected by the container so both variants resolve the same bundle. */
    t: {
      default: undefined,
      type: Function as PropType<(key: string, params?: Record<string, string | number>) => string>,
    },
    /**
     * Overrides the default "Change {credential}" heading. Pass an empty string to omit the
     * heading entirely, for example when an app's own surrounding layout (a card header, a
     * dialog title) already names the credential and a second heading would be redundant.
     * Defaults to the translated `user.change_password.heading` string.
     */
    title: {default: undefined, type: String},
    /**
     * Whether the account cannot have this credential changed at all, because the user
     * type's schema defines no attribute of this name. The form is rendered inert behind an
     * explanatory message rather than hidden.
     */
    unavailable: {default: false, type: Boolean},
  },
  emits: ['submit'],
  setup(props: BaseChangeCredentialProps, {emit}: SetupContext): () => VNode {
    const {t: fallbackT} = useI18n();
    // Substituted into every default label, placeholder and message. A caller-supplied
    // translation that carries no `{credential}`/`{credentialLower}` placeholder is unaffected.
    const labelParams: ComputedRef<Record<string, string>> = computed(() => ({
      credential: props.credentialDisplayName,
      credentialLower: props.credentialDisplayName.toLowerCase(),
    }));
    const translate = (key: string, params?: Record<string, string | number>): string =>
      (props.t ?? fallbackT)(key, {...labelParams.value, ...params});
    // `title` overrides the default heading; an explicit empty string omits it entirely.
    const resolvedTitle: ComputedRef<string> = computed(() => props.title ?? translate('user.change_password.heading'));

    const currentPassword: Ref<string> = ref('');
    const newPassword: Ref<string> = ref('');
    const confirmPassword: Ref<string> = ref('');
    const submitted: Ref<boolean> = ref(false);

    // Clear the entered values once the container reports the write succeeded, so a shared
    // machine is not left with the new credential sitting in the form.
    watch(
      () => props.success,
      (succeeded: boolean): void => {
        if (!succeeded) return;

        currentPassword.value = '';
        newPassword.value = '';
        confirmPassword.value = '';
        submitted.value = false;
      },
    );

    const evaluation: ComputedRef<ChangePasswordFormEvaluation> = computed(() =>
      evaluateChangePasswordForm(
        {
          confirmPassword: confirmPassword.value,
          newPassword: newPassword.value,
        },
        props.policy,
      ),
    );
    const ruleResults: ComputedRef<PasswordRuleResult[]> = computed(() => evaluation.value.ruleResults);
    const confirmMatches: ComputedRef<boolean> = computed(() => evaluation.value.confirmMatches);
    // A schema with no attribute of this name makes every control pointless, so they are
    // disabled outright rather than left focusable behind the overlay.
    const interactionDisabled: ComputedRef<boolean> = computed(() => props.loading || props.unavailable);
    const canSubmit: ComputedRef<boolean> = computed(() => !interactionDisabled.value && evaluation.value.isValid);

    function handleSubmit(event: Event): void {
      event.preventDefault();
      submitted.value = true;

      if (!canSubmit.value) return;

      emit('submit', {currentPassword: currentPassword.value, newPassword: newPassword.value});
    }

    return (): VNode => {
      const rootClass: string = [
        withVendorCSSClassPrefix('change-credential'),
        props.cardLayout ? withVendorCSSClassPrefix('change-credential--card') : '',
        props.className,
      ]
        .filter(Boolean)
        .join(' ');

      // Only surface the local error once the user has attempted a submit, so the form does
      // not flag fields the user has not finished filling in.
      const confirmError: string | undefined =
        submitted.value && !confirmMatches.value ? translate('user.change_password.mismatch.error') : undefined;
      const currentPasswordError: string | undefined = props.fieldErrors['currentPassword'];
      const newPasswordError: string | undefined = props.fieldErrors['newPassword'];

      const form: VNode = h('form', {class: rootClass, novalidate: true, onSubmit: handleSubmit}, [
        resolvedTitle.value
          ? h('h3', {class: withVendorCSSClassPrefix('change-credential__heading')}, resolvedTitle.value)
          : null,

        props.error ? h(Alert, {severity: 'error'}, {default: (): (VNode | string)[] => [props.error!]}) : null,

        props.success
          ? h(
              Alert,
              {severity: 'success'},
              {default: (): (VNode | string)[] => [translate('user.change_password.success')]},
            )
          : null,

        h('div', {class: withVendorCSSClassPrefix('change-credential__fields')}, [
          h(PasswordField, {
            autocomplete: 'current-password',
            disabled: interactionDisabled.value,
            error: currentPasswordError,
            label: translate('user.change_password.current.label'),
            modelValue: currentPassword.value,
            name: 'currentPassword',
            'onUpdate:modelValue': (value: string): void => {
              currentPassword.value = value;
            },
            placeholder: translate('user.change_password.current.placeholder'),
          }),

          h(PasswordField, {
            autocomplete: 'new-password',
            disabled: interactionDisabled.value,
            error: newPasswordError,
            label: translate('user.change_password.new.label'),
            modelValue: newPassword.value,
            name: 'newPassword',
            'onUpdate:modelValue': (value: string): void => {
              newPassword.value = value;
            },
            placeholder: translate('user.change_password.new.placeholder'),
            required: true,
          }),

          props.showRequirements && ruleResults.value.length > 0
            ? h('div', {}, [
                h(
                  'p',
                  {class: withVendorCSSClassPrefix('change-credential__requirements-heading')},
                  translate('user.change_password.requirements.heading'),
                ),
                h(
                  'ul',
                  {class: withVendorCSSClassPrefix('change-credential__requirements')},
                  ruleResults.value.map((rule: PasswordRuleResult) =>
                    h(
                      'li',
                      {
                        class: [
                          withVendorCSSClassPrefix('change-credential__requirement'),
                          rule.passed ? withVendorCSSClassPrefix('change-credential__requirement--passed') : '',
                        ]
                          .filter(Boolean)
                          .join(' '),
                        'data-passed': String(rule.passed),
                        key: rule.key,
                      },
                      [
                        h('span', {class: withVendorCSSClassPrefix('change-credential__requirement-icon')}, [
                          ruleIcon(rule.passed),
                        ]),
                        h('span', {}, translate(rule.messageKey, rule.params)),
                      ],
                    ),
                  ),
                ),
              ])
            : null,

          h(PasswordField, {
            autocomplete: 'new-password',
            disabled: interactionDisabled.value,
            error: confirmError,
            label: translate('user.change_password.confirm.label'),
            modelValue: confirmPassword.value,
            name: 'confirmPassword',
            'onUpdate:modelValue': (value: string): void => {
              confirmPassword.value = value;
            },
            placeholder: translate('user.change_password.confirm.placeholder'),
            required: true,
          }),
        ]),

        h('div', {class: withVendorCSSClassPrefix('change-credential__actions')}, [
          h(
            Button,
            {
              color: 'primary',
              disabled: !canSubmit.value,
              loading: props.loading,
              type: 'submit',
              variant: 'solid',
            },
            {
              default: (): (VNode | string)[] => [translate('user.change_password.submit')],
            },
          ),
        ]),
      ]);

      if (!props.unavailable) {
        return form;
      }

      return h('div', {class: withVendorCSSClassPrefix('change-credential__unavailable')}, [
        h('div', {'aria-hidden': 'true', class: withVendorCSSClassPrefix('change-credential__unavailable-content')}, [
          form,
        ]),
        h('div', {class: withVendorCSSClassPrefix('change-credential__unavailable-overlay'), role: 'status'}, [
          h(
            Alert,
            {severity: 'warning'},
            {
              default: (): (VNode | string)[] => [
                h('strong', translate('user.change_password.unavailable.heading')),
                h('div', translate('user.change_password.unavailable.description')),
              ],
            },
          ),
        ]),
      ]);
    };
  },
});

export default BaseChangeCredential;
