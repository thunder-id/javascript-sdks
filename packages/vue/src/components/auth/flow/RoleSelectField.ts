// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type RoleOption, withVendorCSSClassPrefix} from '@thunderid/browser';
import {type Component, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';
import Checkbox from '../../primitives/Checkbox';

/**
 * A multiple-choice picker over the roles a step offers. The value is the picked role IDs, space-separated.
 */
const RoleSelectField: Component = defineComponent({
  name: 'RoleSelectField',
  props: {
    /** Names the group when the step gives it no label. */
    ariaLabel: {default: undefined, type: String},
    /** Shown when the step offers no roles. */
    emptyText: {default: undefined, type: String},
    error: {default: undefined, type: String},
    label: {default: undefined, type: String},
    modelValue: {default: '', type: String},
    name: {required: true, type: String},
    required: {default: false, type: Boolean},
    roles: {default: () => [], type: Array as PropType<RoleOption[]>},
  },
  emits: ['update:modelValue', 'blur'],
  setup(props: any, {emit}: SetupContext): () => VNode {
    const picked = (): string[] => (props.modelValue as string).split(' ').filter(Boolean);

    const toggle = (roleId: string, checked: boolean): void => {
      const current: string[] = picked();
      const next: string[] = (props.roles as RoleOption[])
        .map((role: RoleOption) => role.id)
        .filter((id: string) => (id === roleId ? checked : current.includes(id)));

      emit('update:modelValue', next.join(' '));
      emit('blur');
    };

    return (): VNode => {
      const legendId = `${props.name}-legend`;
      const roles: RoleOption[] = props.roles;
      const current: string[] = picked();

      return h(
        'fieldset',
        {
          'aria-label': props.label ? undefined : props.ariaLabel,
          'aria-labelledby': props.label ? legendId : undefined,
          class: withVendorCSSClassPrefix('role-select'),
        },
        [
          props.label
            ? h('legend', {class: withVendorCSSClassPrefix('role-select__legend'), id: legendId}, [
                props.label,
                props.required ? h('span', {class: withVendorCSSClassPrefix('role-select__required')}, ' *') : null,
              ])
            : null,
          roles.length > 0
            ? h(
                'div',
                {class: withVendorCSSClassPrefix('role-select__options')},
                roles.map((role: RoleOption) =>
                  h(Checkbox, {
                    key: role.id,
                    label: role.name,
                    modelValue: current.includes(role.id),
                    name: `${props.name}-${role.id}`,
                    'onUpdate:modelValue': (checked: boolean) => toggle(role.id, checked),
                  }),
                ),
              )
            : h('span', {class: withVendorCSSClassPrefix('role-select__empty')}, props.emptyText),
          props.error ? h('span', {class: withVendorCSSClassPrefix('role-select__error')}, props.error) : null,
        ],
      );
    };
  },
});

export default RoleSelectField;
