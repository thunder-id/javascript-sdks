// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import {FlowVariableDefinition} from '../../models/flow-variable';
import resolveFlowVariableRule from '../resolveFlowVariableRule';

const email: FlowVariableDefinition = {defaultValue: 'a@b.co', identifier: 'supportEmail', type: 'EMAIL_INPUT'};
const flag: FlowVariableDefinition = {defaultValue: true, identifier: 'showSignUp', type: 'BOOLEAN_INPUT'};
const ttl: FlowVariableDefinition = {defaultValue: 60, identifier: 'ttl', type: 'NUMBER_INPUT'};
const mfa: FlowVariableDefinition = {
  defaultValue: 'EMAIL_OTP',
  identifier: 'mfa',
  options: ['SMS_OTP', 'EMAIL_OTP', 30],
  type: 'SELECT',
};

describe('resolveFlowVariableRule', () => {
  it('lets everything be edited without an overlay', () => {
    expect(resolveFlowVariableRule(email)).toEqual({defaultValue: 'a@b.co', editable: true});
  });

  it('lets the owner edit everything and ignores any rule', () => {
    const rule = resolveFlowVariableRule(email, {
      isOwnedByOU: true,
      rules: {'variables.supportEmail': {allowedValues: ['x'], editable: false, value: ['y']}},
    });

    expect(rule).toEqual({
      allowedValues: undefined,
      defaultValue: 'a@b.co',
      editable: true,
      excludedValues: undefined,
    });
  });

  it('also reads the owner flag the other overlays use', () => {
    expect(resolveFlowVariableRule(email, {isOwnedByOU: true, rules: {}}).editable).toBe(true);
  });

  it('locks a variable no policy names, at the owner default', () => {
    expect(resolveFlowVariableRule(email, {isOwnedByOU: false, rules: {}})).toMatchObject({
      defaultValue: 'a@b.co',
      editable: false,
    });
  });

  it('opens a variable a policy makes editable', () => {
    expect(
      resolveFlowVariableRule(email, {isOwnedByOU: false, rules: {'variables.supportEmail': {editable: true}}})
        .editable,
    ).toBe(true);
  });

  it('pins a locked variable to the value the policy fixes, in the variable type', () => {
    const overlay = (variable: string, value: string) => ({
      isOwnedByOU: false,
      rules: {[`variables.${variable}`]: {editable: false, value: [value]}},
    });

    expect(resolveFlowVariableRule(flag, overlay('showSignUp', 'false')).defaultValue).toBe(false);
    expect(resolveFlowVariableRule(ttl, overlay('ttl', '120')).defaultValue).toBe(120);
    expect(resolveFlowVariableRule(mfa, overlay('mfa', '30')).defaultValue).toBe(30);
    expect(resolveFlowVariableRule(mfa, overlay('mfa', 'SMS_OTP')).defaultValue).toBe('SMS_OTP');
  });

  it('carries the values the unit may choose from and the ones taken away', () => {
    expect(
      resolveFlowVariableRule(mfa, {
        isOwnedByOU: false,
        rules: {
          'variables.mfa': {allowedValues: ['SMS_OTP', 'EMAIL_OTP'], editable: true, excludedValues: ['EMAIL_OTP']},
        },
      }),
    ).toMatchObject({allowedValues: ['SMS_OTP', 'EMAIL_OTP'], excludedValues: ['EMAIL_OTP']});
  });
});
