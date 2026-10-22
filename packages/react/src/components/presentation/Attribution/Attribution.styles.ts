// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Theme} from '@thunderid/browser';
import {useMemo} from 'react';
import {css} from '../../../styles/emotion';

/**
 * Creates the styles for the Attribution component.
 *
 * @param theme - The theme object containing design tokens.
 * @param colorScheme - The current color scheme, used for memoization.
 * @returns The CSS class names for each part of the attribution.
 */
const useStyles = (theme: Theme, colorScheme: string): Record<string, string> =>
  useMemo(
    () => ({
      label: css`
        white-space: nowrap;
      `,
      root: css`
        display: inline-flex;
        align-items: center;
        gap: calc(${theme.vars.spacing.unit} * 0.75);
        font-family: ${theme.vars.typography.fontFamily};
        font-size: ${theme.vars.typography.fontSizes.xs};
        color: ${theme.vars.colors.text.secondary};
        text-decoration: none;
        line-height: 1;
      `,
      link: css`
        &:hover,
        &:focus-visible {
          color: ${theme.vars.colors.text.primary};
        }
      `,
      // The ribbon: a slim tab that hangs off the right edge of a card. The card must be
      // `position: relative`.
      ribbon: css`
        position: absolute;
        top: 36px;
        right: -1px;
        transform: translateX(100%);
        width: 34px;
        height: 128px;
        overflow: hidden;
        background: #12172a;
        border: 1px solid ${theme.vars.colors.border};
        border-left: none;
        border-radius: 0 10px 10px 0;
        box-shadow: ${theme.vars.shadows.medium};
        text-decoration: none;
      `,
      ribbonContent: css`
        position: absolute;
        top: 50%;
        left: 50%;
        width: 112px;
        height: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        white-space: nowrap;
        transform: translate(-50%, -50%) rotate(90deg);
        font-family: ${theme.vars.typography.fontFamily};
      `,
      ribbonLabel: css`
        font-size: 9px;
        font-weight: 500;
        letter-spacing: 0.04em;
        color: #8bf9fa;
        opacity: 0.65;
      `,
      ribbonWordmark: css`
        height: 11px;
        width: auto;
        display: block;
        color: #ffffff;
        opacity: 0.95;
      `,
      wordmark: css`
        height: 1.15em;
        width: auto;
        display: block;
        color: ${theme.vars.colors.text.primary};
      `,
    }),
    [theme, colorScheme],
  );

export default useStyles;
