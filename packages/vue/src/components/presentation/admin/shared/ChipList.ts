// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {withVendorCSSClassPrefix} from '@thunderid/browser';
import {type Component, type PropType, type VNode, defineComponent, h} from 'vue';
import Button from '../../../primitives/Button/Button';

const cls = (element: string): string => withVendorCSSClassPrefix(`admin__${element}`);

/**
 * One item of a {@link ChipList}.
 */
export interface ChipListItem {
  id: string;
  label: string;
  onRemove?: () => void;
  removeLabel?: string;
}

/**
 * Renders a list of named items, each optionally removable.
 */
const ChipList: Component = defineComponent({
  name: 'AdminChipList',
  props: {
    /** Message shown when there are no items, already translated. */
    emptyText: {required: true, type: String},
    items: {required: true, type: Array as PropType<ChipListItem[]>},
    /** Accessible name of the list, already translated. */
    label: {required: true, type: String},
  },
  setup(props: Readonly<{emptyText: string; items: ChipListItem[]; label: string}>): () => VNode {
    return (): VNode => {
      if (props.items.length === 0) {
        return h('span', {class: cls('muted')}, props.emptyText);
      }

      return h(
        'ul',
        {'aria-label': props.label, class: cls('chip-list')},
        props.items.map((item: ChipListItem) =>
          h('li', {class: cls('chip'), key: item.id}, [
            item.label,
            item.onRemove
              ? h(
                  Button,
                  {'aria-label': item.removeLabel, onClick: item.onRemove, size: 'small', variant: 'ghost'},
                  {default: (): VNode => h('span', {'aria-hidden': 'true'}, '×')},
                )
              : null,
          ]),
        ),
      );
    };
  },
});

export default ChipList;
