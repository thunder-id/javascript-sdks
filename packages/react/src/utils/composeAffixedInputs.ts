/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {getVendorPrefix} from '@thunderid/browser';

/**
 * Returns the runtime sentinel prefix used to tag "selected prefix" entries in the
 * form-state map. Resolved through the vendor namespace so white-labeled deployments
 * do not collide with each other or with a real field identifier.
 */
const prefixSentinel = (vendor?: string): string => `__${getVendorPrefix(vendor)}_prefix__`;

/**
 * Returns the runtime sentinel prefix used to tag "postfix" entries in the form-state
 * map. See {@link prefixSentinel}.
 */
const postfixSentinel = (vendor?: string): string => `__${getVendorPrefix(vendor)}_postfix__`;

/**
 * Returns the sentinel key used to store the selected prefix `value` for the affixed
 * field addressed by `identifier`. The vendor namespace controls the runtime string
 * so consumers overriding `vendor` do not conflict with the SDK default.
 */
export const affixPrefixKey = (identifier: string, vendor?: string): string => `${prefixSentinel(vendor)}${identifier}`;

/**
 * Returns the sentinel key used to store the postfix `value` for the affixed field
 * addressed by `identifier`. See {@link affixPrefixKey}.
 */
export const affixPostfixKey = (identifier: string, vendor?: string): string =>
  `${postfixSentinel(vendor)}${identifier}`;

/**
 * Rewrites `formData` (returns a new object) so that any affixed-input identifier
 * tracked by matching sentinel prefix/postfix keys is replaced with its composed
 * form `${prefix}${typed}${postfix}`. Sentinel keys are stripped from the result.
 *
 * Behaviour:
 *  - Prefix present, postfix present  → `prefix + typed + postfix`.
 *  - Only prefix present               → `prefix + typed`.
 *  - Only postfix present              → `typed + postfix`.
 *  - Both empty / typed empty          → the identifier is left untouched.
 *  - No sentinel keys                  → returns a shallow copy of `formData` unchanged.
 *
 * The input object is not mutated. This is component-type agnostic: any field carrying
 * matching sentinel keys is composed, regardless of whether it originated from a
 * TEXT_INPUT, EMAIL_INPUT, PASSWORD_INPUT, or PHONE_INPUT.
 *
 * @param formData - The current form values map (values indexed by field identifier).
 * @param vendor - The vendor namespace configured on the SDK client, if any. Sentinel
 *   keys are resolved through this namespace so composition ignores unrelated keys
 *   written by other vendors when multiple SDK instances share a form.
 */
const composeAffixedInputs = (formData: Record<string, string>, vendor?: string): Record<string, string> => {
  const composed: Record<string, string> = {...formData};
  const prefixTag: string = prefixSentinel(vendor);
  const postfixTag: string = postfixSentinel(vendor);

  for (const key of Object.keys(formData)) {
    if (!key.startsWith(prefixTag) && !key.startsWith(postfixTag)) {
      continue;
    }

    const identifier: string = key.startsWith(prefixTag) ? key.slice(prefixTag.length) : key.slice(postfixTag.length);

    const typed: string = composed[identifier] ?? '';
    if (typed === '') {
      // Preserve emptiness — required-field checks are the caller's responsibility.
      delete composed[affixPrefixKey(identifier, vendor)];
      delete composed[affixPostfixKey(identifier, vendor)];
      continue;
    }

    const prefix: string = composed[affixPrefixKey(identifier, vendor)] ?? '';
    const postfix: string = composed[affixPostfixKey(identifier, vendor)] ?? '';

    composed[identifier] = `${prefix}${typed}${postfix}`;
    delete composed[affixPrefixKey(identifier, vendor)];
    delete composed[affixPostfixKey(identifier, vendor)];
  }

  return composed;
};

export default composeAffixedInputs;
