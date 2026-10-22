// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Theme} from '@thunderid/browser';
import {useMemo} from 'react';
import {css} from '../../../../styles/emotion';

/**
 * Creates the styles shared by the admin components: the section frame and the create forms.
 *
 * @param theme - The theme object containing design tokens.
 * @param colorScheme - The current color scheme, used for memoization.
 * @returns The CSS class names for each part.
 */
const useStyles = (theme: Theme, colorScheme: string): Record<string, string> =>
  useMemo(() => {
    const unit: string = theme.vars.spacing.unit;

    return {
      actions: css`
        display: flex;
        flex-wrap: wrap;
        gap: ${unit};
      `,
      description: css`
        margin: calc(${unit} / 2) 0 0;
        color: ${theme.vars.colors.text.secondary};
        font-size: ${theme.vars.typography.fontSizes.sm};
      `,
      form: css`
        display: flex;
        flex-direction: column;
        gap: calc(${unit} * 2);
        max-width: 560px;
      `,
      formActions: css`
        display: flex;
        gap: ${unit};
        justify-content: flex-end;
      `,
      header: css`
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        justify-content: space-between;
        gap: calc(${unit} * 1.5);
      `,
      root: css`
        display: flex;
        flex-direction: column;
        gap: calc(${unit} * 2);
        font-family: ${theme.vars.typography.fontFamily};
        color: ${theme.vars.colors.text.primary};
      `,
      title: css`
        margin: 0;
        font-size: ${theme.vars.typography.fontSizes.xl};
        font-weight: ${theme.vars.typography.fontWeights.normal};
      `,
    };
  }, [theme, colorScheme]);

export default useStyles;
