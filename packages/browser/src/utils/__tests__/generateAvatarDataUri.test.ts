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

import {describe, it, expect} from 'vitest';
import type {AvatarParams} from '../extractAvatarParamsFromUri';
import generateAvatarDataUri, {deriveAvatarContent, AVATAR_GRADIENT_COUNT} from '../generateAvatarDataUri';

const params = (overrides: Partial<AvatarParams>): AvatarParams => ({
  colors: 0,
  content: '',
  shape: 'rounded',
  variant: 'two_letter',
  ...overrides,
});

describe('generateAvatarDataUri — letter variants', () => {
  it('is deterministic for the same inputs', () => {
    const p = params({colors: 1, content: 'AC', shape: 'circle'});
    expect(generateAvatarDataUri(p)).toBe(generateAvatarDataUri({...p}));
  });

  it('renders a circle for shape=circle and a rounded rect otherwise', () => {
    expect(decodeURIComponent(generateAvatarDataUri(params({content: 'AC', shape: 'circle'})))).toContain('<circle');
    expect(decodeURIComponent(generateAvatarDataUri(params({content: 'AC', shape: 'rounded'})))).toContain('<rect');
  });

  it('renders one or two letters depending on variant', () => {
    expect(decodeURIComponent(generateAvatarDataUri(params({content: 'AC', variant: 'two_letter'})))).toContain('>AC<');
    expect(decodeURIComponent(generateAvatarDataUri(params({content: 'AC', variant: 'one_letter'})))).toContain('>A<');
  });

  it('defaults content to "A" when empty', () => {
    expect(decodeURIComponent(generateAvatarDataUri(params({content: ''})))).toContain('>A<');
  });

  it('rotates the gradient palette as colors changes', () => {
    const base = generateAvatarDataUri(params({content: 'Acme', colors: 0}));
    expect(generateAvatarDataUri(params({content: 'Acme', colors: 1}))).not.toBe(base);
    expect(generateAvatarDataUri(params({content: 'Acme', colors: 10}))).not.toBe(base);
    expect(generateAvatarDataUri(params({content: 'Acme', colors: -3}))).toMatch(/^data:image\/svg\+xml,/);
  });

  it('uses a flat bg color instead of a gradient when provided', () => {
    const svg = decodeURIComponent(generateAvatarDataUri(params({content: 'AC', bg: '#FF5733'})));
    expect(svg).not.toContain('<linearGradient');
    expect(svg).toContain('fill="#FF5733"');
  });
});

describe('generateAvatarDataUri — blank variant', () => {
  it('renders the gradient background with no text', () => {
    const svg = decodeURIComponent(generateAvatarDataUri(params({content: '', variant: 'blank'})));
    expect(svg).not.toContain('<text');
    expect(svg).toContain('<linearGradient');
  });

  it('still rotates the gradient palette as colors changes', () => {
    const base = generateAvatarDataUri(params({content: '', variant: 'blank', colors: 0}));
    expect(generateAvatarDataUri(params({content: '', variant: 'blank', colors: 1}))).not.toBe(base);
  });

  it('uses a flat bg color instead of a gradient when provided', () => {
    const svg = decodeURIComponent(generateAvatarDataUri(params({content: '', variant: 'blank', bg: '#FF5733'})));
    expect(svg).not.toContain('<linearGradient');
    expect(svg).toContain('fill="#FF5733"');
  });
});

describe('AVATAR_GRADIENT_COUNT', () => {
  it('matches the number of distinct gradient rotations', () => {
    expect(AVATAR_GRADIENT_COUNT).toBeGreaterThan(0);
    const seen = new Set(
      Array.from({length: AVATAR_GRADIENT_COUNT}, (_, colors) =>
        generateAvatarDataUri(params({content: 'Acme', variant: 'blank', colors})),
      ),
    );
    expect(seen.size).toBe(AVATAR_GRADIENT_COUNT);
  });
});

