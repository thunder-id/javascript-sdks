// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Theme} from '@thunderid/browser';
import {useMemo} from 'react';
import {css} from '../../../styles/emotion';

/**
 * Creates the styles for the DataTable primitive.
 *
 * @param theme - The theme object containing design tokens.
 * @param colorScheme - The current color scheme, used for memoization.
 * @returns The CSS class names for each part of the table.
 */
const useStyles = (theme: Theme, colorScheme: string): Record<string, string> =>
  useMemo(() => {
    const unit: string = theme.vars.spacing.unit;

    return {
      cell: css`
        padding: calc(${unit} * 1.5) calc(${unit} * 2);
        text-align: start;
        vertical-align: middle;
        color: ${theme.vars.colors.text.primary};
        border-top: 1px solid ${theme.vars.colors.border};
      `,
      empty: css`
        padding: calc(${unit} * 4) calc(${unit} * 2);
        text-align: center;
        color: ${theme.vars.colors.text.secondary};
      `,
      footer: css`
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: ${unit};
        padding: calc(${unit} * 1.5) calc(${unit} * 2);
        border-top: 1px solid ${theme.vars.colors.border};
        color: ${theme.vars.colors.text.secondary};
        font-size: ${theme.vars.typography.fontSizes.sm};
      `,
      footerActions: css`
        display: flex;
        gap: ${unit};
      `,
      headerCell: css`
        padding: calc(${unit} * 1.5) calc(${unit} * 2);
        text-align: start;
        font-size: ${theme.vars.typography.fontSizes.sm};
        font-weight: ${theme.vars.typography.fontWeights.medium};
        color: ${theme.vars.colors.text.secondary};
        white-space: nowrap;
      `,
      root: css`
        width: 100%;
        overflow-x: auto;
        background: ${theme.vars.colors.background.surface};
        border: 1px solid ${theme.vars.colors.border};
        border-radius: ${theme.vars.borderRadius.large};
        font-family: ${theme.vars.typography.fontFamily};
        font-size: ${theme.vars.typography.fontSizes.sm};
      `,
      row: css`
        &[data-clickable='true'] {
          cursor: pointer;
        }

        &[data-clickable='true']:hover,
        &[data-selected='true'] {
          background: ${theme.vars.colors.action.hover};
        }
      `,
      rowButton: css`
        all: unset;
        cursor: pointer;
        font-weight: ${theme.vars.typography.fontWeights.medium};
        color: ${theme.vars.colors.text.primary};

        &:focus-visible {
          outline: 2px solid ${theme.vars.colors.primary.main};
          outline-offset: 2px;
          border-radius: ${theme.vars.borderRadius.small};
        }
      `,
      table: css`
        width: 100%;
        min-width: 560px;
        border-collapse: collapse;
      `,
      visuallyHidden: css`
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      `,
    };
  }, [theme, colorScheme]);

export default useStyles;
