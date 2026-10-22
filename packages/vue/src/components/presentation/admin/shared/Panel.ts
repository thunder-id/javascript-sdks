// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {withVendorCSSClassPrefix} from '@thunderid/browser';
import {type Component, type SetupContext, type VNode, defineComponent, h} from 'vue';

const cls = (element: string): string => withVendorCSSClassPrefix(`admin__${element}`);

/**
 * A bordered block with a heading, used to group parts of a details view. Accepts an `actions` slot
 * rendered next to the heading.
 */
const Panel: Component = defineComponent({
  name: 'AdminPanel',
  props: {
    title: {required: true, type: String},
  },
  setup(props: Readonly<{title: string}>, {slots}: SetupContext): () => VNode {
    return (): VNode =>
      h('section', {class: cls('panel')}, [
        h('div', {class: cls('panel-header')}, [
          h('h3', {class: cls('panel-title')}, props.title),
          slots['actions']?.(),
        ]),
        slots['default']?.(),
      ]);
  },
});

export default Panel;
