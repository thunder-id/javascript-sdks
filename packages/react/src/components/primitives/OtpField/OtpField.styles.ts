// Copyright 2024 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Theme} from '@thunderid/browser';
import {useMemo} from 'react';
import {css} from '../../../styles/emotion';

export type OtpFieldType = 'text' | 'number' | 'password';

/**
 * Creates styles for the OtpField component using BEM methodology
 * @param theme - The theme object containing design tokens
 * @param colorScheme - The current color scheme (used for memoization)
 * @param disabled - Whether the component is disabled
 * @param hasError - Whether the component has an error
 * @param length - Number of OTP input fields
 * @returns Object containing CSS class names for component styling
 */
const useStyles = (
  theme: Theme,
  colorScheme: string,
  disabled: boolean,
  hasError: boolean,
  length: number,
  separatorAfter?: number,
): Record<string, string> =>
  useMemo(() => {
    const isGrouped = separatorAfter !== undefined && separatorAfter > 0 && separatorAfter < length;
    const inputContainer: string = css`
      display: flex;
      gap: calc(${theme.vars.spacing.unit} * ${isGrouped ? 0.5 : 1});
      justify-content: ${isGrouped ? 'center' : 'space-between'};
      align-items: center;
      flex-wrap: ${isGrouped ? 'nowrap' : 'wrap'};
    `;

    const input: string = css`
      width: calc(${theme.vars.spacing.unit} * ${isGrouped ? 3.5 : 6});
      height: calc(${theme.vars.spacing.unit} * ${isGrouped ? 4.5 : 6});
      text-align: center;
      font-size: ${theme.vars.typography.fontSizes.xl};
      font-family: ${theme.vars.typography.fontFamily};
      font-weight: 500;
      border: 2px solid ${hasError ? theme.vars.colors.error.main : theme.vars.colors.border};
      border-radius: ${theme.vars.components?.Field?.root?.borderRadius || theme.vars.borderRadius.medium};
      color: ${theme.vars.colors.text.primary};
      background-color: ${disabled ? theme.vars.colors.background.disabled : theme.vars.colors.background.surface};
      outline: none;
      transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease;

      &:focus {
        border-color: ${hasError ? theme.vars.colors.error.main : theme.vars.colors.primary.main};
        box-shadow: 0 0 0 2px ${hasError ? `${theme.vars.colors.error.main}20` : `${theme.vars.colors.primary.main}20`};
      }

      &:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }

      &::placeholder {
        color: ${theme.vars.colors.text.secondary};
        opacity: 0.7;
      }
    `;

    const inputError: string = css`
      border-color: ${theme.vars.colors.error.main};

      &:focus {
        border-color: ${theme.vars.colors.error.main};
        box-shadow: 0 0 0 2px ${theme.vars.colors.error.main}20;
      }
    `;

    const inputDisabled: string = css`
      background-color: ${theme.vars.colors.background.disabled};
      cursor: not-allowed;
      opacity: 0.6;
    `;

    const separator: string = css`
      flex: none;
      color: ${theme.vars.colors.text.secondary};
      font-size: ${theme.vars.typography.fontSizes.xl};
      font-weight: 500;
    `;

    return {
      input,
      inputContainer,
      inputDisabled,
      inputError,
      separator,
    };
  }, [theme, colorScheme, disabled, hasError, length, separatorAfter]);

export default useStyles;
