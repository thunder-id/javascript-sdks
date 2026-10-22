// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Theme} from '@thunderid/browser';
import {useMemo} from 'react';
import {css} from '../../../../styles/emotion';

/**
 * Creates the styles for the detail list, chip list and inline confirmation used by the admin
 * components.
 *
 * @param theme - The theme object containing design tokens.
 * @param colorScheme - The current color scheme, used for memoization.
 * @returns The CSS class names for each part.
 */
const useStyles = (theme: Theme, colorScheme: string): Record<string, string> =>
  useMemo(() => {
    const unit: string = theme.vars.spacing.unit;

    return {
      chip: css`
        display: inline-flex;
        align-items: center;
        gap: calc(${unit} / 2);
        padding: calc(${unit} / 2) ${unit};
        border-radius: 999px;
        border: 1px solid ${theme.vars.colors.border};
        background: ${theme.vars.colors.background.surface};
        font-size: ${theme.vars.typography.fontSizes.sm};
        color: ${theme.vars.colors.text.primary};
      `,
      chipList: css`
        display: flex;
        flex-wrap: wrap;
        gap: ${unit};
        margin: 0;
        padding: 0;
        list-style: none;
      `,
      confirm: css`
        display: inline-flex;
        flex-wrap: wrap;
        align-items: center;
        gap: ${unit};
        font-size: ${theme.vars.typography.fontSizes.sm};
      `,
      detail: css`
        display: grid;
        grid-template-columns: fit-content(200px) minmax(0, 1fr);
        gap: ${unit} calc(${unit} * 2);
        margin: 0;
        font-size: ${theme.vars.typography.fontSizes.sm};
      `,
      detailLabel: css`
        color: ${theme.vars.colors.text.secondary};
      `,
      detailValue: css`
        margin: 0;
        color: ${theme.vars.colors.text.primary};
        overflow-wrap: anywhere;
      `,
      muted: css`
        color: ${theme.vars.colors.text.secondary};
        font-size: ${theme.vars.typography.fontSizes.sm};
      `,
      panel: css`
        display: flex;
        flex-direction: column;
        gap: calc(${unit} * 1.5);
        padding: calc(${unit} * 2);
        border: 1px solid ${theme.vars.colors.border};
        border-radius: ${theme.vars.borderRadius.large};
        background: ${theme.vars.colors.background.surface};
      `,
      panelTitle: css`
        margin: 0;
        font-size: ${theme.vars.typography.fontSizes.md};
        font-weight: ${theme.vars.typography.fontWeights.semibold};
      `,
      row: css`
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: calc(${unit} * 1.5);
      `,
    };
  }, [theme, colorScheme]);

export default useStyles;
