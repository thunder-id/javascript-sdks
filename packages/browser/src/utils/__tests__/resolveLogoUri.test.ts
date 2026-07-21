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
import {ANONYMOUS_ANIMAL_ICONS} from '../anonymousAnimalIcons.generated';
import {ANONYMOUS_ENTITY_ICONS} from '../anonymousEntityIcons.generated';
import generateAvatarDataUri from '../generateAvatarDataUri';
import resolveLogoUri from '../resolveLogoUri';

describe('resolveLogoUri', () => {
  it('resolves an emoji: spec to its glyph', () => {
    expect(resolveLogoUri('emoji:🐼')).toEqual({glyph: '🐼', kind: 'emoji'});
  });

  it('resolves an avatar: spec with explicit content to a generated data URI', () => {
    const resolved = resolveLogoUri('avatar:shape=circle,variant=two_letter,content=AC,colors=2');
    expect(resolved.kind).toBe('avatar');
    expect(resolved.imgSrc).toBe(
      generateAvatarDataUri({colors: 2, content: 'AC', shape: 'circle', variant: 'two_letter'}),
    );
  });

  it('derives content from the seed text when the spec has none', () => {
    const resolved = resolveLogoUri('avatar:shape=rounded,variant=two_letter,colors=0', 'Jane Doe');
    expect(decodeURIComponent(resolved.imgSrc ?? '')).toContain('>JA<');
  });

  it('resolves an anonymous_animal spec to its bundled icon markup', () => {
    const [name, icon] = Object.entries(ANONYMOUS_ANIMAL_ICONS)[0];
    const resolved = resolveLogoUri(`avatar:shape=rounded,variant=anonymous_animal,content=${name}`);
    expect(resolved.kind).toBe('avatar');
    expect(decodeURIComponent(resolved.imgSrc ?? '')).toContain(icon.color);
  });

  it('resolves an anonymous_entity spec to its bundled icon markup', () => {
    const [name, icon] = Object.entries(ANONYMOUS_ENTITY_ICONS)[0];
    const resolved = resolveLogoUri(`avatar:shape=rounded,variant=anonymous_entity,content=${name}`);
    expect(resolved.kind).toBe('avatar');
    expect(decodeURIComponent(resolved.imgSrc ?? '')).toContain(icon.color);
  });

  it('resolves a plain URL as-is', () => {
    expect(resolveLogoUri('https://example.com/logo.png')).toEqual({
      imgSrc: 'https://example.com/logo.png',
      kind: 'url',
    });
  });

  it('bundles the full curated anonymous-animal icon set', () => {
    expect(Object.keys(ANONYMOUS_ANIMAL_ICONS)).toHaveLength(19);
    Object.values(ANONYMOUS_ANIMAL_ICONS).forEach((icon) => {
      expect(icon.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(icon.markup.length).toBeGreaterThan(0);
    });
  });

  it('bundles the full curated anonymous-entity icon set', () => {
    expect(Object.keys(ANONYMOUS_ENTITY_ICONS)).toHaveLength(33);
    Object.values(ANONYMOUS_ENTITY_ICONS).forEach((icon) => {
      expect(icon.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(icon.markup.length).toBeGreaterThan(0);
    });
  });
});
