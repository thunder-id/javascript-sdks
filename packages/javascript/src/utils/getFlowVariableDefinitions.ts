// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {FlowVariableDefinition} from '../models/flow-variable';
import {ManagedFlowDefinition} from '../models/managed-flow';

const VARIABLES_NODE_TYPE = 'VARIABLES';

/**
 * Reads the variables a flow declares. A flow shared with an organization unit lists them in `variables`; a
 * flow the unit owns declares them on its `VARIABLES` node.
 *
 * @param flow - The flow, as `getFlow` returns it.
 * @returns The declared variables, empty when the flow declares none.
 */
const getFlowVariableDefinitions = (
  flow: Pick<ManagedFlowDefinition, 'nodes' | 'variables'> | undefined,
): FlowVariableDefinition[] => {
  if (!flow) {
    return [];
  }

  if (flow.variables) {
    return flow.variables;
  }

  const node = (flow.nodes ?? []).find(({type}: {type: string}) => type === VARIABLES_NODE_TYPE);

  return (node?.inputs ?? []).filter(
    (input: Record<string, unknown>) => typeof input['identifier'] === 'string' && typeof input['type'] === 'string',
  ) as unknown as FlowVariableDefinition[];
};

export default getFlowVariableDefinitions;
