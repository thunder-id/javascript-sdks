// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Whether the consent prompt asks the user how long their consent lasts, and the longest period allowed.
 */
export interface ConsentValidityInput {
  /** Whether the prompt asks for a validity period. */
  enabled: boolean;
  /** The longest validity period, in seconds. Absent when there is no limit. */
  maxValidityPeriod?: number;
}

/**
 * Reads whether the consent step asks for a validity period from the step's additional data.
 *
 * @param additionalData - The additional data of the flow step.
 * @returns Whether the input is enabled and its limit, when the server set one.
 *
 * @example
 * ```typescript
 * getConsentValidityInput({promptConsentValidity: 'true', maxConsentValidity: '3600'})
 * // returns {enabled: true, maxValidityPeriod: 3600}
 * ```
 */
const getConsentValidityInput = (additionalData: Record<string, unknown> | undefined): ConsentValidityInput => {
  const max = Number(additionalData?.['maxConsentValidity']);

  return {
    enabled: additionalData?.['promptConsentValidity'] === 'true',
    maxValidityPeriod: Number.isFinite(max) && max > 0 ? max : undefined,
  };
};

export default getConsentValidityInput;
