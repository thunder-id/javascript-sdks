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
  currentPassword: string;
  newPassword: string;
}

type BaseChangePasswordProps = Readonly<{
  cardLayout: boolean;
  className: string;
  error: string | null;
  fieldErrors: Record<string, string>;
  loading: boolean;
  policy: PasswordPolicy;
  preferences?: Preferences;
  showRequirements: boolean;
  success: boolean;
  t?: (key: string, params?: Record<string, string | number>) => string;
  unavailable: boolean;
}>;

const RULE_ICON_SIZE = 14;

const ruleIcon = (passed: boolean): VNode =>
  passed ? CheckIcon({size: RULE_ICON_SIZE}) : XIcon({size: RULE_ICON_SIZE});

/**
 * Presentational change-password form.
 *
 * Holds no context and performs no network calls: it renders the fields, evaluates the
 * password policy for the checklist and the submit gate, and emits `submit` with the
 * validated values. Use `ChangePassword` for the context-wired variant.
 */
const BaseChangePassword: Component = defineComponent({
  name: 'BaseChangePassword',
  props: {
    /** Whether to wrap the form in a bordered card. */
    cardLayout: {default: false, type: Boolean},
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** A form-level error, typically a server failure that maps to no single field. */
    error: {default: null, type: String as PropType<string | null>},
    /** Server-supplied errors keyed by field name (`currentPassword` or `newPassword`). */
    fieldErrors: {default: () => ({}), type: Object as PropType<Record<string, string>>},
    /** Whether a submission is in flight. */
    loading: {default: false, type: Boolean},
    /**
     * The rules the new password must satisfy. Defaults to no rules, in which case the
     * checklist is empty and the only submit gate is a non-empty value; the caller is
     * expected to source this from the user type schema (see `ChangePassword`) or supply
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
     * Whether the account cannot have a password changed at all, because the user type's schema
     * defines no `password` attribute. The form is rendered inert behind an explanatory message
     * rather than hidden.
     */
    unavailable: {default: false, type: Boolean},
  },
  emits: ['submit'],
  setup(props: BaseChangePasswordProps, {emit}: SetupContext): () => VNode {
    const {t: fallbackT} = useI18n();
    const translate = (key: string, params?: Record<string, string | number>): string =>
      (props.t ?? fallbackT)(key, params);

    const currentPassword: Ref<string> = ref('');
    const newPassword: Ref<string> = ref('');
    const confirmPassword: Ref<string> = ref('');
    const submitted: Ref<boolean> = ref(false);

    // Clear the entered passwords once the container reports the write succeeded, so a shared
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
          currentPassword: currentPassword.value,
          newPassword: newPassword.value,
        },
        props.policy,
      ),
    );
    const ruleResults: ComputedRef<PasswordRuleResult[]> = computed(() => evaluation.value.ruleResults);
    const confirmMatches: ComputedRef<boolean> = computed(() => evaluation.value.confirmMatches);
    const reusesCurrent: ComputedRef<boolean> = computed(() => evaluation.value.reusesCurrent);
    // A schema with no password attribute makes every control pointless, so they are disabled
    // outright rather than left focusable behind the overlay.
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
        withVendorCSSClassPrefix('change-password'),
        props.cardLayout ? withVendorCSSClassPrefix('change-password--card') : '',
        props.className,
      ]
        .filter(Boolean)
        .join(' ');

      // Only surface the local errors once the user has attempted a submit, so the form does
      // not flag fields the user has not finished filling in.
      const confirmError: string | undefined =
        submitted.value && !confirmMatches.value ? translate('user.change_password.mismatch.error') : undefined;
      const newPasswordError: string | undefined =
        props.fieldErrors['newPassword'] ??
        (submitted.value && reusesCurrent.value ? translate('user.change_password.same.as.current.error') : undefined);

      const form: VNode = h('form', {class: rootClass, novalidate: true, onSubmit: handleSubmit}, [
        h(
          'h3',
          {class: withVendorCSSClassPrefix('change-password__heading')},
          translate('user.change_password.heading'),
        ),

        props.error ? h(Alert, {severity: 'error'}, {default: (): (VNode | string)[] => [props.error!]}) : null,

        props.success
          ? h(
              Alert,
              {severity: 'success'},
              {default: (): (VNode | string)[] => [translate('user.change_password.success')]},
            )
          : null,

        h('div', {class: withVendorCSSClassPrefix('change-password__fields')}, [
          h(PasswordField, {
            autocomplete: 'current-password',
            disabled: interactionDisabled.value,
            error: props.fieldErrors['currentPassword'],
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
                  {class: withVendorCSSClassPrefix('change-password__requirements-heading')},
                  translate('user.change_password.requirements.heading'),
                ),
                h(
                  'ul',
                  {class: withVendorCSSClassPrefix('change-password__requirements')},
                  ruleResults.value.map((rule: PasswordRuleResult) =>
                    h(
                      'li',
                      {
                        class: [
                          withVendorCSSClassPrefix('change-password__requirement'),
                          rule.passed ? withVendorCSSClassPrefix('change-password__requirement--passed') : '',
                        ]
                          .filter(Boolean)
                          .join(' '),
                        'data-passed': String(rule.passed),
                        key: rule.key,
                      },
                      [
                        h('span', {class: withVendorCSSClassPrefix('change-password__requirement-icon')}, [
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

        h('div', {class: withVendorCSSClassPrefix('change-password__actions')}, [
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

      return h('div', {class: withVendorCSSClassPrefix('change-password__unavailable')}, [
        h('div', {'aria-hidden': 'true', class: withVendorCSSClassPrefix('change-password__unavailable-content')}, [
          form,
        ]),
        h('div', {class: withVendorCSSClassPrefix('change-password__unavailable-overlay'), role: 'status'}, [
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

export default BaseChangePassword;
