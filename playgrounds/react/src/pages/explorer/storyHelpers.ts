// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {Args, ArgValue, PropControl} from './types';

export const str = (args: Args, key: string): string => String(args[key] ?? '');
export const bool = (args: Args, key: string): boolean => args[key] === true;
export const num = (args: Args, key: string): number => Number(args[key] ?? 0);

const attr = (key: string, value: ArgValue): string => {
  if (value === true) return key;
  if (typeof value === 'number') return `${key}={${value}}`;

  return `${key}="${String(value).replace(/"/g, '&quot;')}"`;
};

/**
 * Builds a JSX element string from the props that differ from the component defaults.
 */
export const jsx = (
  tag: string,
  props: Args,
  options: {children?: string; defaults?: Args; extra?: string[]} = {},
): string => {
  const parts: string[] = Object.entries(props)
    .filter(
      ([key, value]: [string, ArgValue]) =>
        value !== false && value !== '' && value !== undefined && options.defaults?.[key] !== value,
    )
    .map(([key, value]: [string, ArgValue]) => attr(key, value))
    .concat(options.extra ?? []);
  const inline: string = parts.length ? ` ${parts.join(' ')}` : '';
  const multiline: boolean = inline.length > 70;
  const attrs: string = multiline ? `\n  ${parts.join('\n  ')}\n` : inline;

  if (options.children) return `<${tag}${attrs}>${options.children}</${tag}>`;

  return `<${tag}${attrs}${multiline ? '' : ' '}/>`;
};

export const omit = (args: Args, ...keys: string[]): Args =>
  Object.fromEntries(Object.entries(args).filter(([key]: [string, ArgValue]) => !keys.includes(key)));

export const SOURCE_CONTROL: PropControl = {
  control: ['base', 'live'],
  description: 'base renders the presentational Base component with sample data; live uses the SDK context.',
  name: 'source',
  type: "'base' | 'live' (playground only)",
};
