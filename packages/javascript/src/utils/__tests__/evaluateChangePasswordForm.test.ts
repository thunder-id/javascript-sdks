// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it} from 'vitest';
import evaluateChangePasswordForm, {ChangePasswordFormValues} from '../evaluateChangePasswordForm';

const values = (overrides: Partial<ChangePasswordFormValues> = {}): ChangePasswordFormValues => ({
  confirmPassword: 'N3wPassw0rd!',
  currentPassword: '0ldPassw0rd!',
  newPassword: 'N3wPassw0rd!',
  ...overrides,
});

describe('evaluateChangePasswordForm', (): void => {
  it('should accept a complete, consistent form with no policy', (): void => {
    const result = evaluateChangePasswordForm(values(), {});

    expect(result.isValid).toBe(true);
    expect(result.confirmMatches).toBe(true);
    expect(result.reusesCurrent).toBe(false);
    expect(result.meetsPolicy).toBe(true);
    expect(result.ruleResults).toEqual([]);
  });

  it.each([['newPassword'], ['confirmPassword']])('should reject the form when %s is empty', (field: string): void => {
    expect(evaluateChangePasswordForm(values({[field]: ''}), {}).isValid).toBe(false);
  });

  it('should accept the form when the current password is empty', (): void => {
    const result = evaluateChangePasswordForm(values({currentPassword: ''}), {});

    expect(result.isValid).toBe(true);
    expect(result.reusesCurrent).toBe(false);
  });

  it('should reject a mismatched confirmation', (): void => {
    const result = evaluateChangePasswordForm(values({confirmPassword: 'something-else'}), {});

    expect(result.confirmMatches).toBe(false);
    expect(result.isValid).toBe(false);
  });

  it('should reject reusing the current password', (): void => {
    const result = evaluateChangePasswordForm(
      values({confirmPassword: '0ldPassw0rd!', newPassword: '0ldPassw0rd!'}),
      {},
    );

    expect(result.reusesCurrent).toBe(true);
    expect(result.isValid).toBe(false);
  });

  it('should not flag reuse when both current and new are empty', (): void => {
    const result = evaluateChangePasswordForm(values({currentPassword: '', newPassword: ''}), {});

    expect(result.reusesCurrent).toBe(false);
  });

  it('should reject a new password that fails the policy', (): void => {
    const policy = {regex: '^.{12,}$'};
    const result = evaluateChangePasswordForm(values({confirmPassword: 'short', newPassword: 'short'}), policy);

    expect(result.meetsPolicy).toBe(false);
    expect(result.isValid).toBe(false);
    expect(result.ruleResults).toHaveLength(1);
  });

  it('should surface the rule results for the requirement checklist', (): void => {
    const result = evaluateChangePasswordForm(values(), {regex: '^.{8,}$'});

    expect(result.ruleResults).toHaveLength(1);
    expect(result.ruleResults[0]?.passed).toBe(true);
    expect(result.isValid).toBe(true);
  });
});