describe('generateAvatarDataUri — anonymous_animal variant', () => {
  it('renders the requested animal with its curated color', () => {
    const svg = decodeURIComponent(
      generateAvatarDataUri(params({content: 'jackalope', shape: 'rounded', variant: 'anonymous_animal'})),
    );
    expect(svg).toContain('fill="#2E9E9E"');
  });

  it('recolors both background and accent details when bg is provided', () => {
    const svg = decodeURIComponent(
      generateAvatarDataUri(params({content: 'mink', variant: 'anonymous_animal', bg: '#112233'})),
    );
    expect(svg.match(/#112233/gi)?.length).toBeGreaterThan(1);
    expect(svg).not.toContain('#3B7DD8');
  });

  it('renders a circle for shape=circle and a rounded rect otherwise', () => {
    expect(
      decodeURIComponent(
        generateAvatarDataUri(params({content: 'otter', variant: 'anonymous_animal', shape: 'circle'})),
      ),
    ).toContain('<circle');
    expect(
      decodeURIComponent(
        generateAvatarDataUri(params({content: 'otter', variant: 'anonymous_animal', shape: 'rounded'})),
      ),
    ).toContain('<rect');
  });

  it('falls back to a valid animal when content is not a known key', () => {
    expect(generateAvatarDataUri(params({content: 'not-a-real-animal', variant: 'anonymous_animal'}))).toMatch(
      /^data:image\/svg\+xml,/,
    );
  });
});

describe('generateAvatarDataUri — anonymous_entity variant', () => {
  it('renders the requested entity icon with its curated color', () => {
    const svg = decodeURIComponent(
      generateAvatarDataUri(params({content: 'hexagon', shape: 'rounded', variant: 'anonymous_entity'})),
    );
    expect(svg).toContain('fill="#3B7DD8"');
  });

  it('recolors both background and accent details when bg is provided', () => {
    const svg = decodeURIComponent(
      generateAvatarDataUri(params({content: 'lock', variant: 'anonymous_entity', bg: '#112233'})),
    );
    expect(svg.match(/#112233/gi)?.length).toBeGreaterThan(1);
    expect(svg).not.toContain('#E0348E');
  });

  it('renders a circle for shape=circle and a rounded rect otherwise', () => {
    expect(
      decodeURIComponent(
        generateAvatarDataUri(params({content: 'star', variant: 'anonymous_entity', shape: 'circle'})),
      ),
    ).toContain('<circle');
    expect(
      decodeURIComponent(
        generateAvatarDataUri(params({content: 'star', variant: 'anonymous_entity', shape: 'rounded'})),
      ),
    ).toContain('<rect');
  });

  it('falls back to a valid entity icon when content is not a known key', () => {
    expect(generateAvatarDataUri(params({content: 'not-a-real-entity', variant: 'anonymous_entity'}))).toMatch(
      /^data:image\/svg\+xml,/,
    );
  });
});

describe('deriveAvatarContent', () => {
  it('extracts one or two initials from a raw seed name', () => {
    expect(deriveAvatarContent('two_letter', 'Jane Doe')).toBe('JA');
    expect(deriveAvatarContent('one_letter', 'Jane Doe')).toBe('J');
  });

  it('handles a seed with no alphanumeric characters', () => {
    expect(deriveAvatarContent('two_letter', '🚀')).toBe('A');
  });

  it('hash-picks a valid anonymous animal key for the same seed deterministically', () => {
    expect(deriveAvatarContent('anonymous_animal', 'session-abc')).toBe(
      deriveAvatarContent('anonymous_animal', 'session-abc'),
    );
  });

  it('hash-picks a valid anonymous entity key for the same seed deterministically', () => {
    expect(deriveAvatarContent('anonymous_entity', 'app-abc')).toBe(deriveAvatarContent('anonymous_entity', 'app-abc'));
  });

  it('is always empty for the blank variant', () => {
    expect(deriveAvatarContent('blank', 'Jane Doe')).toBe('');
    expect(deriveAvatarContent('blank', '')).toBe('');
  });
});
