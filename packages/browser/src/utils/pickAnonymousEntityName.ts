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

import {ANONYMOUS_ENTITY_ICONS} from './anonymousEntityIcons.generated';
import hashStr from './hashStr';

const ANONYMOUS_ENTITY_NAMES: string[] = Object.keys(ANONYMOUS_ENTITY_ICONS).sort();

/**
 * Deterministically picks one of the curated anonymous-entity icon keys for a given seed
 * (e.g. an application, organization, or resource server identifier), so the same seed
 * always maps to the same icon.
 *
 * Use this to derive the `content` value for an `avatar:variant=anonymous_entity` spec —
 * the spec parser itself does no hashing, it just looks up whatever key it's given.
 *
 * @param seed - Seed text the pick is derived from. Falls back to a random pick when omitted.
 * @returns An anonymous entity key (e.g. `"hexagon"`) usable as `avatar:` spec's `content` param.
 *
 * @example
 * ```typescript
 * pickAnonymousEntityName('app-abc123'); // "hexagon"
 * `avatar:variant=anonymous_entity,content=${pickAnonymousEntityName(appId)}`;
 * ```
 */
const pickAnonymousEntityName = (seed?: string): string => {
  const index: number = seed
    ? hashStr(seed) % ANONYMOUS_ENTITY_NAMES.length
    : Math.floor(Math.random() * ANONYMOUS_ENTITY_NAMES.length);

  return ANONYMOUS_ENTITY_NAMES[index];
};

export default pickAnonymousEntityName;
