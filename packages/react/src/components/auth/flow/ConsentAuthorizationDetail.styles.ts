// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Theme} from '@thunderid/browser';
import {useMemo} from 'react';
import {css} from '../../../styles/emotion';

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
      description: css({display: 'block', lineHeight: 1.4, overflowWrap: 'anywhere'}),
      label: css({lineHeight: 1.45, overflowWrap: 'anywhere'}),
      // The label and the type's description of the field, one above the other, beside the value.
      labelGroup: css({display: 'flex', flex: '1 1 auto', flexDirection: 'column', minWidth: 0}),
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
