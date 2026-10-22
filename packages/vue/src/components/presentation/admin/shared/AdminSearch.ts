// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type SelectOption, withVendorCSSClassPrefix} from '@thunderid/browser';
import {type Component, type PropType, type Ref, type VNode, defineComponent, h, ref, useId} from 'vue';
import type {AdminTranslate} from './useAdminTranslation';
import Button from '../../../primitives/Button/Button';
import Select from '../../../primitives/Select/Select';
import TextField from '../../../primitives/TextField/TextField';

/**
 * A search an admin list applies on the server: the attribute to match and the value it must equal.
 */
export interface AdminSearchValue {
  attribute: string;
  value: string;
}

type AdminSearchProps = Readonly<{
  attributes: SelectOption[];
  onSearch: (search: AdminSearchValue | null) => void;
  search: AdminSearchValue | null;
  t: AdminTranslate;
}>;

/**
 * Searches an admin list by one attribute. The server matches the whole value, so the search runs when
 * submitted rather than on every keystroke.
 */
const AdminSearch: Component = defineComponent({
  name: 'AdminSearch',
  props: {
    /** The attributes that can be searched, with translated labels. The select is hidden when there is one. */
    attributes: {required: true, type: Array as PropType<SelectOption[]>},
    /** Called with the search to apply on submit, or `null` when it is cleared. */
    onSearch: {required: true, type: Function as PropType<(search: AdminSearchValue | null) => void>},
    /** The search currently applied. */
    search: {default: null, type: Object as PropType<AdminSearchValue | null>},
    t: {required: true, type: Function as PropType<AdminTranslate>},
  },
  setup(props: AdminSearchProps): () => VNode {
    const uid: string = useId();
    const attribute: Ref<string> = ref(props.search?.attribute ?? props.attributes[0]?.value ?? '');
    const value: Ref<string> = ref(props.search?.value ?? '');

    return (): VNode => {
      const label: string =
        props.attributes.find((option: SelectOption) => option.value === attribute.value)?.label ?? attribute.value;
      const many: boolean = props.attributes.length > 1;

      return h(
        'form',
        {
          class: withVendorCSSClassPrefix('admin__picker'),
          onSubmit: (event: Event): void => {
            event.preventDefault();
            const trimmed: string = value.value.trim();
            props.onSearch(trimmed ? {attribute: attribute.value, value: trimmed} : null);
          },
          role: 'search',
        },
        [
          many
            ? h(Select, {
                label: props.t('admin.common.search.attribute'),
                modelValue: attribute.value,
                name: `${uid}-search-attribute`,
                'onUpdate:modelValue': (next: string): void => {
                  attribute.value = next;
                },
                options: props.attributes,
              })
            : null,
          h(TextField, {
            'aria-label': label,
            label: many ? undefined : label,
            modelValue: value.value,
            name: `${uid}-search`,
            'onUpdate:modelValue': (next: string): void => {
              value.value = next;
            },
            placeholder: props.t('admin.common.search.placeholder', {attribute: label.toLowerCase()}),
          }),
          h(
            Button,
            {type: 'submit', variant: 'outline'},
            {default: (): string => props.t('admin.common.search.submit')},
          ),
          props.search
            ? h(
                Button,
                {
                  onClick: (): void => {
                    value.value = '';
                    props.onSearch(null);
                  },
                  type: 'button',
                  variant: 'text',
                },
                {default: (): string => props.t('admin.common.search.clear')},
              )
            : null,
        ],
      );
    };
  },
});

export default AdminSearch;
