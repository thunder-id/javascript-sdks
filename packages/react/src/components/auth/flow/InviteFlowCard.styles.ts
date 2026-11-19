// Copyright 2025-2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Theme} from '@thunderid/browser';
import {useMemo} from 'react';
import {css} from '../../../styles/emotion';

/**
 * Creates styles for the invite components' default card
 * @param theme - The theme object containing design tokens
 * @param colorScheme - The current color scheme (used for memoization)
 * @returns Object containing CSS class names for component styling
 */
const useStyles = (theme: Theme, colorScheme: string): Record<string, string> =>
  useMemo(() => {
    const card: string = css`
      background: ${theme.vars.colors.background.surface};
      border-radius: ${theme.vars.borderRadius.large};
      gap: calc(${theme.vars.spacing.unit} * 2);
      min-width: 420px;
      font-family: ${theme.vars.typography.fontFamily};
    `;

    const header: string = css`
      gap: 0;
      align-items: center;
    `;

    const title: string = css`
      margin: 0 0 calc(${theme.vars.spacing.unit} * 1) 0;
      color: ${theme.vars.colors.text.primary};
    `;

    const subtitle: string = css`
      margin-bottom: calc(${theme.vars.spacing.unit} * 1);
      color: ${theme.vars.colors.text.secondary};
    `;

    const centeredSpinnerContainer: string = css`
      display: flex;
      justify-content: center;
      padding: 2rem;
    `;

    const centeredSpinnerContainerSmall: string = css`
      display: flex;
      justify-content: center;
      padding: 1rem;
    `;

    const errorContainer: string = css`
      margin-bottom: 1rem;
    `;

    return {
      card,
      centeredSpinnerContainer,
      centeredSpinnerContainerSmall,
      errorContainer,
      header,
      subtitle,
      title,
    };
  }, [
    theme.vars.colors.background.surface,
    theme.vars.colors.text.primary,
    theme.vars.colors.text.secondary,
    theme.vars.borderRadius.large,
    theme.vars.spacing.unit,
    theme.vars.typography.fontFamily,
    colorScheme,
  ]);

export default useStyles;
