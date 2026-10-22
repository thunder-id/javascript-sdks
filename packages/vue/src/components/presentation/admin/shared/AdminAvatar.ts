// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {withVendorCSSClassPrefix} from '@thunderid/browser';
import {type Component, type VNode, defineComponent, h} from 'vue';

const cls = (element: string): string => withVendorCSSClassPrefix(`admin__${element}`);

/**
 * A decorative circle with a name's initials. Hidden from assistive technology, since the name is
 * always rendered next to it.
 */
const AdminAvatar: Component = defineComponent({
  name: 'AdminAvatar',
  props: {
    name: {required: true, type: String},
    size: {default: 28, type: Number},
  },
  setup(props: Readonly<{name: string; size: number}>): () => VNode {
    return (): VNode => {
      const initials: string = props.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part: string) => part.charAt(0).toUpperCase())
        .join('');

      return h(
        'span',
        {
          'aria-hidden': 'true',
          class: cls('avatar'),
          style: {fontSize: `${Math.round(props.size * 0.4)}px`, height: `${props.size}px`, width: `${props.size}px`},
        },
        initials,
      );
    };
  },
});

export default AdminAvatar;
