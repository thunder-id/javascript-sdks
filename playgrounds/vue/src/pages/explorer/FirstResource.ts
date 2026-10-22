// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {ResourceQueryResult} from '@thunderid/vue';
import {Component, defineComponent, h, PropType, VNode} from 'vue';
import {describeError} from '../../lib/events';

const notice = (message: string): VNode => h('div', {class: 'pg-warning', role: 'status'}, message);

/**
 * Runs a live story against the first resource a list composable returns, so the details stories work
 * without typing an ID. An ID set in Controls wins.
 */
const FirstResource: Component = defineComponent({
  name: 'FirstResource',
  props: {
    explicit: {default: '', type: String},
    noun: {required: true, type: String},
    pick: {required: true, type: Function as PropType<(data: unknown) => string | undefined>},
    query: {required: true, type: Function as PropType<() => ResourceQueryResult<unknown>>},
    render: {required: true, type: Function as PropType<(id: string) => VNode>},
  },
  setup(props: {
    explicit: string;
    noun: string;
    pick: (data: unknown) => string | undefined;
    query: () => ResourceQueryResult<unknown>;
    render: (id: string) => VNode;
  }): () => VNode {
    const page: ResourceQueryResult<unknown> = props.query();

    return (): VNode => {
      if (props.explicit) return props.render(props.explicit);
      if (page.isLoading.value) return notice(`Looking up the first ${props.noun}…`);
      if (page.error.value) {
        return notice(`Could not list ${props.noun}s to pick one: ${describeError(page.error.value)}. Sign in first.`);
      }

      const id: string | undefined = props.pick(page.data.value);

      return id ? props.render(id) : notice(`No ${props.noun}s on the server yet; create one first.`);
    };
  },
});

export default FirstResource;
