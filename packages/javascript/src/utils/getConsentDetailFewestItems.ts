// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {ConsentDetailRow} from '../models/embedded-flow';

/**
 * Gives the fewest items the user must keep in a list whose rule is `removeItems`: the field's `minItems`,
 * and never fewer than one, since to grant none of them the user declines the detail instead.
 *
 * @param row - The list field.
 * @returns The fewest items to keep.
 *
 * @example
 * ```typescript
 * getConsentDetailFewestItems({label: 'Actions', minItems: 2, modification: 'removeItems', path: 'actions', value: ['a', 'b', 'c']})
 * // returns 2
 * ```
 */
const getConsentDetailFewestItems = (row: ConsentDetailRow): number => Math.max(1, row.minItems ?? 0);

export default getConsentDetailFewestItems;
