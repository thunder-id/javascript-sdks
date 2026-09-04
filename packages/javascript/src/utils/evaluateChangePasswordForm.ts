// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import evaluatePasswordPolicy, {PasswordPolicy, PasswordRuleResult} from './evaluatePasswordPolicy';

/**
 * The three values a change-password form collects.
 */
export interface ChangePasswordFormValues {
  /**
   * The re-typed new password, used only to catch typos client-side.
   */
  confirmPassword: string;
  /**
   * The user's existing password, or an empty string on an account that has none yet.
   * Deliberately not required for the form to be submittable, since only the server knows
   * whether this account has a password to verify against.
   */
  currentPassword: string;
  /**
   * The password to set.
   */
  newPassword: string;
}

/**
 * The derived state a change-password form needs to render and to gate submission.
 */
export interface ChangePasswordFormEvaluation {
  /**
   * Whether the new password and its confirmation match.
   */
  confirmMatches: boolean;
  /**
   * Whether the values are complete and internally consistent. Callers combine this with
   * their own in-flight flag, since whether a request is pending is UI state rather than
   * validation.
   *
   * `currentPassword` is not part of this check. A user whose account has no password yet has
   * nothing to type there, and the client cannot tell that case apart from a user who simply
   * left the field blank, so gating submission on it would lock the first group out of setting
   * a password at all. The server verifies it when the account has one, and answers with a
   * `403` otherwise.
   */
  isValid: boolean;
  /**
   * Whether the new password satisfies every configured rule.
   */
  meetsPolicy: boolean;
  /**
   * Whether the new password is the one already in use. Rejected client-side because the
   * server treats it as a valid write, leaving the user believing something changed.
   */
  reusesCurrent: boolean;
  /**
   * Per-rule results, for the live requirement checklist.
   */
  ruleResults: PasswordRuleResult[];
}

/**
 * Evaluates a change-password form against a policy.
 *
 * Every predicate a change-password UI needs is derived here so the React and Vue
 * components stay pure rendering concerns and cannot drift apart on what counts as a
 * submittable form.
 *
 * @param values - The current field values.
 * @param policy - The rules the new password must satisfy.
 * @returns The derived flags plus the per-rule results.
 * @example
 * ```typescript
 * const {isValid, ruleResults} = evaluateChangePasswordForm(
 *   {confirmPassword, currentPassword, newPassword},
 *   {regex: '^.{12,}$'},
 * );
 * const canSubmit = !loading && isValid;
 * ```
 */
const evaluateChangePasswordForm = (
  values: ChangePasswordFormValues,
  policy: PasswordPolicy,
): ChangePasswordFormEvaluation => {
  const {confirmPassword, currentPassword, newPassword} = values;

  const ruleResults: PasswordRuleResult[] = evaluatePasswordPolicy(newPassword, policy);
  const meetsPolicy: boolean = ruleResults.every((rule: PasswordRuleResult) => rule.passed);
  const confirmMatches: boolean = newPassword === confirmPassword;
  const reusesCurrent: boolean = newPassword !== '' && newPassword === currentPassword;

  const isValid: boolean =
    newPassword !== '' && confirmPassword !== '' && meetsPolicy && confirmMatches && !reusesCurrent;

  return {confirmMatches, isValid, meetsPolicy, reusesCurrent, ruleResults};
};

export default evaluateChangePasswordForm;
