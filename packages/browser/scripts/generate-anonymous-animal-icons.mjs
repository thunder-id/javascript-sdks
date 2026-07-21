/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/**
 * Regenerates `src/utils/anonymousAnimalIcons.generated.ts` from the SVG files in
 * `static/images/anonymous`. Each source SVG is a self-contained badge (a colored
 * rounded-square background + white icon paths). This script strips the background
 * `<rect>`, records its fill color as the animal's default color, and replaces any
 * reuse of that same color elsewhere in the markup (accent details like eyes/nostrils)
 * with a `%COLOR%` placeholder so `generateAvatarDataUri` can re-color the whole icon
 * (background + accents) together when a caller supplies an explicit `bg` override.
 *
 * Run this whenever an icon is added, removed, or replaced under `static/images/anonymous`.
 *
 * Usage: node scripts/generate-anonymous-animal-icons.mjs
 */

import {readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dir = join(root, 'static', 'images', 'avatars', 'anonymous_animals');

const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const names = readdirSync(dir)
  .filter((file) => file.endsWith('.svg'))
  .map((file) => file.replace(/\.svg$/, ''))
  .sort();

const icons = names.map((name) => {
  const svg = readFileSync(join(dir, `${name}.svg`), 'utf-8');

  const rectMatch = svg.match(/<rect[^>]*fill="(#[0-9a-fA-F]{3,8})"[^>]*\/>/);
  if (!rectMatch) {
    throw new Error(`${name}.svg: could not find a background <rect fill="#...">`);
  }
  const color = rectMatch[1];

  const withoutRect = svg.replace(rectMatch[0], '');
  const colorPattern = new RegExp(escapeRegExp(color), 'gi');
  const markup = withoutRect
    .replace(/<svg[^>]*>/, '')
    .replace('</svg>', '')
    .replace(colorPattern, '%COLOR%')
    .trim();

  return {color, markup, name};
});

const banner = `/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// AUTO-GENERATED FILE. Do not edit directly.
// Regenerate with: node scripts/generate-anonymous-animal-icons.mjs
// Source SVGs live in static/images/anonymous.

export interface AnonymousAnimalIcon {
  /** The animal's curated default background color (hex). */
  color: string;
  /** Inner SVG markup (no outer <svg>/<rect>). Any "%COLOR%" token is the animal's
   *  color, substitutable at render time so a custom "bg" recolors accents too. */
  markup: string;
}

`;

const entries = icons
  .map(
    ({name, color, markup}) =>
      `  ${JSON.stringify(name)}: {color: ${JSON.stringify(color)}, markup: ${JSON.stringify(markup)}},`,
  )
  .join('\n');

const output = `${banner}export const ANONYMOUS_ANIMAL_ICONS: Record<string, AnonymousAnimalIcon> = {\n${entries}\n};\n`;

writeFileSync(join(root, 'src', 'utils', 'anonymousAnimalIcons.generated.ts'), output);

// eslint-disable-next-line no-console
console.log(`Generated anonymousAnimalIcons.generated.ts with ${icons.length} anonymous animal icon(s).`);
