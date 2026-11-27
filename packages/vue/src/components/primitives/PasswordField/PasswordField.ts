// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {withVendorCSSClassPrefix} from '@thunderid/browser';
import {type Component, type Ref, type SetupContext, type VNode, defineComponent, h, ref} from 'vue';
import {EyeIcon, EyeOffIcon} from '../Icons';

type PasswordFieldProps = Readonly<{
  ariaLabel: string | undefined;
  autocomplete: string;
  disabled: boolean;
  error: string | undefined;
  helperText: string | undefined;
  hideLabel: string;
  label: string | undefined;
  modelValue: string;
  name: string | undefined;
  placeholder: string | undefined;
  readonly: boolean;
  required: boolean;
  showLabel: string;
}>;

/**
 * A password input with a show and hide button. The `append` slot holds extra content inside the field, after the
 * button, such as an action button.
 */
const PasswordField: Component = defineComponent({
  name: 'PasswordField',
  props: {
    /** Accessible name of the input, for a field that has no visible label. */
    ariaLabel: {default: undefined, type: String},
    /**
     * The browser autofill hint. Defaults to `current-password`; set `new-password` on the
     * fields of a change-password or sign-up form so password managers offer to generate and
     * store a new credential instead of filling the existing one.
     */
    autocomplete: {default: 'current-password', type: String},
    disabled: {default: false, type: Boolean},
    error: {default: undefined, type: String},
    /** Text shown under the field while it has no error. */
    helperText: {default: undefined, type: String},
    /** Accessible name of the toggle button while the password is visible. */
    hideLabel: {default: 'Hide password', type: String},
    label: {default: undefined, type: String},
    modelValue: {default: '', type: String},
    name: {default: undefined, type: String},
    placeholder: {default: undefined, type: String},
    /** Shows the value without letting it be edited. The show and hide button stays in the tab order. */
    readonly: {default: false, type: Boolean},
    required: {default: false, type: Boolean},
    /** Accessible name of the toggle button while the password is hidden. */
    showLabel: {default: 'Show password', type: String},
  },
  emits: ['update:modelValue', 'blur'],
  setup(props: PasswordFieldProps, {emit, attrs, slots}: SetupContext): () => VNode {
    const visible: Ref<boolean> = ref(false);

    return (): VNode => {
      const hasError = !!props.error;
      // The error or hint below the input describes it, for assistive technology.
      const describedById: string | undefined =
        props.name && (hasError || props.helperText) ? `${props.name}-description` : undefined;
      const wrapperClass: string = [
        withVendorCSSClassPrefix('password-field'),
        hasError ? withVendorCSSClassPrefix('password-field--error') : '',
        (attrs.class as string) || '',
      ]
        .filter(Boolean)
        .join(' ');

      return h('div', {class: wrapperClass, style: attrs.style}, [
        props.label
          ? h(
              'label',
              {
                class: withVendorCSSClassPrefix('password-field__label'),
                for: props.name,
              },
              [
                props.label,
                props.required ? h('span', {class: withVendorCSSClassPrefix('password-field__required')}, ' *') : null,
              ],
            )
          : null,
        h('div', {class: withVendorCSSClassPrefix('password-field__wrapper')}, [
          h('input', {
            'aria-describedby': describedById,
            'aria-invalid': hasError || undefined,
            'aria-label': props.ariaLabel,
            autocomplete: props.autocomplete,
            class: withVendorCSSClassPrefix('password-field__input'),
            'data-testid': attrs['data-testid'],
            disabled: props.disabled,
            id: props.name,
            name: props.name,
            onBlur: () => emit('blur'),
            onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value),
            placeholder: props.placeholder,
            readonly: props.readonly,
            required: props.required,
            type: visible.value ? 'text' : 'password',
            value: props.modelValue,
          }),
          h(
            'button',
            {
              'aria-label': visible.value ? props.hideLabel : props.showLabel,
              class: withVendorCSSClassPrefix('password-field__toggle'),
              onClick: () => {
                visible.value = !visible.value;
              },
              tabindex: props.readonly ? 0 : -1,
              type: 'button',
            },
            visible.value ? EyeOffIcon() : EyeIcon(),
          ),
          slots['append']?.(),
        ]),
        hasError
          ? h('span', {class: withVendorCSSClassPrefix('password-field__error'), id: describedById}, props.error)
          : null,
        !hasError && props.helperText
          ? h('span', {class: withVendorCSSClassPrefix('password-field__helper'), id: describedById}, props.helperText)
          : null,
      ]);
    };
  },
});

export default PasswordField;
