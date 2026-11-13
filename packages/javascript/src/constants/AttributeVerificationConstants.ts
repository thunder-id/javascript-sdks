// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Wire names and eligibility rules for user attribute verification, by the user or by an administrator.
 */
const AttributeVerificationConstants: {
  ADMIN_VERIFIABLE_ATTRIBUTES: readonly string[];
  ATTRIBUTE_INPUT: string;
  CHANNEL_KEY: string;
  DEFAULT_FLOW_HANDLE: string;
  EMAIL_SENT_KEY: string;
  MASKED_DESTINATION_KEY: string;
  SUBJECT_INPUT: string;
  VERIFIABLE_ATTRIBUTE_TYPES: readonly string[];
  VERIFIED_ATTRIBUTES_KEY: string;
} = {
  /**
   * Attributes an administrator can send a verification link for. The shipped flow sends email only.
   */
  ADMIN_VERIFIABLE_ATTRIBUTES: ['email'],
  /**
   * Flow input naming the attribute to verify on the initial request.
   */
  ATTRIBUTE_INPUT: 'attribute',
  /**
   * `additionalData` key carrying the channel a code or link was sent on.
   */
  CHANNEL_KEY: 'channel',
  /**
   * Handle of the self attribute verification flow the server ships, used unless the app names another.
   */
  DEFAULT_FLOW_HANDLE: 'default-self-attribute-verification-flow',
  /**
   * `additionalData` key carrying whether the flow's email step sent its message.
   */
  EMAIL_SENT_KEY: 'emailSent',
  /**
   * `additionalData` key carrying the masked destination the code was sent to.
   */
  MASKED_DESTINATION_KEY: 'maskedDestination',
  /**
   * Flow input naming the user an administrator-initiated flow acts on.
   */
  SUBJECT_INPUT: 'subject',
  /**
   * Schema property types whose verification status is shown and which the user can verify.
   */
  VERIFIABLE_ATTRIBUTE_TYPES: ['email', 'mobile'],
  /**
   * Read-only `/users/me` field holding the verified attributes.
   */
  VERIFIED_ATTRIBUTES_KEY: 'verifiedAttributes',
};

export default AttributeVerificationConstants;
