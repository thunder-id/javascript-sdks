// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {EmbeddedFlowComponent} from './embedded-flow';

/**
 * A selectable option: `label` is shown, `value` is submitted.
 */
export interface PagedSelectOption {
  disabled?: boolean;
  label: string;
  value: string;
}

/**
 * One page request sent to a {@link FetchPagedOptions} loader.
 */
export interface PagedSelectRequest {
  component: EmbeddedFlowComponent;
  filter?: string;
  limit: number;
  offset: number;
  signal: AbortSignal;
}

/**
 * One page returned by a loader. Return ready-made `options`, or raw `items` for the picker to
 * convert with its `mapping`. `nextOffset` is `null` on the last page, otherwise it must be greater
 * than the request's `offset`.
 */
export interface PagedSelectPage {
  items?: unknown[];
  nextOffset: number | null;
  options?: PagedSelectOption[];
  totalResults?: number;
}

export type FetchPagedOptions = (request: PagedSelectRequest) => Promise<PagedSelectPage>;

/**
 * Chooses which field of each raw item is the label and which is the value.
 *
 * A field is a key of the item, or a dotted path into it (`'name.given'`); keys inside an
 * `attributes` object are found too. Plain strings and numbers need no mapping.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the item shape belongs to the consumer's loader
export interface PagedSelectOptionMapping<T = any> {
  getLabel?: (item: T) => string | undefined;
  getValue?: (item: T) => string | undefined;
  /** Fields tried in order for the label; the first non-empty one that is not the item's `id` wins. */
  labelAttributes?: string[];
  /** Field submitted as the value. When set, items without it are left out. */
  valueAttribute?: string;
}

/**
 * What a specialised picker (users, emails, ...) assumes about its items when none is configured.
 */
export interface PagedSelectOptionDefaults {
  /** Label fields tried for items that have an `id`. */
  labelAttributes?: readonly string[];
}
