// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Theme} from '@thunderid/browser';
import {css} from '../../../styles/emotion';

/**
 * Creates styles for the BaseChangePassword component
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

  const card: string = css`
    padding: calc(${theme.vars.spacing.unit} * 3);
    border: 1px solid ${theme.vars.colors.border};
    border-radius: ${theme.vars.borderRadius.large};
  `;

  const heading: string = css`
    margin: 0;
  `;

  const fields: string = css`
    display: flex;
    flex-direction: column;
    gap: calc(${theme.vars.spacing.unit} * 2);
  `;

  const requirements: string = css`
    display: flex;
    flex-direction: column;
    gap: calc(${theme.vars.spacing.unit} / 2);
    margin: 0;
    padding: 0;
    list-style: none;
  `;

  const requirementsHeading: string = css`
    margin: 0 0 calc(${theme.vars.spacing.unit} / 2) 0;
    opacity: 0.8;
  `;

  const requirement: string = css`
    display: flex;
    align-items: center;
    gap: ${theme.vars.spacing.unit};
  `;

  const requirementPassed: string = css`
    color: ${theme.vars.colors.success.main};
  `;

  const requirementPending: string = css`
    opacity: 0.7;
  `;

  const requirementIcon: string = css`
    flex-shrink: 0;
    width: 14px;
    height: 14px;
  `;

  const alert: string = css`
    width: 100%;
  `;

  const actions: string = css`
    display: flex;
    gap: ${theme.vars.spacing.unit};
    align-items: center;
  `;

  const unavailableRoot: string = css`
    position: relative;
    display: flex;
    width: 100%;
  `;

  const unavailableContent: string = css`
    width: 100%;
    filter: blur(3px);
    opacity: 0.55;
    pointer-events: none;
    user-select: none;
  `;

  const unavailableOverlay: string = css`
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: calc(${theme.vars.spacing.unit} * 2);
  `;

  return {
    actions,
    alert,
    card,
    colorScheme,
    fields,
    heading,
    requirement,
    requirementIcon,
    requirementPassed,
    requirementPending,
    requirements,
    requirementsHeading,
    root,
    unavailableContent,
    unavailableOverlay,
    unavailableRoot,
  };
};

export default useStyles;
