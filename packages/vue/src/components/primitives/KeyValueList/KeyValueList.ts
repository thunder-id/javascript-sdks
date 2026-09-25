// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type KeyValuePair, withVendorCSSClassPrefix} from '@thunderid/browser';
import {type Component, type PropType, type VNode, defineComponent, h} from 'vue';

type KeyValueListProps = Readonly<{
  label?: string;
  pairs: KeyValuePair[];
}>;

/**
 * Displays label and value pairs as a two-column description list, with an optional label above it.
 */
const KeyValueList: Component = defineComponent({
  name: 'KeyValueList',
  props: {
    label: {
      default: undefined,
      type: String,
    },
    pairs: {
      required: true,
      type: Array as PropType<KeyValuePair[]>,
    },
  },
  setup(props: KeyValueListProps): () => VNode {
    return (): VNode =>
      h('div', {class: withVendorCSSClassPrefix('key-value-list')}, [
        props.label ? h('span', {class: withVendorCSSClassPrefix('key-value-list__label')}, props.label) : null,
        h(
          'dl',
          {class: withVendorCSSClassPrefix('key-value-list__list')},
          props.pairs.flatMap((pair: KeyValuePair) => [
            h('dt', {class: withVendorCSSClassPrefix('key-value-list__key')}, pair.label),
            h('dd', {class: withVendorCSSClassPrefix('key-value-list__value')}, pair.value),
          ]),
        ),
      ]);
  },
});

export default KeyValueList;
