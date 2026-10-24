// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Theme} from '@thunderid/browser';
import {useMemo} from 'react';
import {css} from '../../styles/emotion';

/**
 * Creates styles for the ConsentAuthorizationDetail component.
 * @param theme - The theme object containing design tokens
 * @param colorScheme - The current color scheme (used for memoization)
 * @returns Object containing CSS class names for component styling
 */
const useStyles = (theme: Theme, colorScheme: string): Record<string, string> =>
  useMemo(
    () => ({
      card: css({marginTop: '0.5rem'}),
      label: css({flex: '1 1 auto', lineHeight: 1.45, minWidth: 0, overflowWrap: 'anywhere'}),
      // A short field sits beside its label and drops below it when the two do not fit; a long one is
      // stacked, the label above the value, so neither squeezes the other.
      row: css({
        alignItems: 'center',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px 1rem',
        justifyContent: 'space-between',
      }),
      rows: css({display: 'flex', flexDirection: 'column', gap: '8px', margin: '0.5rem 0'}),
      stackedRow: css({display: 'flex', flexDirection: 'column', gap: '4px'}),
      stackedValue: css({display: 'flex', maxWidth: '100%', minWidth: 0}),
      value: css({
        alignItems: 'center',
        display: 'flex',
        gap: '6px',
        justifyContent: 'flex-end',
        marginLeft: 'auto',
        maxWidth: '100%',
        minWidth: 0,
        textAlign: 'right',
      }),
    }),
    [theme, colorScheme],
  );

export default useStyles;
