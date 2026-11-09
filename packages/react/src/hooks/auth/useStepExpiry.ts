// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {useCallback, useState} from 'react';

export interface StepExpiry {
  /** Marks the current step as expired; see `ComponentRenderContext.expireStep`. */
  expireStep: () => void;
  /** Whether `expireStep()` was called for the current step. */
  isStepExpired: boolean;
}

/**
 * Client-side expiry of a flow step, raised by a custom renderer (e.g. when an OTP countdown it owns
 * runs out). The expiry is keyed to the `step` identity it was raised for, so it clears the moment a
 * new step response replaces it, without an effect: a renderer expiring a fresh step from its own
 * mount effect is not undone, and a late call from a previous step's renderer has no effect.
 *
 * @param step - Any value whose identity changes with each step response, e.g. its `components`.
 */
const useStepExpiry = (step: unknown): StepExpiry => {
  const [expiredStep, setExpiredStep] = useState<unknown>(undefined);
  const expireStep: () => void = useCallback((): void => setExpiredStep(() => step), [step]);

  return {expireStep, isStepExpired: expiredStep !== undefined && expiredStep === step};
};

export default useStepExpiry;
