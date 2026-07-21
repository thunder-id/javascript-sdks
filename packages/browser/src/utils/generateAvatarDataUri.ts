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

import {ANONYMOUS_ANIMAL_ICONS} from './anonymousAnimalIcons.generated';
import {ANONYMOUS_ENTITY_ICONS} from './anonymousEntityIcons.generated';
import type {AvatarParams} from './extractAvatarParamsFromUri';
import hashStr from './hashStr';
import pickAnonymousAvatarName from './pickAnonymousAvatarName';
import pickAnonymousEntityName from './pickAnonymousEntityName';

// Curated on-brand gradient pairs — `colors` rotates through this set.
const AVATAR_PALETTES: [string, string][] = [
  ['#FF7300', '#EF4223'],
  ['#3688FF', '#1d5eb4'],
  ['#5567D5', '#8B6FE8'],
  ['#06b6d4', '#0891b2'],
  ['#10b981', '#059669'],
  ['#ec4899', '#be185d'],
  ['#f59e0b', '#ea580c'],
  ['#8b5cf6', '#6d28d9'],
  ['#5CD1FF', '#3688FF'],
  ['#ef4444', '#b91c1c'],
];

/**
 * Number of distinct gradient rotations `colors` cycles through for the `blank`,
 * `one_letter`, and `two_letter` variants. Callers that offer a "pick a background" UI
 * (e.g. a shuffleable swatch grid) can sample `colors` indices in `[0, AVATAR_GRADIENT_COUNT)`
 * without needing the actual palette values.
 */
export const AVATAR_GRADIENT_COUNT: number = AVATAR_PALETTES.length;

/**
 * Fills in `params.content` when the spec itself didn't carry one, deriving it from a raw
 * seed name (e.g. an app or user display name) — extracting initials for letter variants,
 * or hash-picking a curated animal key for `anonymous_animal`.
 *
 * Callers that already have a final `content` value (pre-computed initials, or an exact
 * animal key) should skip this and pass it directly instead.
 *
 * @param variant - The avatar variant `content` is being derived for.
 * @param seedText - A raw name/seed to derive `content` from.
 * @returns A ready-to-render `content` value.
 *
 * @example
 * ```typescript
 * deriveAvatarContent('two_letter', 'Jane Doe'); // "JD"
 * deriveAvatarContent('anonymous_animal', 'session-abc123'); // "otter"
 * deriveAvatarContent('anonymous_entity', 'app-abc123'); // "hexagon"
 * deriveAvatarContent('blank', 'Jane Doe'); // ""
 * ```
 */
export const deriveAvatarContent = (variant: AvatarParams['variant'], seedText: string): string => {
  if (variant === 'anonymous_animal') {
    return pickAnonymousAvatarName(seedText || undefined);
  }
  if (variant === 'anonymous_entity') {
    return pickAnonymousEntityName(seedText || undefined);
  }
  if (variant === 'blank') {
    return '';
  }

  const letterCount: 1 | 2 = variant === 'one_letter' ? 1 : 2;
  return (seedText.match(/[A-Za-z0-9]/g) ?? ['A']).slice(0, letterCount).join('').toUpperCase();
};

/**
 * Renders the 100x100 background shape, filled either with a gradient/flat-color reference.
 */
const shapeMarkup = (shape: AvatarParams['shape'], fill: string): string =>
  shape === 'circle'
    ? `<circle cx="50" cy="50" r="50" fill="${fill}"/>`
    : `<rect width="100" height="100" rx="22" fill="${fill}"/>`;

/**
 * Renders a Vercel-style gradient avatar: a rounded/circle swatch, either bare (`blank`) or
 * topped with initials (`one_letter`/`two_letter`). `content` is assumed final (already the
 * initials to display, or empty for `blank`) — pass it through {@link deriveAvatarContent}
 * first if it needs deriving.
 */
