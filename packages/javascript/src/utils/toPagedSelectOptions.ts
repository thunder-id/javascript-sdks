// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import toPagedSelectOption from './toPagedSelectOption';
import type {PagedSelectOption, PagedSelectOptionDefaults, PagedSelectOptionMapping} from '../models/paged-select';

const toPagedSelectOptions = <T = unknown>(
  items: (T | string | number)[],
  mapping?: PagedSelectOptionMapping<T>,
  defaults?: PagedSelectOptionDefaults,
): PagedSelectOption[] =>
  items
    .map((item: T | string | number) => toPagedSelectOption(item, mapping, defaults))
    .filter((option: PagedSelectOption | null): option is PagedSelectOption => option !== null);

export default toPagedSelectOptions;
