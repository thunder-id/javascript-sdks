// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {PagedSelectOption, PagedSelectOptionDefaults, PagedSelectOptionMapping} from '../models/paged-select';

const DEFAULT_LABEL_ATTRIBUTES: readonly string[] = ['label', 'name', 'title'];

const asText = (raw: unknown): string | undefined => {
  if (typeof raw === 'string') {
    return raw.trim() === '' ? undefined : raw;
  }

  return typeof raw === 'number' && Number.isFinite(raw) ? String(raw) : undefined;
};

const walkPath = (source: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (current: unknown, key: string) =>
        typeof current === 'object' && current !== null ? (current as Record<string, unknown>)[key] : undefined,
      source,
    );

const readText = (record: Record<string, unknown>, path: string): string | undefined =>
  asText(walkPath(record, path)) ?? asText(walkPath(record['attributes'], path));

const firstText = (record: Record<string, unknown>): string | undefined => {
  for (const raw of Object.values(record)) {
    const text: string | undefined = asText(raw);

    if (text !== undefined) {
      return text;
    }
  }

  return undefined;
};

const resolveValue = <T>(
  item: T,
  record: Record<string, unknown>,
  mapping?: PagedSelectOptionMapping<T>,
): string | undefined => {
  const custom: string | undefined = asText(mapping?.getValue?.(item));

  if (custom !== undefined) {
    return custom;
  }

  if (mapping?.valueAttribute !== undefined) {
    return readText(record, mapping.valueAttribute);
  }

  return readText(record, 'id') ?? readText(record, 'value') ?? firstText(record);
};

const resolveLabel = <T>(
  item: T,
  record: Record<string, unknown>,
  value: string,
  mapping?: PagedSelectOptionMapping<T>,
  defaults?: PagedSelectOptionDefaults,
): string => {
  const custom: string | undefined = asText(mapping?.getLabel?.(item));

  if (custom !== undefined) {
    return custom;
  }

  const id: string | undefined = readText(record, 'id');
  const paths: readonly string[] =
    mapping?.labelAttributes ??
    (id === undefined ? ['label'] : (defaults?.labelAttributes ?? DEFAULT_LABEL_ATTRIBUTES));

  for (const path of paths) {
    const text: string | undefined = readText(record, path);

    if (text !== undefined && text !== id) {
      return text;
    }
  }

  return value;
};

/**
 * Converts one raw item into an option.
 *
 * Plain text is its own label and value. An object uses the configured `mapping`; with none, an
 * object with an `id` submits it and labels it from `defaults.labelAttributes`, an `{label, value}`
 * object is used as is, and anything else uses its first text field for both.
 *
 * Returns `null` when there is nothing to submit.
 */
const toPagedSelectOption = <T = unknown>(
  item: T | string | number,
  mapping?: PagedSelectOptionMapping<T>,
  defaults?: PagedSelectOptionDefaults,
): PagedSelectOption | null => {
  if (typeof item === 'string' || typeof item === 'number') {
    const text: string | undefined = asText(item);

    return text === undefined ? null : {label: text, value: text};
  }

  if (typeof item !== 'object' || item === null) {
    return null;
  }

  const record = item as Record<string, unknown>;
  const value: string | undefined = resolveValue(item, record, mapping);

  return value === undefined ? null : {label: resolveLabel(item, record, value, mapping, defaults), value};
};

export default toPagedSelectOption;
