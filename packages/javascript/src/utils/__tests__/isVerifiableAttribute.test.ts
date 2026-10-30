// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import {AttributeSchema} from '../../api/account/getUsersMeMeta';
import isVerifiableAttribute from '../isVerifiableAttribute';

const userSchema: Record<string, AttributeSchema> = {
  address: {subAttributes: [{type: 'email'}], type: 'object'},
  emails: {type: 'array'},
  given_name: {type: 'string'},
  mobile: {type: 'mobile'},
  workEmail: {type: 'EMAIL'},
};

describe('isVerifiableAttribute', (): void => {
  it('accepts an email or mobile attribute', (): void => {
    expect(isVerifiableAttribute(userSchema, 'workEmail')).toBe(true);
    expect(isVerifiableAttribute(userSchema, 'mobile')).toBe(true);
  });

  it('refuses a string attribute such as a first name', (): void => {
    expect(isVerifiableAttribute(userSchema, 'given_name')).toBe(false);
  });

  it('refuses a multi-valued or nested attribute', (): void => {
    expect(isVerifiableAttribute(userSchema, 'emails')).toBe(false);
    expect(isVerifiableAttribute(userSchema, 'address')).toBe(false);
    expect(isVerifiableAttribute(userSchema, 'address.email')).toBe(false);
  });

  it('refuses an attribute the schema does not declare', (): void => {
    expect(isVerifiableAttribute(userSchema, 'email')).toBe(false);
    expect(isVerifiableAttribute(userSchema, 'toString')).toBe(false);
  });

  it('refuses every attribute when the schema is unknown', (): void => {
    expect(isVerifiableAttribute(null, 'email')).toBe(false);
    expect(isVerifiableAttribute(undefined, 'email')).toBe(false);
  });
});
