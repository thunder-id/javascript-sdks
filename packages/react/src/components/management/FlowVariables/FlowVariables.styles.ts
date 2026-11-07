// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Theme} from '@thunderid/browser';
import {useMemo} from 'react';
import {css} from '../../../styles/emotion';

/**
 * Creates the styles of the flow variables form.
 *
 * @param theme - The theme object containing design tokens.
 * @param colorScheme - The current color scheme, used for memoization.
 * @returns The CSS class names for each part.
 */
const useStyles = (theme: Theme, colorScheme: string): Record<string, string> =>
  useMemo(() => {
    const unit: string = theme.vars.spacing.unit;
    const chip: string = css`
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
      padding: 2px calc(${unit} * 1.25);
      border-radius: 999px;
      border: 1px solid ${theme.vars.colors.border};
      font-size: ${theme.vars.typography.fontSizes.xs};
      font-weight: ${theme.vars.typography.fontWeights.medium};
      color: ${theme.vars.colors.text.secondary};
      white-space: nowrap;
    `;

    return {
      actions: css`
        display: flex;
        align-items: center;
        gap: ${unit};
      `,
      actionsSpacer: css`
        flex-grow: 1;
      `,
      card: css`
        display: flex;
        flex-direction: column;
        gap: calc(${unit} * 2);
        padding: calc(${unit} * 2.5) calc(${unit} * 3);
        background: ${theme.vars.colors.background.surface};
        border: 1px solid ${theme.vars.colors.border};
        border-radius: ${theme.vars.borderRadius.large};
      `,
      cardLocked: css`
        background: ${theme.vars.colors.background.disabled};
      `,
      chip,
      chipCustomized: css`
        ${chip}
        border-color: ${theme.vars.colors.success.main};
        color: ${theme.vars.colors.success.main};
      `,
      description: css`
        margin: calc(${unit} / 4) 0 0;
        color: ${theme.vars.colors.text.secondary};
        font-size: ${theme.vars.typography.fontSizes.sm};
      `,
      empty: css`
        margin: 0;
        color: ${theme.vars.colors.text.secondary};
      `,
      form: css`
        display: flex;
        flex-direction: column;
        gap: calc(${unit} * 2.5);
        max-width: 880px;
      `,
      header: css`
        display: flex;
        align-items: flex-start;
        gap: calc(${unit} * 1.5);
      `,
      headerText: css`
        flex-grow: 1;
        min-width: 0;
      `,
      hint: css`
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: calc(${unit} * 1.25);
        margin: 0;
        color: ${theme.vars.colors.text.secondary};
        font-size: ${theme.vars.typography.fontSizes.xs};
      `,
      label: css`
        font-size: ${theme.vars.typography.fontSizes.md};
        font-weight: ${theme.vars.typography.fontWeights.medium};
        color: ${theme.vars.colors.text.primary};
      `,
      link: css`
        padding: 0;
        border: 0;
        background: none;
        font: inherit;
        font-weight: ${theme.vars.typography.fontWeights.medium};
        color: ${theme.vars.colors.primary.main};
        cursor: pointer;
        &:hover {
          text-decoration: underline;
        }
      `,
      lockedLine: css`
        display: flex;
        align-items: center;
        gap: calc(${unit} * 1.25);
        color: ${theme.vars.colors.text.secondary};
        font-size: ${theme.vars.typography.fontSizes.sm};
      `,
      scope: css`
        display: flex;
        align-items: center;
        gap: calc(${unit} * 1.5);
      `,
    };
  }, [theme, colorScheme]);

export default useStyles;
