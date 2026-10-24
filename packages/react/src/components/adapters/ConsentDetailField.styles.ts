// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Theme} from '@thunderid/browser';
import {useMemo} from 'react';
import {css} from '../../styles/emotion';

/**
 * Creates styles for the ConsentDetailField component.
 * @param theme - The theme object containing design tokens
 * @param colorScheme - The current color scheme (used for memoization)
 * @param align - Side the value is aligned to: `end` beside its label, `start` when stacked below it
 * @returns Object containing CSS class names for component styling
 */
const useStyles = (theme: Theme, colorScheme: string, align: 'start' | 'end'): Record<string, string> =>
  useMemo(() => {
    const chip: string = css({
      alignItems: 'center',
      borderRadius: '9999px',
      boxSizing: 'border-box',
      cursor: 'pointer',
      display: 'inline-flex',
      font: 'inherit',
      fontSize: '0.8125rem',
      gap: '6px',
      maxWidth: '100%',
      minWidth: 0,
      padding: '2px 10px',
      '&:disabled': {cursor: 'default'},
    });

    return {
      // A chip keeps to one line; a long item is cut short with an ellipsis and shown in full on hover.
      chipLabel: css({minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}),
      chips: css({
        alignItems: 'center',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px',
        justifyContent: align === 'end' ? 'flex-end' : 'flex-start',
        maxWidth: '100%',
        minWidth: 0,
        // Stacked below its label, the list takes the row's width and wraps within it; a chip's one-line
        // label must not widen the screen it sits in.
        ...(align === 'start' && {contain: 'inline-size', width: '100%'}),
      }),
      input: css({maxWidth: '10rem'}),
      keptChip: css(chip, {
        background: 'transparent',
        border: `1px solid ${theme.vars.colors.primary.main}`,
        color: theme.vars.colors.primary.main,
      }),
      listText: css({
        alignItems: 'baseline',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '2px 6px',
        justifyContent: align === 'end' ? 'flex-end' : 'flex-start',
        maxWidth: '100%',
        minWidth: 0,
      }),
      offeredChip: css(chip, {
        background: 'transparent',
        border: `1px dashed ${theme.vars.colors.border}`,
        color: theme.vars.colors.text.secondary,
      }),
      removedChip: css(chip, {
        background: 'transparent',
        border: `1px solid ${theme.vars.colors.border}`,
        color: theme.vars.colors.text.secondary,
        textDecoration: 'line-through',
      }),
    };
  }, [theme, colorScheme, align]);

export default useStyles;
