// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import {AttributeSchema} from '../../api/getUsersMeMeta';
import supportsPasswordCredential from '../supportsPasswordCredential';

describe('supportsPasswordCredential', (): void => {
  it('should accept a schema that defines a password attribute', (): void => {
    expect(supportsPasswordCredential({password: {credential: true, type: 'string'}})).toBe(true);
  });

  it('should accept a password attribute that carries no metadata', (): void => {
    expect(supportsPasswordCredential({password: {}})).toBe(true);
  });

  it('should accept a password attribute the schema marks optional', (): void => {
    expect(supportsPasswordCredential({password: {credential: true, required: false}})).toBe(true);
  });

  it('should reject a schema that declares another credential but no password', (): void => {
    const schema: Record<string, AttributeSchema> = {
      email: {type: 'string', unique: true},
      pin: {credential: true, type: 'string'},
    };

    expect(supportsPasswordCredential(schema)).toBe(false);
  });

  it('should reject an empty schema', (): void => {
    expect(supportsPasswordCredential({})).toBe(false);
  });

  it.each([[null], [undefined]])('should accept an unresolved schema (%s)', (schema): void => {
    expect(supportsPasswordCredential(schema)).toBe(true);
  });
});
