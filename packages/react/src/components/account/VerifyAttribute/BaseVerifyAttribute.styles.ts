// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Theme} from '@thunderid/browser';
import {css} from '../../../styles/emotion';

/**
 * Creates styles for the BaseVerifyAttribute component
 * @param theme - The theme object containing design tokens
 * @param colorScheme - The current color scheme (used for memoization)
 * @returns Object containing CSS class names for component styling
 */
const useStyles = (theme: Theme, colorScheme: string): Record<string, string> => {
  const root: string = css`
    display: flex;
    flex-direction: column;
    gap: calc(${theme.vars.spacing.unit} * 2);
    width: 100%;
    font-family: ${theme.vars.typography.fontFamily};
  `;

  const card: string = css`
    padding: calc(${theme.vars.spacing.unit} * 2);
    border: 1px solid ${theme.vars.colors.border};
    border-radius: ${theme.vars.borderRadius.medium};
  `;

  const header: string = css`
    display: flex;
    flex-direction: column;
    gap: calc(${theme.vars.spacing.unit} / 2);
  `;

  const heading: string = css`
    margin: 0;
  `;

  const subheading: string = css`
    margin: 0;
    color: ${theme.vars.colors.text.secondary};
  `;

  const content: string = css`
    display: flex;
    flex-direction: column;
    gap: calc(${theme.vars.spacing.unit} * 1.5);
  `;

  const alert: string = css`
    width: 100%;
  `;

  const loading: string = css`
    display: flex;
    justify-content: center;
    padding: calc(${theme.vars.spacing.unit} * 2);
  `;

  const actions: string = css`
    display: flex;
    gap: ${theme.vars.spacing.unit};
    align-items: center;
    justify-content: flex-end;
  `;

  return {
    actions,
    alert,
    card,
    colorScheme,
    content,
    header,
    heading,
    loading,
    root,
    subheading,
  };
};

export default useStyles;
