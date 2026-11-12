// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import {FlowVariableDefinition} from '../../models/flow-variable';
import validateFlowVariableValue from '../validateFlowVariableValue';

const text = (extra: Partial<FlowVariableDefinition> = {}): FlowVariableDefinition => ({
  identifier: 'v',
  type: 'TEXT_INPUT',
  ...extra,
});

describe('validateFlowVariableValue', () => {
  it('requires a value except for a boolean', () => {
    expect(validateFlowVariableValue(text(), '')).toEqual({code: 'required'});
    expect(validateFlowVariableValue(text(), undefined)).toEqual({code: 'required'});
    expect(validateFlowVariableValue({identifier: 'b', type: 'BOOLEAN_INPUT'}, undefined)).toBeUndefined();
    expect(validateFlowVariableValue({identifier: 'b', type: 'BOOLEAN_INPUT'}, 'yes')).toEqual({code: 'invalid'});
  });

  it('applies the text rules and carries the rule message', () => {
    const def = text({
      validation: [
        {type: 'minLength', value: 3, message: 'too short'},
        {type: 'maxLength', value: 5},
        {type: 'regex', value: '^[a-z]+$', message: 'letters only'},
      ],
    });

    expect(validateFlowVariableValue(def, 'ab')).toEqual({code: 'min_length', message: 'too short'});
    expect(validateFlowVariableValue(def, 'abcdef')).toEqual({code: 'max_length', message: undefined});
    expect(validateFlowVariableValue(def, 'ab1de')).toEqual({code: 'pattern', message: 'letters only'});
    expect(validateFlowVariableValue(def, 'abcd')).toBeUndefined();
  });

  it('lets a pattern the browser cannot compile through', () => {
    expect(validateFlowVariableValue(text({validation: [{type: 'regex', value: '(?<'}]}), 'x')).toBeUndefined();
  });

  it('bounds a number', () => {
    const def: FlowVariableDefinition = {identifier: 'n', max: 10, min: 1, type: 'NUMBER_INPUT'};

    expect(validateFlowVariableValue(def, 'abc')).toEqual({code: 'invalid'});
    expect(validateFlowVariableValue(def, 0)).toEqual({code: 'min'});
    expect(validateFlowVariableValue(def, 11)).toEqual({code: 'max'});
    expect(validateFlowVariableValue(def, 5)).toBeUndefined();
  });

  it('keeps a select to its options', () => {
    const def: FlowVariableDefinition = {identifier: 's', options: ['A', 2], type: 'SELECT'};

    expect(validateFlowVariableValue(def, 'B')).toEqual({code: 'not_option'});
    expect(validateFlowVariableValue(def, 2)).toBeUndefined();
  });

  it('accepts the text of a select option, as the server does', () => {
    const flags: FlowVariableDefinition = {identifier: 'f', options: [true, false], type: 'SELECT'};
    const mixed: FlowVariableDefinition = {identifier: 'm', options: ['A', 2], type: 'SELECT'};

    expect(validateFlowVariableValue(flags, 'true')).toBeUndefined();
    expect(validateFlowVariableValue(flags, false)).toBeUndefined();
    expect(validateFlowVariableValue(flags, 'yes')).toEqual({code: 'not_option'});
    expect(validateFlowVariableValue(mixed, '2')).toBeUndefined();
  });

  it('checks the format of email, phone and date', () => {
    expect(validateFlowVariableValue({identifier: 'e', type: 'EMAIL_INPUT'}, 'nope')).toEqual({code: 'invalid'});
    expect(validateFlowVariableValue({identifier: 'e', type: 'EMAIL_INPUT'}, 'a@b.co')).toBeUndefined();
    expect(validateFlowVariableValue({identifier: 'p', type: 'PHONE_INPUT'}, 'abc')).toEqual({code: 'invalid'});
    expect(validateFlowVariableValue({identifier: 'p', type: 'PHONE_INPUT'}, '+94 77 123 4567')).toBeUndefined();
    expect(validateFlowVariableValue({identifier: 'd', type: 'DATE_INPUT'}, '31/10/2026')).toEqual({code: 'invalid'});
    expect(validateFlowVariableValue({identifier: 'd', type: 'DATE_INPUT'}, '2026-10-31')).toBeUndefined();
  });

  it('takes a connection id as a string', () => {
    expect(validateFlowVariableValue({identifier: 'c', type: 'CONNECTION_SELECT'}, 12)).toEqual({code: 'invalid'});
    expect(validateFlowVariableValue({identifier: 'c', type: 'CONNECTION_SELECT'}, 'abc')).toBeUndefined();
  });
});
