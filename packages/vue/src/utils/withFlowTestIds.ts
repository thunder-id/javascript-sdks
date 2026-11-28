// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {EmbeddedFlowComponent, FlowStepComponents} from '@thunderid/browser';
import {type VNode, type VNodeArrayChildren, cloneVNode, isVNode} from 'vue';

/** Flow identifiers of a step's inputs (`ref`, else `id`) and actions (`id`). */
export interface FlowIds {
  actions: Set<string>;
  fields: Set<string>;
}

export const collectFlowIds = ({actions, inputs}: FlowStepComponents): FlowIds => ({
  actions: new Set(actions.map((component: EmbeddedFlowComponent) => component.id)),
  fields: new Set(inputs.map((component: EmbeddedFlowComponent) => component.ref ?? component.id)),
});

/**
 * Tags the nodes rendered from the flow with `thunderid-field-<ref>` and `thunderid-action-<id>`.
 * The shared factory keys a node by its component id and names an input by its ref.
 */
const withFlowTestIds = (node: VNode, ids: FlowIds): VNode => {
  const name: unknown = node.props?.['name'];
  let testId: string | undefined;
  if (typeof name === 'string' && ids.fields.has(name)) {
    testId = `thunderid-field-${name}`;
  } else if (node.key !== null && ids.actions.has(String(node.key))) {
    testId = `thunderid-action-${String(node.key)}`;
  }

  const children: VNode['children'] = Array.isArray(node.children)
    ? (node.children.map((child: unknown) =>
        isVNode(child) ? withFlowTestIds(child, ids) : child,
      ) as VNodeArrayChildren)
    : node.children;
  if (!testId && children === node.children) return node;

  const tagged: VNode = cloneVNode(node, testId ? {'data-testid': testId} : null);
  tagged.children = children;
  return tagged;
};

export default withFlowTestIds;