const generateGradientAvatar = ({shape, variant, content, colors, bg}: AvatarParams): string => {
  let background: string;
  let defs = '';
  if (bg) {
    background = bg;
  } else {
    const h: number = hashStr(content || 'App');
    const idx: number = (((h + colors) % AVATAR_PALETTES.length) + AVATAR_PALETTES.length) % AVATAR_PALETTES.length;
    const [c1, c2] = AVATAR_PALETTES[idx];
    const angle: number = ((((h >> 4) + colors * 37) % 360) + 360) % 360;
    defs = `<defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="rotate(${angle} 0.5 0.5)"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs>`;
    background = 'url(#g)';
  }

  let text = '';
  if (variant !== 'blank') {
    const letterCount: 1 | 2 = variant === 'one_letter' ? 1 : 2;
    const initials: string = (content || 'A').toUpperCase().slice(0, letterCount);
    const fontSize: number = letterCount === 1 ? 46 : 34;
    text = `<text x="50" y="64" font-family="Helvetica,Arial,sans-serif" font-weight="700" font-size="${fontSize}" text-anchor="middle" fill="#fff">${initials}</text>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${defs}${shapeMarkup(shape, background)}${text}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/**
 * Renders one of the curated anonymous-animal icons, applying the requested background
 * shape and (optionally) recoloring the whole icon with `bg`. `content` is assumed to
 * already be a valid animal key — pass it through {@link deriveAvatarContent} first if
 * it needs deriving, or if it might be invalid/empty.
 */
const generateAnonymousAnimalAvatar = ({shape, content, bg}: AvatarParams): string => {
  const key: string = Object.prototype.hasOwnProperty.call(ANONYMOUS_ANIMAL_ICONS, content)
    ? content
    : pickAnonymousAvatarName();
  const icon = ANONYMOUS_ANIMAL_ICONS[key];
  const color: string = bg ?? icon.color;
  const markup: string = icon.markup.replaceAll('%COLOR%', color);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${shapeMarkup(shape, color)}${markup}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/**
 * Renders one of the curated anonymous-entity icons (application/organization/resource-server
 * shapes), applying the requested background shape and (optionally) recoloring the whole icon
 * with `bg`. `content` is assumed to already be a valid entity key — pass it through
 * {@link deriveAvatarContent} first if it needs deriving, or if it might be invalid/empty.
 */
const generateAnonymousEntityAvatar = ({shape, content, bg}: AvatarParams): string => {
  const key: string = Object.prototype.hasOwnProperty.call(ANONYMOUS_ENTITY_ICONS, content)
    ? content
    : pickAnonymousEntityName();
  const icon = ANONYMOUS_ENTITY_ICONS[key];
  const color: string = bg ?? icon.color;
  const markup: string = icon.markup.replaceAll('%COLOR%', color);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${shapeMarkup(shape, color)}${markup}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/**
 * Generates an avatar image as an `svg+xml` data URI from a fully-resolved {@link AvatarParams}.
 * `params.content` is assumed final; use {@link deriveAvatarContent} first if it might be
 * empty or otherwise needs deriving from a raw seed name.
 *
 * @param params - Resolved avatar parameters (see {@link AvatarParams}).
 * @returns A `data:image/svg+xml,...` URI rendering the generated avatar.
 *
 * @example
 * ```typescript
 * generateAvatarDataUri({shape: 'circle', variant: 'two_letter', content: 'BM', colors: 2});
 * generateAvatarDataUri({shape: 'rounded', variant: 'anonymous_animal', content: 'jackalope'});
 * generateAvatarDataUri({shape: 'rounded', variant: 'anonymous_entity', content: 'hexagon'});
 * generateAvatarDataUri({shape: 'circle', variant: 'blank', content: '', colors: 5});
 * ```
 */
const generateAvatarDataUri = (params: AvatarParams): string => {
  if (params.variant === 'anonymous_animal') {
    return generateAnonymousAnimalAvatar(params);
  }
  if (params.variant === 'anonymous_entity') {
    return generateAnonymousEntityAvatar(params);
  }
  return generateGradientAvatar(params);
};

export default generateAvatarDataUri;
