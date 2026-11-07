// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import getFlowVariableDefinitions from '../getFlowVariableDefinitions';

describe('getFlowVariableDefinitions', () => {
  it('returns nothing without a flow', () => {
    expect(getFlowVariableDefinitions(undefined)).toEqual([]);
  });

  it('reads the variables of a flow shared with the unit', () => {
    const variables = [{identifier: 'supportEmail', type: 'EMAIL_INPUT' as const}];

    expect(getFlowVariableDefinitions({nodes: undefined as never, variables})).toBe(variables);
  });

  it('reads the inputs of the VARIABLES node of an owned flow', () => {
    const flow = {
      nodes: [
        {id: 'start', type: 'START'},
        {id: 'vars', inputs: [{identifier: 'mfa', type: 'SELECT', options: ['SMS']}, {junk: true}], type: 'VARIABLES'},
      ],
    };

    expect(getFlowVariableDefinitions(flow)).toEqual([{identifier: 'mfa', type: 'SELECT', options: ['SMS']}]);
  });

  it('returns nothing when the flow has no VARIABLES node', () => {
    expect(getFlowVariableDefinitions({nodes: [{id: 'start', type: 'START'}]})).toEqual([]);
  });
});
