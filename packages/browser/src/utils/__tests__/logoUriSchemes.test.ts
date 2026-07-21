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

import {extractEmojiFromUri, isEmojiUri} from '@thunderid/javascript';
import {describe, it, expect} from 'vitest';
import isAvatarUri from '../isAvatarUri';

describe('logo URI scheme predicates', () => {
  it('recognizes only their own scheme', () => {
    expect(isEmojiUri('emoji:🐯')).toBe(true);
    expect(isAvatarUri('avatar:shape=circle,variant=two_letter,content=BM')).toBe(true);

    const specs = ['emoji:🐯', 'avatar:shape=circle', 'https://example.com/logo.png'];
    expect(specs.filter(isEmojiUri)).toEqual(['emoji:🐯']);
    expect(specs.filter(isAvatarUri)).toEqual(['avatar:shape=circle']);
  });

  it('extracts the payload from their own scheme', () => {
    expect(extractEmojiFromUri('emoji:🐯')).toBe('🐯');
  });
});
