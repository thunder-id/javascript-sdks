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
import extractAvatarParamsFromUri from '../extractAvatarParamsFromUri';

describe('extractAvatarParamsFromUri', () => {
  it('parses shape, variant, content, and colors', () => {
    expect(extractAvatarParamsFromUri('avatar:shape=circle,variant=two_letter,content=BM,colors=2')).toEqual({
      colors: 2,
      content: 'BM',
      shape: 'circle',
      variant: 'two_letter',
    });
  });

  it('parses an anonymous_animal spec', () => {
    expect(extractAvatarParamsFromUri('avatar:shape=rounded,variant=anonymous_animal,content=jackalope')).toEqual({
      colors: 0,
      content: 'jackalope',
      shape: 'rounded',
      variant: 'anonymous_animal',
    });
  });

  it('parses an anonymous_entity spec', () => {
    expect(extractAvatarParamsFromUri('avatar:shape=rounded,variant=anonymous_entity,content=hexagon')).toEqual({
      colors: 0,
      content: 'hexagon',
      shape: 'rounded',
      variant: 'anonymous_entity',
    });
  });

  it('parses a blank spec', () => {
    expect(extractAvatarParamsFromUri('avatar:shape=circle,variant=blank,content=,colors=3')).toEqual({
      colors: 3,
      content: '',
      shape: 'circle',
      variant: 'blank',
    });
  });

  it('parses an explicit bg override', () => {
    expect(extractAvatarParamsFromUri('avatar:shape=circle,variant=one_letter,content=A,bg=#FF5733')).toEqual({
      bg: '#FF5733',
      colors: 0,
      content: 'A',
      shape: 'circle',
      variant: 'one_letter',
    });
  });

  it('falls back to defaults for missing or invalid params', () => {
    expect(extractAvatarParamsFromUri('avatar:')).toEqual({
      colors: 0,
      content: '',
      shape: 'rounded',
      variant: 'two_letter',
    });
    expect(extractAvatarParamsFromUri('avatar:shape=bogus,variant=bogus,colors=notanumber')).toEqual({
      colors: 0,
      content: '',
      shape: 'rounded',
      variant: 'two_letter',
    });
  });

  it('keeps = characters inside the content value', () => {
    expect(extractAvatarParamsFromUri('avatar:shape=circle,content=a=b,colors=1').content).toBe('a=b');
  });
});
