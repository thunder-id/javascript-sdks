// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {FlowVariableValue, FlowVariables} from './managed-flow';

/**
 * The input a flow variable is edited with.
 */
export type FlowVariableType =
  | 'TEXT_INPUT'
  | 'EMAIL_INPUT'
  | 'PHONE_INPUT'
  | 'NUMBER_INPUT'
  | 'DATE_INPUT'
  | 'BOOLEAN_INPUT'
  | 'SELECT'
  | 'CONNECTION_SELECT';

/**
 * A rule a text value has to meet.
 */
export interface FlowVariableValidationRule {
  /**
   * The message shown when the rule fails. An i18n key or a literal string.
   */
  message?: string;
  type: 'regex' | 'minLength' | 'maxLength';
  value: string | number;
}

/**
 * A variable a flow declares on its `VARIABLES` node.
 */
export interface FlowVariableDefinition {
  /**
   * For a `CONNECTION_SELECT`: the kind of connection it takes, such as `IDENTITY_PROVIDER`.
   */
  category?: string;
  /**
   * For a `CONNECTION_SELECT`: limits it to these vendors, such as `google`.
   */
  connectionTypes?: string[];
  /**
   * The value the variable has until another is set.
   */
  defaultValue?: FlowVariableValue;
  description?: string;
  /**
   * Name of the variable, which a `{{var(name)}}` placeholder uses.
   */
  identifier: string;
  label?: string;
  /**
   * For a `NUMBER_INPUT`: the highest value.
   */
  max?: number;
  /**
   * For a `NUMBER_INPUT`: the lowest value.
   */
  min?: number;
  /**
   * For a `SELECT`: the values it can take.
   */
  options?: FlowVariableValue[];
  type: FlowVariableType;
  validation?: FlowVariableValidationRule[];
}

/**
 * The values an organization unit has set for a flow's variables, keyed by identifier. A variable it has
 * not set is absent.
 */
export type FlowVariableValues = FlowVariables['values'];

/**
 * Why a value does not fit its variable. `message` is set when the variable's own rule supplies the text.
 */
export interface FlowVariableValidationError {
  code: 'invalid' | 'max' | 'max_length' | 'min' | 'min_length' | 'not_option' | 'pattern' | 'required';
  message?: string;
}
