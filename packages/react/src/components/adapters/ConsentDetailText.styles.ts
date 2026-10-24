// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Theme} from '@thunderid/browser';
import {useMemo} from 'react';
import {css} from '../../styles/emotion';

/**
 * Creates styles for the ConsentDetailToggle component.
 * @param theme - The theme object containing design tokens
 * @param colorScheme - The current color scheme (used for memoization)
 * @returns Object containing CSS class names for component styling
 */
export const useToggleStyles = (theme: Theme, colorScheme: string): Record<string, string> =>
  useMemo(
    () => ({
      toggle: css({
        background: 'transparent',
        border: 'none',
        borderRadius: '4px',
        color: theme.vars.colors.primary.main,
        cursor: 'pointer',
        font: 'inherit',
        fontSize: '0.8125rem',
        padding: '2px 4px',
        '&:hover': {textDecoration: 'underline'},
        '&:focus-visible': {outline: `2px solid ${theme.vars.colors.primary.main}`, outlineOffset: '1px'},
      }),
    }),
    [theme, colorScheme],
  );

/**
 * Creates styles for the ConsentDetailText component.
 * @param theme - The theme object containing design tokens
 * @param colorScheme - The current color scheme (used for memoization)
 * @param align - Alignment of the text
 * @param monospace - Whether the text is shown as a preformatted monospace block
 * @param maxLines - Number of lines the text is clamped to
 * @returns Object containing CSS class names for component styling
 */
const useStyles = (
  theme: Theme,
  colorScheme: string,
  align: 'left' | 'right',
  monospace: boolean,
  maxLines: number,
): Record<string, string> =>
  useMemo(
    () => ({
      clamp: css({
        display: '-webkit-box',
        overflow: 'hidden',
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: maxLines,
      }),
      container: css({
        alignItems: align === 'right' ? 'flex-end' : 'flex-start',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        maxWidth: '100%',
        minWidth: 0,
      }),
      monospace: css({
        background: theme.vars.colors.action.hover,
        border: `1px solid ${theme.vars.colors.border}`,
        borderRadius: '4px',
        boxSizing: 'border-box',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: '0.75rem',
        padding: '6px 8px',
        width: '100%',
      }),
      text: css({
        lineHeight: 1.45,
        margin: 0,
        maxWidth: '100%',
        overflowWrap: 'anywhere',
        textAlign: align,
        whiteSpace: monospace ? 'pre-wrap' : 'normal',
        wordBreak: 'normal',
      }),
    }),
    [theme, colorScheme, align, monospace, maxLines],
  );

export default useStyles;
