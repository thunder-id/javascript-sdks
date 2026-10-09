// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {bem, EmbeddedFlowComponentType, UserSelectConstants, withVendorCSSClassPrefix} from '@thunderid/browser';
import type {
  EmbeddedFlowComponent,
  FetchUsers,
  PagedSelectOptionDefaults,
  UserSelectOptionMapping,
} from '@thunderid/browser';
import {type Component, type PropType, type VNode, defineComponent, h} from 'vue';
import useI18n from '../../../composables/useI18n';
import PagedSelect from '../PagedSelect/PagedSelect';

type BaseUserSelectProps = Readonly<{
  component?: EmbeddedFlowComponent;
  disabled: boolean;
  error: string | undefined;
  fetchUsers?: FetchUsers;
  filter: string | undefined;
  helperText: string | undefined;
  id: string | undefined;
  label: string | undefined;
  mapping?: UserSelectOptionMapping;
  modelValue: string;
  name: string | undefined;
  pageSize: number | undefined;
  placeholder: string | undefined;
  required: boolean;
}>;

const USER_DEFAULTS: PagedSelectOptionDefaults = {labelAttributes: UserSelectConstants.LABEL_ATTRIBUTES};

/**
 * Single-user picker: a {@link PagedSelect} fed by the given `fetchUsers` that submits the user's ID.
 * Labels come from `display`, `username`, or `email` unless `mapping` says otherwise.
 * Building block for {@link UserSelect}; for a custom data source use {@link PagedSelect}.
 */
const BaseUserSelect: Component = defineComponent({
  name: 'BaseUserSelect',
  props: {
    component: {default: undefined, type: Object as PropType<EmbeddedFlowComponent>},
    disabled: {default: false, type: Boolean},
    error: {default: undefined, type: String},
    fetchUsers: {default: undefined, type: Function as PropType<FetchUsers>},
    filter: {default: undefined, type: String},
    helperText: {default: undefined, type: String},
    id: {default: undefined, type: String},
    label: {default: undefined, type: String},
    mapping: {default: undefined, type: Object as PropType<UserSelectOptionMapping>},
    modelValue: {default: '', type: String},
    name: {default: undefined, type: String},
    pageSize: {default: undefined, type: Number},
    placeholder: {default: undefined, type: String},
    required: {default: false, type: Boolean},
  },
  emits: ['update:modelValue'],
  setup(props: BaseUserSelectProps, {emit}): () => VNode {
    const {t} = useI18n();

    return (): VNode => {
      const userComponent: EmbeddedFlowComponent =
        props.component ??
        ({
          id: props.id ?? props.name ?? 'user-select',
          type: EmbeddedFlowComponentType.UserSelect,
        } as EmbeddedFlowComponent);

      // No manual `attrs.class` merge: Vue's attrs fallthrough already applies it to the root.
      return h(PagedSelect, {
        ...props,
        class: withVendorCSSClassPrefix(bem('user-select')),
        component: userComponent,
        defaults: USER_DEFAULTS,
        fetchOptions: props.fetchUsers,
        messages: {
          ariaLabel: t('elements.fields.user_select.aria_label') || 'Select a user',
          empty: t('elements.fields.user_select.empty') || 'No users found.',
          loading: t('elements.fields.user_select.loading') || 'Loading users…',
        },
        'onUpdate:modelValue': (value: string) => emit('update:modelValue', value),
      });
    };
  },
});

export default BaseUserSelect;
export type {BaseUserSelectProps};
