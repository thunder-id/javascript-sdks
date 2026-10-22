// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Component, defineComponent, h, PropType, Ref, ref, VNode} from 'vue';
import {quoted} from './storyKit';
import type {Action} from './types';

/**
 * Holds the selection and page offset a list story needs, so selecting a row and paging work the way
 * they would in an app. With `rows`, it renders a Base list and pages the rows itself; without, it
 * renders a connected list that fetches its own pages.
 */
const ListHost: Component = defineComponent({
  name: 'ListHost',
  props: {
    action: {required: true, type: Function as PropType<Action>},
    attrs: {default: () => ({}), type: Object as PropType<Record<string, unknown>>},
    is: {required: true, type: Object as PropType<Component>},
    limit: {default: 20, type: Number},
    paginated: {default: false, type: Boolean},
    rows: {default: undefined, type: Array as PropType<{id: string}[]>},
    rowsProp: {required: true, type: String},
    selectable: {default: false, type: Boolean},
    selectedProp: {required: true, type: String},
  },
  setup(props: {
    action: Action;
    attrs: Record<string, unknown>;
    is: Component;
    limit: number;
    paginated: boolean;
    rows: {id: string}[] | undefined;
    rowsProp: string;
    selectable: boolean;
    selectedProp: string;
  }): () => VNode {
    const selected: Ref<string | undefined> = ref<string | undefined>();
    const offset: Ref<number> = ref<number>(0);

    const onSelect = (row: {id: string}): void => {
      selected.value = row.id;
      props.action('select', quoted(row.id));
    };

    return (): VNode => {
      const common: Record<string, unknown> = {
        ...props.attrs,
        limit: props.limit,
        onSelect: props.selectable ? onSelect : undefined,
        [props.selectedProp]: selected.value,
      };

      if (!props.rows) return h(props.is, common);

      return h(props.is, {
        ...common,
        offset: offset.value,
        onPageChange: props.paginated
          ? (next: number): void => {
              offset.value = next;
              props.action('page-change', String(next));
            }
          : undefined,
        [props.rowsProp]: props.paginated ? props.rows.slice(offset.value, offset.value + props.limit) : props.rows,
        totalResults: props.rows.length,
      });
    };
  },
});

export default ListHost;
