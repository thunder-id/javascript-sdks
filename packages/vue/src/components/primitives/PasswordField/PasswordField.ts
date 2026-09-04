// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {withVendorCSSClassPrefix} from '@thunderid/browser';
import {type Component, type Ref, type SetupContext, type VNode, defineComponent, h, ref} from 'vue';
import {EyeIcon, EyeOffIcon} from '../Icons';

type PasswordFieldProps = Readonly<{
  autocomplete: string;
  disabled: boolean;
  error: string | undefined;
  label: string | undefined;
  modelValue: string;
  name: string | undefined;
  placeholder: string | undefined;
  required: boolean;
}>;

const PasswordField: Component = defineComponent({
  name: 'PasswordField',
  props: {
    /**
     * Browser autofill hint. Defaults to `current-password`; set `new-password` on the fields
     * of a change-password or sign-up form so password managers offer to generate and store a
     * new credential instead of filling the existing one.
     */
    autocomplete: {default: 'current-password', type: String},
    disabled: {default: false, type: Boolean},
    error: {default: undefined, type: String},
    label: {default: undefined, type: String},
    modelValue: {default: '', type: String},
    name: {default: undefined, type: String},
    placeholder: {default: undefined, type: String},
    required: {default: false, type: Boolean},
  },
  emits: ['update:modelValue', 'blur'],
  setup(props: PasswordFieldProps, {emit, attrs}: SetupContext): () => VNode {
    const visible: Ref<boolean> = ref(false);

    return (): VNode => {
      const hasError = !!props.error;
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
            autocomplete: props.autocomplete,
            class: withVendorCSSClassPrefix('password-field__input'),
            'data-testid': attrs['data-testid'],
            disabled: props.disabled,
            id: props.name,
            name: props.name,
            onBlur: () => emit('blur'),
            onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value),
            placeholder: props.placeholder,
            required: props.required,
            type: visible.value ? 'text' : 'password',
            value: props.modelValue,
          }),
          h(
            'button',
            {
              'aria-label': visible.value ? 'Hide password' : 'Show password',
              class: withVendorCSSClassPrefix('password-field__toggle'),
              onClick: () => {
                visible.value = !visible.value;
              },
              tabindex: -1,
              type: 'button',
            },
            visible.value ? EyeOffIcon() : EyeIcon(),
          ),
        ]),
        hasError ? h('span', {class: withVendorCSSClassPrefix('password-field__error')}, props.error) : null,
      ]);
    };
  },
});

export default PasswordField;
