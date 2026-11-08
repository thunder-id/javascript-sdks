// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import * as react from '@thunderid/react';
import {ReactElement} from 'react';
import {describe, expect, it, vi} from 'vitest';
import * as client from '../../../index';
import FlowVariablesForm from '../FlowVariablesForm/FlowVariablesForm';
import SharedFlowList from '../SharedFlowList/SharedFlowList';

describe('flow management exports', () => {
  it('FlowVariablesForm renders the React SDK form with every prop it is given', () => {
    const onSaved = vi.fn();
    const element = FlowVariablesForm({flowId: 'flow-1', onSaved, ouId: 'ou-1'}) as ReactElement;

    expect(element.type).toBe(react.FlowVariablesForm);
    expect(element.props).toEqual({flowId: 'flow-1', onSaved, ouId: 'ou-1'});
  });

  it('SharedFlowList renders the React SDK list with every prop it is given', () => {
    const onSelect = vi.fn();
    const element = SharedFlowList({onSelect, ouId: 'ou-1', ownership: 'all'}) as ReactElement;

    expect(element.type).toBe(react.SharedFlowList);
    expect(element.props).toEqual({onSelect, ouId: 'ou-1', ownership: 'all'});
  });

  it('exposes the wrapped components and the React SDK flow management surface', () => {
    expect(client.FlowVariablesForm).toBe(FlowVariablesForm);
    expect(client.SharedFlowList).toBe(SharedFlowList);
    expect(client.BaseFlowVariables).toBe(react.BaseFlowVariables);
    expect(client.FlowVariableField).toBe(react.FlowVariableField);
    expect(client.BaseSharedFlowList).toBe(react.BaseSharedFlowList);
    expect(client.useFlowVariables).toBe(react.useFlowVariables);
  });
});
