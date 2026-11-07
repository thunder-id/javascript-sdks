// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import getFlowVariableOptions from '../getFlowVariableOptions';

const connections = [
  {categories: ['identity-provider' as const], id: '1', name: 'Google login', type: 'google' as const},
  {categories: ['identity-provider' as const], id: '2', name: 'GitHub login', type: 'github' as const},
  {categories: ['sms-provider' as const], id: '3', name: 'Twilio', type: 'twilio' as const},
];

describe('getFlowVariableOptions', () => {
  it('lists the declared values of a select as strings', () => {
    expect(getFlowVariableOptions({identifier: 'mfa', options: ['SMS_OTP', 2, true], type: 'SELECT'})).toEqual([
      {label: 'SMS_OTP', value: 'SMS_OTP'},
      {label: '2', value: '2'},
      {label: 'true', value: 'true'},
    ]);
  });

  it('lists the connections of the category, whichever way it is spelled', () => {
    expect(
      getFlowVariableOptions(
        {category: 'IDENTITY_PROVIDER', identifier: 'idp', type: 'CONNECTION_SELECT'},
        connections,
      ),
    ).toEqual([
      {label: 'Google login', value: '1'},
      {label: 'GitHub login', value: '2'},
    ]);
  });

  it('narrows the connections to the vendors, ignoring case', () => {
    expect(
      getFlowVariableOptions(
        {category: 'IDENTITY_PROVIDER', connectionTypes: ['Google'], identifier: 'idp', type: 'CONNECTION_SELECT'},
        connections,
      ),
    ).toEqual([{label: 'Google login', value: '1'}]);
  });

  it('lists every connection when the variable names no category', () => {
    expect(getFlowVariableOptions({identifier: 'c', type: 'CONNECTION_SELECT'}, connections)).toHaveLength(3);
  });

  it('keeps to the values a policy allows and drops the ones it takes away', () => {
    const definition = {identifier: 'mfa', options: ['SMS_OTP', 'EMAIL_OTP', 'TOTP'], type: 'SELECT' as const};

    expect(getFlowVariableOptions(definition, [], {allowedValues: ['SMS_OTP', 'TOTP']}).map((o) => o.value)).toEqual([
      'SMS_OTP',
      'TOTP',
    ]);
    expect(getFlowVariableOptions(definition, [], {excludedValues: ['TOTP']}).map((o) => o.value)).toEqual([
      'SMS_OTP',
      'EMAIL_OTP',
    ]);
    expect(
      getFlowVariableOptions(
        {category: 'IDENTITY_PROVIDER', identifier: 'idp', type: 'CONNECTION_SELECT'},
        connections,
        {
          allowedValues: ['2'],
        },
      ),
    ).toEqual([{label: 'GitHub login', value: '2'}]);
  });

  it('has no options for the other types', () => {
    expect(getFlowVariableOptions({identifier: 't', type: 'TEXT_INPUT'}, connections)).toEqual([]);
  });
});
