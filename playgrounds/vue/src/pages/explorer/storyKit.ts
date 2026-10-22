// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {Args, ArgValue, PropControl} from './types';

// Helpers shared by the story files: arg readers, the template builder behind the Code panel, and
// controls several components reuse.

export const str = (args: Args, key: string): string => String(args[key] ?? '');
export const bool = (args: Args, key: string): boolean => args[key] === true;
export const num = (args: Args, key: string): number => Number(args[key] ?? 0);

const kebab = (key: string): string => key.replace(/[A-Z]/g, (char: string) => `-${char.toLowerCase()}`);

const attr = (key: string, value: ArgValue): string => {
  if (value === true) return kebab(key);
  if (typeof value === 'number') return `:${kebab(key)}="${value}"`;

  return `${kebab(key)}="${String(value).replace(/"/g, '&quot;')}"`;
};

/**
 * Builds a Vue template element from the props that differ from the component defaults. Booleans
 * use the attribute shorthand, numbers are bound, and camelCase props are written in kebab-case.
 */
export const tpl = (
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

/** Returns slot content only when the label is set, so empty labels fall back to the translated default. */
export const slot = (text: string): {default: () => string} | undefined => (text ? {default: () => text} : undefined);

export const SIZE: readonly string[] = ['small', 'medium', 'large'];
export const CARD_VARIANT: readonly string[] = ['elevated', 'outlined', 'flat'];
export const SOURCE_CONTROL: PropControl = {
  control: ['base', 'live'],
  description: 'base renders the presentational Base component with sample data; live uses the SDK context.',
  name: 'source',
  type: "'base' | 'live' (playground only)",
};

export const quoted = (value: unknown): string => `"${String(value)}"`;

/** Declares an empty event handler in the generated `<script setup>`. */
export const handler = (name: string): string[] => [`const ${name} = (): void => {};`];
