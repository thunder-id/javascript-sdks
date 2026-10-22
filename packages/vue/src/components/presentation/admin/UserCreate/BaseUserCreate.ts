// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {SelectOption} from '@thunderid/browser';
import {
  type Component,
  type PropType,
  type Ref,
  type SetupContext,
  type VNode,
  defineComponent,
  h,
  ref,
  useId,
} from 'vue';
import {DEFAULT_USER_CREATE_FIELDS, type UserCreateField} from './userCreateFields';
import PasswordField from '../../../primitives/PasswordField/PasswordField';
import Select from '../../../primitives/Select/Select';
import TextField from '../../../primitives/TextField/TextField';
import {type AdminFormProps, type AdminFormRenderProps, adminFormProps} from '../shared/adminFormProps';
import renderAdminForm from '../shared/renderAdminForm';
import useAdminTranslation, {type AdminTranslate} from '../shared/useAdminTranslation';

/**
 * The user `BaseUserCreate` emits on `submit`. The organization unit is added by the caller.
 */
export interface UserCreateSubmission {
  attributes: Record<string, string>;
  type: string;
}

/**
 * What `BaseUserCreate` hands its default scoped slot, so the form can be built with any UI.
 */
export interface BaseUserCreateRenderProps extends AdminFormRenderProps {
  /** The attributes to collect. */
  fields: UserCreateField[];
  /** Sets one attribute. */
  handleInputChange: (name: string, value: string) => void;
  /** Chooses the user type. */
  handleTypeChange: (type: string) => void;
  /** The chosen user type. */
  type: string;
  userTypes: SelectOption[];
  /** The attribute values, keyed by attribute name. */
  values: Record<string, string>;
}

type BaseUserCreateProps = AdminFormProps &
  Readonly<{
    fields: UserCreateField[];
    userTypes: SelectOption[];
  }>;

/**
 * A form that collects a new user's type and attributes. Holds no data of its own: pass the user
 * types and handle the `submit` event, which carries a {@link UserCreateSubmission}. Slots: `default`, a scoped slot that
 * replaces the form with custom UI and receives {@link BaseUserCreateRenderProps}.
 */
const BaseUserCreate: Component = defineComponent({
  name: 'BaseUserCreate',
  props: {
    ...adminFormProps,
    /** Attributes to collect. Defaults to username, email, given_name, family_name and password. */
    fields: {default: () => DEFAULT_USER_CREATE_FIELDS, type: Array as PropType<UserCreateField[]>},
    /** The user types to choose from. The first one is selected by default. */
    userTypes: {required: true, type: Array as PropType<SelectOption[]>},
  },
  emits: ['submit'],
  setup(props: BaseUserCreateProps, {emit, slots}: SetupContext): () => VNode {
    const t: AdminTranslate = useAdminTranslation(() => props.preferences);
    const uid: string = useId();
    const chosenType: Ref<string> = ref('');
    const values: Ref<Record<string, string>> = ref({});

    return (): VNode => {
      const type: string = chosenType.value || (props.userTypes[0]?.value ?? '');
      const isComplete: boolean =
        Boolean(type) &&
        props.fields.every((field: UserCreateField) => !field.required || Boolean(values.value[field.name]?.trim()));
      const setValue = (name: string, value: string): void => {
        values.value = {...values.value, [name]: value};
      };

      return renderAdminForm({
        block: 'user-create',
        canSubmit: isComplete,
        fields: [
          h(Select, {
            label: t('admin.users.create.fields.type'),
            modelValue: type,
            name: `${uid}-type`,
            'onUpdate:modelValue': (value: string): void => {
              chosenType.value = value;
            },
            options: props.userTypes,
            required: true,
          }),
          ...props.fields.map((field: UserCreateField) => {
            const label: string = field.label ?? t(`admin.users.create.fields.${field.name}`);

            return field.type === 'password'
              ? h(PasswordField, {
                  autocomplete: 'new-password',
                  hideLabel: t('elements.display.copyable_text.hide'),
                  key: field.name,
                  label,
                  modelValue: values.value[field.name] ?? '',
                  name: `${uid}-${field.name}`,
                  'onUpdate:modelValue': (value: string): void => setValue(field.name, value),
                  required: field.required,
                  showLabel: t('elements.display.copyable_text.show'),
                })
              : h(TextField, {
                  autoComplete: 'off',
                  key: field.name,
                  label,
                  modelValue: values.value[field.name] ?? '',
                  name: `${uid}-${field.name}`,
                  'onUpdate:modelValue': (value: string): void => setValue(field.name, value),
                  required: field.required,
                  type: field.type ?? 'text',
                });
          }),
        ],
        onSubmit: (): void => {
          const attributes: Record<string, string> = Object.fromEntries(
            Object.entries(values.value).filter(([, value]: [string, string]) => value.trim() !== ''),
          );

          emit('submit', {attributes, type} satisfies UserCreateSubmission);
        },
        props,
        renderProps: {
          fields: props.fields,
          handleInputChange: setValue,
          handleTypeChange: (value: string): void => {
            chosenType.value = value;
          },
          type,
          userTypes: props.userTypes,
          values: values.value,
        } satisfies Omit<BaseUserCreateRenderProps, keyof AdminFormRenderProps>,
        slot: slots['default'],
        submitLabel: t('admin.users.create.submit'),
        t,
        title: t('admin.users.create.title'),
      });
    };
  },
});

export default BaseUserCreate;
