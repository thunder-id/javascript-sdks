// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import type {Args, ArgValue} from './storyTypes';

const kebab = (name: string): string => name.replace(/[A-Z]/g, (char: string) => `-${char.toLowerCase()}`);

const attr = (key: string, value: ArgValue): string => {
  const name: string = kebab(key);

  if (value === true) return name;
  if (value === false || typeof value === 'number') return `:${name}="${String(value)}"`;

  return `${name}="${value.replace(/"/g, '&quot;')}"`;
};

/**
 * Builds a template element from the props that differ from the component's own defaults.
 */
export const tag = (
  name: string,
  props: Args,
  options: {children?: string; defaults?: Args; extra?: string[]} = {},
): string => {
  const parts: string[] = Object.entries(props)
    .filter(
      ([key, value]: [string, ArgValue]) =>
        value !== '' &&
        options.defaults?.[key] !== value &&
        !(value === false && options.defaults?.[key] === undefined),
    )
    .map(([key, value]: [string, ArgValue]) => attr(key, value))
    .concat(options.extra ?? []);
  const inline: string = parts.length ? ` ${parts.join(' ')}` : '';
  const multiline: boolean = inline.length > 70;
  const attrs: string = multiline ? `\n  ${parts.join('\n  ')}\n` : inline;

  if (options.children) return `<${name}${attrs}>${options.children}</${name}>`;

  return `<${name}${attrs}${multiline ? '' : ' '}/>`;
};
