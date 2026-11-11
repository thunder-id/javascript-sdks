// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Theme} from '@thunderid/browser';
import {useMemo} from 'react';
import {css} from '../../../styles/emotion';

/**
 * Creates styles for the FlowExpired component.
 * @param theme - The theme object containing design tokens
 * @param colorScheme - The current color scheme (used for memoization)
 * @returns Object containing CSS class names for component styling
 */
const useStyles = (theme: Theme, colorScheme: string): Record<string, string> =>
  useMemo(
    () => ({
      root: css({
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        gap: `calc(${theme.vars.spacing.unit} * 1.5)`,
        paddingBlock: theme.vars.spacing.unit,
        textAlign: 'center',
        // Focused only for a screen reader to read it, so it shows no ring. It is not a control.
        '&:focus': {outline: 'none'},
      }),
      icon: css({
        color: theme.vars.colors.warning.main,
        display: 'flex',
      }),
      action: css({
        marginTop: theme.vars.spacing.unit,
      }),
      link: css({
        color: theme.vars.colors.primary.main,
        display: 'inline-flex',
        fontWeight: theme.vars.typography.fontWeights.semibold,
        marginTop: theme.vars.spacing.unit,
        maxWidth: '100%',
        textDecoration: 'none',
        // Keeps the text on one line, with its own spaces.
        whiteSpace: 'pre',
        '&:hover': {textDecoration: 'underline'},
      }),
      name: css({
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }),
    }),
    [theme, colorScheme],
  );

export default useStyles;
