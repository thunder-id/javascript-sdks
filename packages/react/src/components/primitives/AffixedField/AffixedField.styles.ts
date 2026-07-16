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

import {css} from '@emotion/css';
import {Theme} from '@thunderid/browser';
import {useMemo} from 'react';

/**
 * Creates styles for the AffixedField component. The container is a horizontal flex
 * row with a prefix element (span or select) joined to a shared-border input.
 */
const useStyles = (
  theme: Theme,
  colorScheme: string,
  disabled: boolean,
  hasError: boolean,
  hasPrefix: boolean,
): Record<string, string> =>
  useMemo(() => {
    const borderColor: string = hasError ? theme.vars.colors.error.main : theme.vars.colors.border;
    const focusColor: string = hasError ? theme.vars.colors.error.main : theme.vars.colors.primary.main;
    const borderRadius: string = theme.vars.components?.Field?.root?.borderRadius ?? theme.vars.borderRadius.medium;

    const inputContainer: string = css`
      position: relative;
      display: flex;
      align-items: stretch;
      width: 100%;
    `;

    const inputBase: string = css`
      flex: 1;
      min-width: 0;
      padding-block: ${theme.vars.spacing.unit};
      padding-inline: calc(${theme.vars.spacing.unit} * 1.5);
      border: 1px solid ${borderColor};
      font-size: ${theme.vars.typography.fontSizes.md};
      font-family: ${theme.vars.typography.fontFamily};
      color: ${theme.vars.colors.text.primary};
      background-color: ${disabled ? theme.vars.colors.background.disabled : theme.vars.colors.background.surface};
      outline: none;
      transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease;

      &::placeholder {
        color: ${theme.vars.colors.text.secondary};
        opacity: 0.7;
      }

      &:focus {
        border-color: ${focusColor};
        box-shadow: 0 0 0 2px ${focusColor}20;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      &:hover:not(:disabled) {
        border-color: ${focusColor};
      }
    `;

    const input: string = hasPrefix
      ? css`
          ${inputBase};
          border-start-start-radius: 0;
          border-end-start-radius: 0;
          border-start-end-radius: ${borderRadius};
          border-end-end-radius: ${borderRadius};
          border-inline-start: none;
        `
      : css`
          ${inputBase};
          border-radius: ${borderRadius};
        `;

    const prefixBase: string = css`
      display: flex;
      align-items: center;
      padding-inline: calc(${theme.vars.spacing.unit} * 1.5);
      border: 1px solid ${borderColor};
      border-start-start-radius: ${borderRadius};
      border-end-start-radius: ${borderRadius};
      background-color: ${theme.vars.colors.background.surface};
      color: ${theme.vars.colors.text.primary};
      font-size: ${theme.vars.typography.fontSizes.md};
      font-family: ${theme.vars.typography.fontFamily};
      white-space: nowrap;
    `;

    const prefixSpan: string = css`
      ${prefixBase};
      user-select: none;
      color: ${theme.vars.colors.text.secondary};
    `;

    const prefixSelect: string = css`
      ${prefixBase};
      cursor: pointer;
      appearance: auto;
      padding-inline-end: calc(${theme.vars.spacing.unit} * 1.5);

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      &:focus {
        outline: none;
        border-color: ${focusColor};
        box-shadow: 0 0 0 2px ${focusColor}20;
        z-index: 1;
      }
    `;

    /**
     * Visually hides content while keeping it discoverable by assistive tech. Used
     * to expose the fixed prefix value to screen readers via `aria-describedby` while
     * the sighted-user span stays `aria-hidden` (decorative).
     */
    const visuallyHidden: string = css`
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;

    return {
      input,
      inputContainer,
      prefixSelect,
      prefixSpan,
      visuallyHidden,
    };
  }, [theme, colorScheme, disabled, hasError, hasPrefix]);

export default useStyles;
