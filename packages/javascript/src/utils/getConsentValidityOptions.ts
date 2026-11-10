// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/**
 * Seconds a consent lasts when the user does not remember the decision, so they are asked again at the next sign-in.
 */
export const CONSENT_VALIDITY_ONCE_SECONDS = 1;

/**
 * Seconds the server uses for consent that does not expire: the largest 32-bit integer.
 */
export const CONSENT_VALIDITY_NEVER_SECONDS = 2147483647;

/**
 * The fewest periods offered at once. The longest period the flow allows is added when fewer standard ones fit.
 */
const MIN_PERIODS = 3;

/**
 * The most periods offered at once.
 */
const MAX_PERIODS = 5;

/**
 * Periods the user can choose from, in seconds: 1 minute, 5 minutes, 30 minutes, 1 hour, 6 hours, 12 hours, 24 hours,
 * 48 hours, 30 days and 60 days.
 */
const CONSENT_VALIDITY_PERIODS: readonly number[] = [
  60, 300, 1800, 3600, 21600, 43200, 86400, 172800, 2592000, 5184000,
];

/**
 * Unit a period is shown in.
 */
export type ConsentValidityUnit = 'second' | 'minute' | 'hour' | 'day';

/**
 * One choice for how long the user's consent lasts.
 */
export interface ConsentValidityOption {
  /** Whole amount of `unit` in a `period` option. */
  amount?: number;
  /** Identifies the choice, for use as the value of a select option. Never empty. */
  id: string;
  /** `once` is a decision that is not remembered, `never` is consent that does not expire. */
  kind: 'once' | 'period' | 'never';
  /** How long the consent lasts, in seconds. The largest 32-bit integer for `never`. */
  seconds: number;
  /** Unit of `amount` in a `period` option. */
  unit?: ConsentValidityUnit;
  /** Value to submit as the validity period, which is the seconds of the option. */
  value: string;
}

/**
 * Seconds in each unit.
 */
export const CONSENT_VALIDITY_UNIT_SECONDS: Record<ConsentValidityUnit, number> = {
  day: 86400,
  hour: 3600,
  minute: 60,
  second: 1,
};

const UNIT_SECONDS: readonly [ConsentValidityUnit, number][] = [
  ['day', CONSENT_VALIDITY_UNIT_SECONDS.day],
  ['hour', CONSENT_VALIDITY_UNIT_SECONDS.hour],
  ['minute', CONSENT_VALIDITY_UNIT_SECONDS.minute],
];

/**
 * Rounds a number of seconds down to a whole number of its largest unit: seconds below a minute, minutes below an
 * hour, hours below a day, otherwise days.
 */
const trimSeconds = (seconds: number): number => {
  const size: number =
    UNIT_SECONDS.find(([, unitSeconds]: [ConsentValidityUnit, number]): boolean => seconds >= unitSeconds)?.[1] ?? 1;

  return Math.floor(seconds / size) * size;
};

const toPeriodOption = (seconds: number): ConsentValidityOption => {
  const [unit, size]: [ConsentValidityUnit, number] = UNIT_SECONDS.find(
    ([, unitSeconds]: [ConsentValidityUnit, number]): boolean => seconds % unitSeconds === 0,
  ) ?? ['second', 1];

  return {
    amount: seconds / size,
    id: String(seconds),
    kind: 'period',
    seconds,
    unit,
    value: String(seconds),
  };
};

/**
 * Works out the longest period the user can choose, in seconds.
 *
 * @param maxValidityPeriod - The longest validity period in seconds. Absent when there is no limit.
 * @returns The limit as whole seconds, or the largest 32-bit integer when there is no limit or it is not usable.
 */
export const getConsentValidityLimit = (maxValidityPeriod?: number): number => {
  const seconds: number = Math.floor(maxValidityPeriod ?? 0);

  return seconds >= 1 && seconds < CONSENT_VALIDITY_NEVER_SECONDS ? seconds : CONSENT_VALIDITY_NEVER_SECONDS;
};

/**
 * Tells whether the flow allows consent that does not expire.
 *
 * @param maxValidityPeriod - The longest validity period in seconds. Absent when there is no limit.
 * @returns `true` when consent can last forever.
 */
export const isConsentValidityUnlimited = (maxValidityPeriod?: number): boolean =>
  getConsentValidityLimit(maxValidityPeriod) === CONSENT_VALIDITY_NEVER_SECONDS;

/**
 * Picks `count` of the candidates, always the first and the last, spread evenly between them.
 */
const spreadOptions = (candidates: ConsentValidityOption[], count: number): ConsentValidityOption[] =>
  Array.from({length: count}, (_unused: unknown, index: number): ConsentValidityOption => {
    const position = Math.round((index * (candidates.length - 1)) / (count - 1));

    return candidates[position];
  });

/**
 * Lists the choices for how long the user's consent lasts, shortest first. The first choice is for a decision that
 * is not remembered. After it come the standard periods that fit the longest period the flow allows, and consent
 * that does not expire when the flow sets no limit. The longest period itself is not listed, unless fewer than three
 * standard periods fit. It then completes the list, rounded down to a whole number of its largest unit, so 252
 * seconds is listed as 4 minutes. No more than five periods are listed: when more fit, the shortest and the longest
 * are kept and the rest are spread evenly between them.
 *
 * @param maxValidityPeriod - The longest validity period in seconds. Absent when there is no limit.
 * @returns The choices, with the periods after the first.
 *
 * @example
 * ```typescript
 * getConsentValidityOptions(3600).map((option) => option.seconds) // returns [1, 60, 300, 1800, 3600]
 * ```
 */
const getConsentValidityOptions = (maxValidityPeriod?: number): ConsentValidityOption[] => {
  const max: number = getConsentValidityLimit(maxValidityPeriod);
  const unlimited: boolean = max === CONSENT_VALIDITY_NEVER_SECONDS;
  const options: ConsentValidityOption[] = [];

  if (unlimited || max > CONSENT_VALIDITY_ONCE_SECONDS) {
    options.push({
      id: String(CONSENT_VALIDITY_ONCE_SECONDS),
      kind: 'once',
      seconds: CONSENT_VALIDITY_ONCE_SECONDS,
      value: String(CONSENT_VALIDITY_ONCE_SECONDS),
    });
  }

  let periods: ConsentValidityOption[] = CONSENT_VALIDITY_PERIODS.filter(
    (seconds: number): boolean => seconds <= max,
  ).map(toPeriodOption);

  if (unlimited) {
    periods.push({id: String(max), kind: 'never', seconds: max, value: String(max)});
  } else if (periods.length < MIN_PERIODS) {
    const longest: ConsentValidityOption = toPeriodOption(trimSeconds(max));

    if (!periods.some((period: ConsentValidityOption): boolean => period.seconds === longest.seconds)) {
      periods.push(longest);
    }
  }

  if (periods.length > MAX_PERIODS) {
    periods = spreadOptions(periods, MAX_PERIODS);
  }

  return [...options, ...periods];
};

export default getConsentValidityOptions;
