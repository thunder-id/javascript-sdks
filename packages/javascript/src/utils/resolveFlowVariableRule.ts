// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {FlowVariableDefinition} from '../models/flow-variable';
import {FlowVariableValue} from '../models/managed-flow';
import {OverlayRule, ResolvedOverlay} from '../models/sharing-policy';

/**
 * What an organization unit may do with one variable, after the sharing policies that reach it are applied.
 */
export interface ResolvedFlowVariableRule {
  /**
   * The values the unit may choose from. Absent means anything the variable accepts.
   */
  allowedValues?: string[];
  /**
   * The value the variable has until the unit sets its own, or the value it is pinned to when it cannot set one.
   */
  defaultValue: FlowVariableValue | undefined;
  /**
   * Whether the unit may set its own value.
   */
  editable: boolean;
  /**
   * Values taken out of what the unit may choose.
   */
  excludedValues?: string[];
}

/**
 * Reads a value a rule carries, always written as a string, in the variable's own type.
 */
const toVariableValue = (definition: FlowVariableDefinition, raw: string): FlowVariableValue => {
  switch (definition.type) {
    case 'BOOLEAN_INPUT':
      return raw === 'true';
    case 'NUMBER_INPUT': {
      const numeric = Number(raw);

      return Number.isNaN(numeric) ? raw : numeric;
    }
    case 'SELECT': {
      const declared: FlowVariableValue | undefined = (definition.options ?? []).find(
        (option: FlowVariableValue) => String(option) === raw,
      );

      return declared ?? raw;
    }
    default:
      return raw;
  }
};

/**
 * Works out what an organization unit may do with a variable. A unit that owns the flow may set everything. For a
 * flow shared with it, a variable no policy names cannot be edited and keeps the owner's default. Without an
 * overlay, such as in a preview, every variable is editable.
 *
 * @param definition - The variable.
 * @param overlay - What the unit may do with the flow, as `getFlowOverlayRules` returns it.
 * @returns The rule that applies to the variable.
 */
const resolveFlowVariableRule = (
  definition: FlowVariableDefinition,
  overlay?: ResolvedOverlay,
): ResolvedFlowVariableRule => {
  if (!overlay) {
    return {defaultValue: definition.defaultValue, editable: true};
  }

  const rule: OverlayRule | undefined = overlay.rules?.[`variables.${definition.identifier}`];
  const pinned: string | undefined = rule?.value?.[0];
  const owned: boolean = overlay.owned ?? overlay.isOwned ?? false;

  return {
    allowedValues: owned ? undefined : rule?.allowedValues,
    defaultValue: !owned && pinned !== undefined ? toVariableValue(definition, pinned) : definition.defaultValue,
    editable: owned || rule?.editable === true,
    excludedValues: owned ? undefined : rule?.excludedValues,
  };
};

export default resolveFlowVariableRule;
