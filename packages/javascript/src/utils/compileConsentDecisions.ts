// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import getConsentElementDecision from './getConsentElementDecision';
import {CONSENT_INVALID_KEY_PREFIX} from './getConsentInvalidKey';
import {CONSENT_MODIFIED_KEY_PREFIX} from './getConsentModifiedKey';
import type {ConsentPurposeData} from '../models/embedded-flow';

export interface ConsentDecisionOptions {
  /** Whether the user approved the consent prompt. */
  approved: boolean;
  /** Optional reason to attach to the overall decision. */
  reason?: string;
}

/**
 * Compiles consent form state into the flow API's `consent_decisions` input and removes
 * temporary SDK-only consent fields. The caller determines approval/denial from its action.
 */
const compileConsentDecisions = (
  inputs: Record<string, unknown>,
  purposes: ConsentPurposeData[] | null | undefined,
  options: ConsentDecisionOptions,
): Record<string, unknown> => {
  const processedInputs: Record<string, unknown> = {...inputs};

  if (purposes) {
    const {approved, reason} = options;
    const decisions = {
      approved,
      ...(reason ? {reason} : {}),
      purposes: purposes.map((purpose: ConsentPurposeData) => ({
        approved,
        elements: [
          ...(purpose.essential ?? []).map((element) => ({approved, name: element.name})),
          ...(purpose.optional ?? []).map((element) =>
            getConsentElementDecision(
              purpose.purposeId,
              element,
              approved && processedInputs[`__consent_opt__${purpose.purposeId}__${element.name}`] === 'true',
              processedInputs,
            ),
          ),
        ],
        ...(purpose.purposeName ? {purposeName: purpose.purposeName} : {}),
      })),
    };
    processedInputs['consent_decisions'] = JSON.stringify(decisions);
  }

  Object.keys(processedInputs).forEach((key: string) => {
    if (
      key.startsWith('__consent_opt__') ||
      key.startsWith(CONSENT_MODIFIED_KEY_PREFIX) ||
      key.startsWith(CONSENT_INVALID_KEY_PREFIX)
    ) {
      delete processedInputs[key];
    }
  });

  return processedInputs;
};

export default compileConsentDecisions;
