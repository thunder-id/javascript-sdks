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
import pickAnonymousAvatarName from '../pickAnonymousAvatarName';

describe('pickAnonymousAvatarName', () => {
  it('always returns a name present in the bundled anonymous icon set', () => {
    expect(Object.keys(ANONYMOUS_ANIMAL_ICONS)).toContain(pickAnonymousAvatarName('some-seed'));
    expect(Object.keys(ANONYMOUS_ANIMAL_ICONS)).toContain(pickAnonymousAvatarName());
  });

  it('is deterministic for the same seed', () => {
    expect(pickAnonymousAvatarName('session-abc123')).toBe(pickAnonymousAvatarName('session-abc123'));
  });

  it('can differ across seeds', () => {
    const names = new Set(['a', 'b', 'c', 'd', 'e'].map((seed) => pickAnonymousAvatarName(seed)));
    expect(names.size).toBeGreaterThan(1);
  });
});
