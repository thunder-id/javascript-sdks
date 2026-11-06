// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {withVendorCSSClassPrefix} from '@thunderid/browser';
import {Comment, type Component, Fragment, type PropType, type SetupContext, type VNode, defineComponent, h} from 'vue';

/**
 * Whether rendered slot content holds anything other than comments (which is what `null` becomes).
 */
const hasContent = (nodes: unknown): boolean => {
  if (!Array.isArray(nodes)) {
    return false;
  }

  return nodes.some((node: unknown) => {
    if (Array.isArray(node)) {
      return hasContent(node);
    }

    if (!node || typeof node !== 'object') {
      return typeof node === 'string' && node.length > 0;
    }

    const vnode: VNode = node as VNode;

    if (vnode.type === Comment) {
      return false;
    }

    return vnode.type === Fragment ? hasContent(vnode.children) : true;
  });
};

type AdminSectionProps = Readonly<{
  block: string;
  className: string;
  description: string | undefined;
  headingLevel: 2 | 3 | 4;
  title: string | undefined;
}>;

/**
 * Frames an admin component with a title, a description and actions.
 *
 * Slots:
 * - `default` — the component's content.
 * - `actions` — controls rendered next to the title, such as a create button.
 */
const AdminSection: Component = defineComponent({
  name: 'AdminSection',
  props: {
    /** BEM block name of the component that renders the section, used for its CSS class. */
    block: {required: true, type: String},
    /** Extra CSS class added to the root element. */
    className: {default: '', type: String},
    /** Text shown under the title. */
    description: {default: undefined, type: String},
    /** Heading level of the title. */
    headingLevel: {default: 2, type: Number as PropType<2 | 3 | 4>},
    /** Heading of the section. Omitted when empty. */
    title: {default: undefined, type: String},
  },
  setup(props: AdminSectionProps, {slots}: SetupContext): () => VNode {
    return (): VNode => {
      const actions: VNode[] | undefined = slots['actions']?.();
      const hasActions: boolean = hasContent(actions);
      const hasHeader: boolean = Boolean(props.title) || hasActions;

      return h(
        'section',
        {
          class: [withVendorCSSClassPrefix('admin'), withVendorCSSClassPrefix(props.block), props.className]
            .filter(Boolean)
            .join(' '),
        },
        [
          hasHeader
            ? h(
                'div',
                {
                  class: [
                    withVendorCSSClassPrefix('admin__header'),
                    withVendorCSSClassPrefix(`${props.block}__header`),
                  ].join(' '),
                },
                [
                  h('div', {class: withVendorCSSClassPrefix('admin__heading')}, [
                    props.title
                      ? h(`h${props.headingLevel}`, {class: withVendorCSSClassPrefix('admin__title')}, props.title)
                      : null,
                    props.description
                      ? h('p', {class: withVendorCSSClassPrefix('admin__description')}, props.description)
                      : null,
                  ]),
                  hasActions ? h('div', {class: withVendorCSSClassPrefix('admin__actions')}, actions) : null,
                ],
              )
            : null,
          slots['default']?.(),
        ],
      );
    };
  },
});

export default AdminSection;
