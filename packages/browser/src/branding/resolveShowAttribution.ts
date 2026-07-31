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
 * Resolves whether the "Powered by ThunderID" attribution badge should be shown, given the
 * root-level (`ThunderIDProvider`'s `showAttribution` config field) and an optional
 * component-level `showAttribution` prop override.
 *
 * Precedence: the component-level value wins when defined, otherwise the root-level value is
 * used, otherwise the badge defaults to shown.
 *
 * Shared across framework SDKs so every wrapper (`@thunderid/react`, `@thunderid/vue`, ...)
 * applies the exact same precedence instead of re-implementing it.
 *
 * @param rootShowAttribution - `showAttribution` supplied to the root provider (e.g. `ThunderIDProvider`).
 * @param componentShowAttribution - Optional component-level `showAttribution` prop override.
 * @returns Whether the attribution badge should render.
 */
const resolveShowAttribution = (
  rootShowAttribution?: boolean,
  componentShowAttribution?: boolean,
): boolean => {
  if (componentShowAttribution !== undefined) {
    return componentShowAttribution;
  }

  if (rootShowAttribution !== undefined) {
    return rootShowAttribution;
  }

  return true;
};

export default resolveShowAttribution;
