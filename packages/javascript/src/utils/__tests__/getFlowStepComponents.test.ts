// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import {EmbeddedFlowComponent, EmbeddedFlowComponentType} from '../../models/embedded-flow';
import getFlowStepComponents from '../getFlowStepComponents';

const component = (id: string, type: EmbeddedFlowComponentType, components?: EmbeddedFlowComponent[]) =>
  ({components, id, type}) as EmbeddedFlowComponent;

describe('getFlowStepComponents', () => {
  it('collects nested inputs, actions and the resend action', () => {
    const otp: EmbeddedFlowComponent = component('otp', EmbeddedFlowComponentType.OtpInput);
    const submit: EmbeddedFlowComponent = component('submit', EmbeddedFlowComponentType.Action);
    const resend: EmbeddedFlowComponent = component('resend', EmbeddedFlowComponentType.Resend);

    const step = getFlowStepComponents([
      component('heading', EmbeddedFlowComponentType.Text),
      component('block', EmbeddedFlowComponentType.Block, [otp, submit, resend]),
    ]);

    expect(step.inputs).toEqual([otp]);
    expect(step.actions).toEqual([submit, resend]);
    expect(step.resend).toBe(resend);
  });

  it('finds nothing in a step that only displays text', () => {
    expect(getFlowStepComponents([component('heading', EmbeddedFlowComponentType.Text)])).toEqual({
      actions: [],
      inputs: [],
    });
  });
});
