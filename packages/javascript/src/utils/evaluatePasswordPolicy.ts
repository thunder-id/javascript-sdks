// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Client-side password rule used to drive both the requirement checklist and the
 * submit gate of a change-password form.
 *
 * The server does not enforce the user type schema's `password` regex on the credential
 * write path, and the default schema ships without a regex at all, so this rule is
 * advisory: it exists to give the user actionable feedback before the request is sent.
 * The schema's `regex` is the sole source of truth; the SDK does not layer its own
 * character-class or length rules on top, since doing so could reject a password the
 * organization's policy accepts.
 */
export interface PasswordPolicy {
  /**
   * A regular expression the whole value must match. Typically sourced from the
   * `password` attribute's `regex` in `GET /users/me/meta`.
   */
  regex?: string;
}

/**
 * The outcome of the password rule.
 */
export interface PasswordRuleResult {
  /**
   * Stable identifier for the rule, usable as a React key or test selector.
   */
  key: string;
  /**
   * i18n key describing the requirement. Resolved by the consuming component rather
   * than here, so this module stays free of translation concerns.
   */
  messageKey: string;
  /**
   * Substitution params for `messageKey`, in the `{token}` form the i18n layer expects.
   */
  params?: Record<string, string | number>;
  /**
   * Whether the value satisfies this rule.
   */
  passed: boolean;
}

/**
 * Evaluates a password against a policy, returning one result when the policy configures
 * a `regex` and none otherwise.
 *
 * An uncompilable `regex` is treated as passing, matching `evaluateValidationRule`:
 * the SDK stays lenient so a misconfigured schema cannot lock a user out of their own
 * password change.
 *
 * @param value - The candidate password.
 * @param policy - The rule to apply.
 * @returns A single-item list when `policy.regex` is set, otherwise an empty list.
 * @example
 * ```typescript
 * const results = evaluatePasswordPolicy('sh0rt', {regex: '^.{8,}$'});
 * const isValid = results.every(result => result.passed);
 * ```
 */
const evaluatePasswordPolicy = (value: string, policy: PasswordPolicy): PasswordRuleResult[] => {
  if (!policy.regex) {
    return [];
  }

  let matches = true;

  try {
    matches = new RegExp(policy.regex).test(value);
  } catch {
    // An uncompilable pattern must not block the user. The server is authoritative.
    matches = true;
  }

  return [
    {
      key: 'regex',
      messageKey: 'validation.password.pattern',
      passed: matches,
    },
  ];
};

export default evaluatePasswordPolicy;
