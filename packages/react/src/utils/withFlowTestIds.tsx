// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {EmbeddedFlowComponent, EmbeddedFlowComponentType, FlowStepComponents} from '@thunderid/browser';
import {ReactElement, ReactNode, cloneElement, isValidElement} from 'react';

/**
 * The flow identifiers of a step's inputs and actions.
 */
export interface FlowIds {
  actions: Set<string>;
  // Input name (`ref`, else `id`) to component type.
  fields: Map<string, string>;
}

/**
 * Collects the flow identifiers of a step's inputs and actions.
 *
 * @param step - The step's inputs and actions, as `getFlowStepComponents` returns them.
 * @returns The identifiers to tag the rendered elements with.
 */
export const collectFlowIds = ({actions, inputs}: FlowStepComponents): FlowIds => ({
  actions: new Set(actions.map((component: EmbeddedFlowComponent) => component.id)),
  fields: new Map(inputs.map((component: EmbeddedFlowComponent) => [component.ref ?? component.id, component.type])),
});

/**
 * Tags the elements rendered from a flow step with `thunderid-field-<ref>` and `thunderid-action-<id>`. The shared
 * factory keys an element by its component id and names an input by its ref.
 *
 * @param node - The rendered step.
 * @param ids - The step's flow identifiers.
 * @returns The step with its inputs and actions tagged.
 */
const withFlowTestIds = (node: ReactNode, ids: FlowIds): ReactNode => {
  if (Array.isArray(node)) return node.map((child: ReactNode) => withFlowTestIds(child, ids));
  if (!isValidElement(node)) return node;

  const props: {children?: ReactNode; name?: unknown} = node.props as {children?: ReactNode; name?: unknown};
  if (typeof props.name === 'string' && ids.fields.has(props.name)) {
    const testId = `thunderid-field-${props.name}`;

    // The OTP field renders one input per character and takes no test identifier, so wrap it.
    if (ids.fields.get(props.name) === EmbeddedFlowComponentType.OtpInput) {
      return (
        <div key={node.key} data-testid={testId}>
          {node}
        </div>
      );
    }

    return cloneElement(node as ReactElement<Record<string, unknown>>, {'data-testid': testId});
  }

  const testId: string | undefined =
    node.key !== null && ids.actions.has(String(node.key)) ? `thunderid-action-${String(node.key)}` : undefined;
  const children: ReactNode = props.children === undefined ? undefined : withFlowTestIds(props.children, ids);
  if (!testId && children === props.children) return node;

  return cloneElement(node as ReactElement<Record<string, unknown>>, {
    ...(testId && {'data-testid': testId}),
    ...(props.children !== undefined && {children}),
  });
};

export default withFlowTestIds;
