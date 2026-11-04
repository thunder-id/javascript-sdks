// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Theme} from '@thunderid/browser';
import {css} from '../../../styles/emotion';

/**
 * Creates styles for the BaseOrganizationUnitSwitcher component.
 *
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
  `;

  const heading: string = css`
    margin: 0;
  `;

  const list: string = css`
    display: flex;
    flex-direction: column;
    gap: ${theme.vars.spacing.unit};
    margin: 0;
    padding: 0;
    list-style: none;
  `;

  const item: string = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: calc(${theme.vars.spacing.unit} * 2);
    padding: calc(${theme.vars.spacing.unit} * 1.5) calc(${theme.vars.spacing.unit} * 2);
    border: 1px solid ${theme.vars.colors.border};
    border-radius: ${theme.vars.borderRadius.medium};
  `;

  const itemCurrent: string = css`
    border-color: ${theme.vars.colors.primary.main};
  `;

  const itemText: string = css`
    display: flex;
    flex-direction: column;
    min-width: 0;
  `;

  const handle: string = css`
    opacity: 0.7;
  `;

  const badge: string = css`
    padding: calc(${theme.vars.spacing.unit} / 4) ${theme.vars.spacing.unit};
    border-radius: ${theme.vars.borderRadius.small};
    color: ${theme.vars.colors.primary.main};
    font-size: 0.75rem;
    font-weight: 600;
  `;

  const pagination: string = css`
    display: flex;
    gap: ${theme.vars.spacing.unit};
    align-items: center;
    justify-content: flex-end;
  `;

  return {badge, colorScheme, handle, heading, item, itemCurrent, itemText, list, pagination, root};
};

export default useStyles;
