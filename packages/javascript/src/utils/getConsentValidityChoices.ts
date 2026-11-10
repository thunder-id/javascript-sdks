// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import getConsentValidityOptions, {type ConsentValidityOption} from './getConsentValidityOptions';

/**
 * What the user sees of the validity choice: whether the decision is remembered, and for how long.
 */
export interface ConsentValidityChoices {
  /** The period the user gets until they choose another: the shortest one. */
  initial: ConsentValidityOption;
  /**
   * The option for a decision that is not remembered, so that the user is asked again at the next sign-in. Absent when
   * the limit leaves no room for it, and then there is nothing for the user to choose.
   */
  once?: ConsentValidityOption;
  /** Whether the user remembers the decision. */
  remember: boolean;
  /** The periods the user chooses between when the decision is remembered, shortest first. The last is the longest. */
  remembered: ConsentValidityOption[];
  /**
   * The option in effect: `once` when the decision is not remembered, otherwise the chosen period. Absent when the
   * value is a period of the user's own, which is none of the options.
   */
  selected?: ConsentValidityOption;
}

/**
 * Works out what the validity choice shows for the value in the form: a checkbox that remembers the decision, and when
 * it is ticked, the periods to choose between.
 *
 * @param maxValidityPeriod - The longest validity period in seconds. Absent when there is no limit.
 * @param value - The value in the form. Empty means the shortest period.
 * @param remember - Whether the box is ticked. Taken from `value` when absent. A caller that lets the user type a period
 * keeps it itself, since typing 15 passes through 1, the value for a decision that is not remembered.
 * @returns The option for when the decision is not remembered, the periods, and the option in effect.
 *
 * @example
 * ```typescript
 * getConsentValidityChoices(86400, '1').remember // returns false
 * ```
 */
const getConsentValidityChoices = (
  maxValidityPeriod: number | undefined,
  value: string,
  remember: boolean | undefined = undefined,
): ConsentValidityChoices => {
  const options: ConsentValidityOption[] = getConsentValidityOptions(maxValidityPeriod);
  const once: ConsentValidityOption | undefined = options.find(
    (option: ConsentValidityOption): boolean => option.kind === 'once',
  );
  const remembered: ConsentValidityOption[] = options.filter(
    (option: ConsentValidityOption): boolean => option.kind !== 'once',
  );
  const initial: ConsentValidityOption = remembered[0];
  const remembering: boolean = once === undefined || (remember ?? value !== once.value);

  let selected: ConsentValidityOption | undefined = once;
  if (remembering) {
    selected =
      value === '' ? initial : remembered.find((option: ConsentValidityOption): boolean => option.value === value);
  }

  return {initial, once, remember: remembering, remembered, selected};
};

export default getConsentValidityChoices;
