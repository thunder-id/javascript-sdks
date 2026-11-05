// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {EmbeddedFlowComponent, EmbeddedFlowComponentType} from '../models/embedded-flow';

// Component types that collect a value.
const INPUT_TYPES: string[] = [
  EmbeddedFlowComponentType.TextInput,
  EmbeddedFlowComponentType.PasswordInput,
  EmbeddedFlowComponentType.EmailInput,
  EmbeddedFlowComponentType.PhoneInput,
  EmbeddedFlowComponentType.OtpInput,
  EmbeddedFlowComponentType.Select,
  EmbeddedFlowComponentType.DateInput,
];

// Component types that submit a step.
const ACTION_TYPES: string[] = [EmbeddedFlowComponentType.Action, EmbeddedFlowComponentType.Resend];

/**
 * The components of a flow step that collect a value or submit the step.
 */
export interface FlowStepComponents {
  /** Components that submit the step, the resend action included. */
  actions: EmbeddedFlowComponent[];
  /** Components that collect a value. */
  inputs: EmbeddedFlowComponent[];
  /** The step's resend action, if it has one. */
  resend?: EmbeddedFlowComponent;
}

/**
 * Collects the inputs and actions of a flow step, nested components included, in document order.
 *
 * @param components - The step's components.
 * @returns The step's inputs, actions and resend action.
 * @example
 * ```typescript
 * const {actions, inputs} = getFlowStepComponents(response.data.components);
 * const isAwaitingLink = inputs.length === 0 && actions.length === 0;
 * ```
 */
const getFlowStepComponents = (
  components: EmbeddedFlowComponent[],
  step: FlowStepComponents = {actions: [], inputs: []},
): FlowStepComponents => {
  components.forEach((component: EmbeddedFlowComponent) => {
    if (INPUT_TYPES.includes(component.type)) step.inputs.push(component);
    if (ACTION_TYPES.includes(component.type)) step.actions.push(component);
    if (component.type === EmbeddedFlowComponentType.Resend && !step.resend) step.resend = component;
    if (Array.isArray(component.components)) getFlowStepComponents(component.components, step);
  });
  return step;
};

export default getFlowStepComponents;
