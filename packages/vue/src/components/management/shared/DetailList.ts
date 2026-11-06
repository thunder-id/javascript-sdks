// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {withVendorCSSClassPrefix} from '@thunderid/browser';
import {type Component, type PropType, type VNode, type VNodeChild, defineComponent, h} from 'vue';

const cls = (element: string): string => withVendorCSSClassPrefix(`admin__${element}`);

/**
 * One label and value pair of a {@link DetailList}.
 */
export interface DetailListItem {
  label: string;
  value: VNodeChild;
}

/**
 * Renders label and value pairs as a description list.
 */
const DetailList: Component = defineComponent({
  name: 'AdminDetailList',
  props: {
    items: {required: true, type: Array as PropType<DetailListItem[]>},
  },
  setup(props: Readonly<{items: DetailListItem[]}>): () => VNode {
    return (): VNode =>
      h(
        'dl',
        {class: cls('detail')},
        props.items.map((item: DetailListItem) =>
          h('div', {key: item.label, style: {display: 'contents'}}, [
            h('dt', {class: cls('detail-label')}, item.label),
            h('dd', {class: cls('detail-value')}, [item.value]),
          ]),
        ),
      );
  },
});

export default DetailList;
