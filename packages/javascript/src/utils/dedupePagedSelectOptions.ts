// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {PagedSelectOption} from '../models/paged-select';

/**
 * Appends `incoming` to `existing`, keeping each value at its first position and taking the newest
 * data when a value repeats (offset paging can return the same item on two pages).
 */
const dedupePagedSelectOptions = (
  existing: PagedSelectOption[],
  incoming: PagedSelectOption[],
): PagedSelectOption[] => {
  const merged: PagedSelectOption[] = [...existing];
  const indexByValue = new Map<string, number>(merged.map((option, index) => [option.value, index]));

  incoming.forEach((option: PagedSelectOption) => {
    const existingIndex: number | undefined = indexByValue.get(option.value);

    if (existingIndex === undefined) {
      indexByValue.set(option.value, merged.length);
      merged.push(option);
    } else {
      merged[existingIndex] = option;
    }
  });

  return merged;
};

export default dedupePagedSelectOptions;
