// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ConnectionInstance} from '../models/connection';
import {FlowVariableDefinition} from '../models/flow-variable';
import {FlowVariableValue} from '../models/managed-flow';

/**
 * A choice of a `SELECT` or `CONNECTION_SELECT` variable.
 */
export interface FlowVariableOption {
  label: string;
  value: string;
}

const normalize = (value: string): string => value.toLowerCase().replace(/_/g, '-');

/**
 * Narrows what a unit may choose from, as a sharing policy decides.
 */
export interface FlowVariableOptionRestriction {
  allowedValues?: string[];
  excludedValues?: string[];
}

/**
 * Lists what a select variable can take. A `SELECT` takes the values it declares; a `CONNECTION_SELECT` takes the
 * connections of its `category` and `connectionTypes`.
 *
 * @param definition - The variable.
 * @param connections - The connections available to the organization unit.
 * @param restriction - The values a sharing policy lets the unit choose from, or takes away.
 * @returns The choices, each with the value to store.
 */
const getFlowVariableOptions = (
  definition: FlowVariableDefinition,
  connections: Pick<ConnectionInstance, 'categories' | 'id' | 'name' | 'type'>[] = [],
  restriction: FlowVariableOptionRestriction = {},
): FlowVariableOption[] => {
  const permitted = (option: FlowVariableOption): boolean =>
    (!restriction.allowedValues || restriction.allowedValues.includes(option.value)) &&
    !(restriction.excludedValues ?? []).includes(option.value);

  if (definition.type === 'SELECT') {
    return (definition.options ?? [])
      .map((option: FlowVariableValue) => ({label: String(option), value: String(option)}))
      .filter(permitted);
  }

  if (definition.type !== 'CONNECTION_SELECT') {
    return [];
  }

  const category: string | undefined = definition.category ? normalize(definition.category) : undefined;
  const vendors: string[] = (definition.connectionTypes ?? []).map(normalize);

  return connections
    .filter(
      (connection: Pick<ConnectionInstance, 'categories' | 'id' | 'name' | 'type'>) =>
        (!category || (connection.categories ?? []).map(normalize).includes(category)) &&
        (vendors.length === 0 || vendors.includes(normalize(connection.type))),
    )
    .map((connection: Pick<ConnectionInstance, 'categories' | 'id' | 'name' | 'type'>) => ({
      label: connection.name,
      value: connection.id,
    }))
    .filter(permitted);
};

export default getFlowVariableOptions;
