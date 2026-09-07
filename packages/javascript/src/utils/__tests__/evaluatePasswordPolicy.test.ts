// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import evaluatePasswordPolicy, {PasswordRuleResult} from '../evaluatePasswordPolicy';

const passedOf = (results: PasswordRuleResult[]): boolean | undefined => results[0]?.passed;

describe('evaluatePasswordPolicy', (): void => {
  it('should return an empty list for an empty policy', (): void => {
    expect(evaluatePasswordPolicy('anything', {})).toEqual([]);
  });

  it('should ignore an empty regex', (): void => {
    expect(evaluatePasswordPolicy('anything', {regex: ''})).toEqual([]);
  });

  it('should evaluate a schema-supplied regex', (): void => {
    const policy = {regex: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$'};

    expect(passedOf(evaluatePasswordPolicy('Passw0rdd', policy))).toBe(true);
    expect(passedOf(evaluatePasswordPolicy('password', policy))).toBe(false);
  });

  it('should treat an uncompilable regex as passing so a bad schema cannot lock the user out', (): void => {
    expect(passedOf(evaluatePasswordPolicy('anything', {regex: '([unclosed'}))).toBe(true);
  });

  it('should expose a stable key and the pattern i18n key', (): void => {
    const [result]: PasswordRuleResult[] = evaluatePasswordPolicy('x', {regex: '.*'});

    expect(result.key).toBe('regex');
    expect(result.messageKey).toBe('validation.password.pattern');
  });
});
