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

export const AVATAR_URI_SCHEME = 'avatar:';

/**
 * Checks whether a given URI uses the `avatar:` scheme
 * (e.g. `"avatar:style=rounded,text=Acme,colors=2"`).
 *
 * @param uri - The URI string to check.
 * @returns `true` if the URI starts with `"avatar:"`, `false` otherwise.
 *
 * @example
 * ```typescript
 * isAvatarUri("avatar:style=circle,text=Acme,colors=0"); // true
 * isAvatarUri("emoji:🐯");                                // false
 * ```
 */
const isAvatarUri = (uri: string): boolean => typeof uri === 'string' && uri.startsWith(AVATAR_URI_SCHEME);

export default isAvatarUri;
