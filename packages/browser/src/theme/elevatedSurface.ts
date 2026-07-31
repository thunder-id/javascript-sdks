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

import {Theme} from '@thunderid/javascript';

export interface ElevatedSurfaceTokens {
  /**
   * Themed surface background.
   */
  background: string;
  /**
   * Themed 1px border shorthand (`1px solid <color>`).
   */
  border: string;
  /**
   * Large corner radius, shared by every top-level card surface (auth cards, dropdowns,
   * profile/organization panels).
   */
  borderRadius: string;
  /**
   * Elevated drop shadow used to lift a card off the page background.
   */
  boxShadow: string;
  /**
   * Comfortable card padding (vertical, horizontal).
   */
  padding: string;
}

/**
 * Resolves the shared "elevated surface" look — the rounded, bordered, drop-shadowed card
 * treatment used across every top-level ThunderID surface (`SignIn`, `SignUp`, `Recovery`,
 * `UserDropdown`, `UserProfile`, and friends).
 *
 * Centralizing this recipe here means every framework SDK composes the exact same combination
 * of theme tokens instead of each component picking its own subset (which is how, prior to
 * this, some cards had a shadow and others didn't). Consumers spread the result into their own
 * CSS-in-JS or stylesheet rules alongside layout-specific properties (`gap`, `min-width`, ...).
 *
 * @param theme - The resolved theme object.
 * @returns The shared elevated-surface CSS token values.
 */
export const getElevatedSurfaceTokens = (theme: Theme): ElevatedSurfaceTokens => ({
  background: theme.vars.colors.background.surface,
  border: `1px solid ${theme.vars.colors.border}`,
  borderRadius: theme.vars.borderRadius.large,
  boxShadow: theme.vars.shadows.large,
  padding: `calc(${theme.vars.spacing.unit} * 4) calc(${theme.vars.spacing.unit} * 3.5)`,
});

export default getElevatedSurfaceTokens;
