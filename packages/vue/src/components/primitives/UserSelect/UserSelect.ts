// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {EmbeddedFlowComponent, UserSelectOptionMapping} from '@thunderid/browser';
import {type Component, type PropType, type VNode, defineComponent, h} from 'vue';
import BaseUserSelect from './BaseUserSelect';
import useFetchUsers from '../../../composables/useFetchUsers';

type UserSelectProps = Readonly<{
  component?: EmbeddedFlowComponent;
  disabled: boolean;
  error: string | undefined;
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

/**
 * Single-user picker for signed-in screens. It loads the user directory itself with the signed-in
 * user's access token and submits the chosen user's ID, so it takes no data source. For any other
 * data source use {@link PagedSelect}.
 */
const UserSelect: Component = defineComponent({
  name: 'UserSelect',
  props: {
    component: {default: undefined, type: Object as PropType<EmbeddedFlowComponent>},
    disabled: {default: false, type: Boolean},
    error: {default: undefined, type: String},
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
  setup(props: UserSelectProps, {emit}): () => VNode {
    const fetchUsers = useFetchUsers();

    return (): VNode =>
      h(BaseUserSelect, {
        ...props,
        fetchUsers,
        'onUpdate:modelValue': (value: string) => emit('update:modelValue', value),
      });
  },
});

export default UserSelect;
export type {UserSelectProps};
