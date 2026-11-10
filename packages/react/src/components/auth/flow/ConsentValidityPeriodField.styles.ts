// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Theme} from '@thunderid/browser';
import {useMemo} from 'react';
import {css} from '../../../styles/emotion';

/**
 * Creates the styles of the consent validity period field.
 * @param theme - The theme object containing design tokens
 * @returns Object containing CSS class names for component styling
 */
const useStyles = (theme: Theme): Record<string, string> =>
  useMemo(
    () => ({
      container: css`
        display: flex;
        flex-direction: column;
        gap: calc(${theme.vars.spacing.unit} * 2);
        margin-top: ${theme.vars.spacing.unit};
      `,
      customRow: css`
        display: flex;
        align-items: flex-start;
        gap: calc(${theme.vars.spacing.unit} * 1.5);

        & > :first-of-type {
          flex: 1;
          min-width: 0;
        }
      `,
    }),
    [theme],
  );

export default useStyles;
