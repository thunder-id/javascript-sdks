// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Wire names and eligibility rules for self user attribute verification.
 */
const AttributeVerificationConstants: {
  ATTRIBUTE_INPUT: string;
  DEFAULT_FLOW_HANDLE: string;
  MASKED_DESTINATION_KEY: string;
  VERIFIABLE_ATTRIBUTE_TYPES: readonly string[];
  VERIFIED_ATTRIBUTES_KEY: string;
  VERIFY_AFTER_SAVE_ATTRIBUTE_TYPES: readonly string[];
} = {
  /**
   * Flow input naming the attribute to verify on the initial request.
   */
  ATTRIBUTE_INPUT: 'attribute',
  /**
   * Handle of the self attribute verification flow the server ships, used unless the app names another.
   */
  DEFAULT_FLOW_HANDLE: 'default-self-attribute-verification-flow',
  /**
   * `additionalData` key carrying the masked destination the code was sent to.
   */
  MASKED_DESTINATION_KEY: 'maskedDestination',
  /**
   * Schema property types whose verification status is shown and which the user can verify.
   */
  VERIFIABLE_ATTRIBUTE_TYPES: ['email', 'mobile'],
  /**
   * Read-only `/users/me` field holding the verified attributes.
   */
  VERIFIED_ATTRIBUTES_KEY: 'verifiedAttributes',
  /**
   * Schema property types whose changed value opens verification after a save. Mobile is verified on
   * request only, since SMS needs a provider the deployment may not have.
   */
  VERIFY_AFTER_SAVE_ATTRIBUTE_TYPES: ['email'],
};

export default AttributeVerificationConstants;
