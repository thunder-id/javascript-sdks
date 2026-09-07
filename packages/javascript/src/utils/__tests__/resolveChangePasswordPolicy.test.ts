// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import {AttributeSchema} from '../../api/getUsersMeMeta';
import resolveChangePasswordPolicy from '../resolveChangePasswordPolicy';

const schemaWith = (regex?: string): Record<string, AttributeSchema> =>
  ({password: {regex}}) as unknown as Record<string, AttributeSchema>;

describe('resolveChangePasswordPolicy', (): void => {
  it('should derive the policy from the schema password regex', (): void => {
    expect(resolveChangePasswordPolicy(schemaWith('^.{8,}$'))).toEqual({regex: '^.{8,}$'});
  });

  it('should return an empty policy when the schema carries no regex', (): void => {
    expect(resolveChangePasswordPolicy(schemaWith(undefined))).toEqual({});
  });

  it('should return an empty policy when the schema has no password attribute', (): void => {
    expect(resolveChangePasswordPolicy({} as Record<string, AttributeSchema>)).toEqual({});
  });

  it.each([[null], [undefined]])('should tolerate a %s schema', (schema: null | undefined): void => {
    expect(resolveChangePasswordPolicy(schema)).toEqual({});
  });

  it('should let an explicit override win over the schema', (): void => {
    expect(resolveChangePasswordPolicy(schemaWith('^.{8,}$'), {regex: '^.{12,}$'})).toEqual({regex: '^.{12,}$'});
  });

  it('should honour an override that deliberately configures no rules', (): void => {
    expect(resolveChangePasswordPolicy(schemaWith('^.{8,}$'), {})).toEqual({});
  });
});
