// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {FlowVariableDefinition, FlowVariableValidationError} from '../models/flow-variable';
import {FlowVariableValue} from '../models/managed-flow';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9\s\-()]{6,20}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isEmpty = (value: unknown): boolean => value === undefined || value === null || value === '';

const matchesRegex = (pattern: string, value: string): boolean => {
  try {
    return new RegExp(pattern).test(value);
  } catch {
    // A pattern the browser cannot compile is the server's to judge.
    return true;
  }
};

/**
 * Checks a value against a variable's type, options and rules, so a form can report what is wrong before the
 * server does. The server validates again on save.
 *
 * @param definition - The variable the value is for.
 * @param value - The value to check.
 * @returns What is wrong with the value, or `undefined` when it is valid.
 *
 * @example
 * ```typescript
 * const error = validateFlowVariableValue({identifier: 'email', type: 'EMAIL_INPUT'}, 'nope');
 * // {code: 'invalid'}
 * ```
 */
const validateFlowVariableValue = (
  definition: FlowVariableDefinition,
  value: FlowVariableValue | undefined,
): FlowVariableValidationError | undefined => {
  if (definition.type === 'BOOLEAN_INPUT') {
    return value === undefined || typeof value === 'boolean' ? undefined : {code: 'invalid'};
  }

  if (isEmpty(value)) {
    return {code: 'required'};
  }

  switch (definition.type) {
    case 'NUMBER_INPUT': {
      const numeric: number = typeof value === 'number' ? value : Number(value);

      if (Number.isNaN(numeric)) {
        return {code: 'invalid'};
      }
      if (definition.min !== undefined && numeric < definition.min) {
        return {code: 'min'};
      }
      if (definition.max !== undefined && numeric > definition.max) {
        return {code: 'max'};
      }

      return undefined;
    }
    case 'SELECT':
      return (definition.options ?? []).some((option: FlowVariableValue) => option === value)
        ? undefined
        : {code: 'not_option'};
    case 'EMAIL_INPUT':
      return EMAIL_PATTERN.test(String(value)) ? undefined : {code: 'invalid'};
    case 'PHONE_INPUT':
      return PHONE_PATTERN.test(String(value)) ? undefined : {code: 'invalid'};
    case 'DATE_INPUT':
      return DATE_PATTERN.test(String(value)) ? undefined : {code: 'invalid'};
    case 'CONNECTION_SELECT':
      return typeof value === 'string' ? undefined : {code: 'invalid'};
    default: {
      const text = String(value);

      for (const rule of definition.validation ?? []) {
        if (rule.type === 'minLength' && text.length < Number(rule.value)) {
          return {code: 'min_length', message: rule.message};
        }
        if (rule.type === 'maxLength' && text.length > Number(rule.value)) {
          return {code: 'max_length', message: rule.message};
        }
        if (rule.type === 'regex' && !matchesRegex(String(rule.value), text)) {
          return {code: 'pattern', message: rule.message};
        }
      }

      return undefined;
    }
  }
};

export default validateFlowVariableValue;
