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
  const hover: string = theme.vars.colors.action?.hover || 'rgba(0, 0, 0, 0.04)';

  const root: string = css`
    display: inline-flex;
    flex-direction: column;
    gap: calc(${theme.vars.spacing.unit} * 0.5);
    min-width: 240px;
    max-width: 100%;
    font-family: ${theme.vars.typography.fontFamily};
  `;

  const field: string = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: calc(${theme.vars.spacing.unit} * 1.5);
    width: 100%;
    box-sizing: border-box;
    padding: calc(${theme.vars.spacing.unit} * 0.75) calc(${theme.vars.spacing.unit} * 1.5);
    border: 1px solid ${theme.vars.colors.border};
    border-radius: ${theme.vars.borderRadius.medium};
    background: ${theme.vars.colors.background.surface};
    color: ${theme.vars.colors.text.primary};
    font: inherit;
    text-align: start;
    cursor: pointer;

    &:hover:not(:disabled) {
      background-color: ${hover};
    }

    &:focus-visible {
      outline: 2px solid ${theme.vars.colors.primary.main};
      outline-offset: 1px;
    }

    &:disabled {
      cursor: default;
      opacity: 0.7;
    }
  `;

  const fieldText: string = css`
    display: flex;
    flex-direction: column;
    min-width: 0;
  `;

  const label: string = css`
    display: block;
    font-size: 0.75rem;
    line-height: 1rem;
    color: ${theme.vars.colors.text.secondary};
  `;

  const value: string = css`
    display: block;
    overflow: hidden;
    font-size: 1rem;
    line-height: 1.375rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  `;

  const chevron: string = css`
    display: flex;
    flex-shrink: 0;
    color: ${theme.vars.colors.text.secondary};
    transition: transform 0.12s ease-in-out;
  `;

  const chevronOpen: string = css`
    transform: rotate(180deg);
  `;

  const error: string = css`
    font-size: 0.75rem;
    color: ${theme.vars.colors.error.main};
  `;

  const menu: string = css`
    box-sizing: border-box;
    max-height: 320px;
    overflow-y: auto;
    padding: calc(${theme.vars.spacing.unit} * 0.5);
    border: 1px solid ${theme.vars.colors.border};
    border-radius: ${theme.vars.borderRadius.medium};
    background-color: ${theme.vars.colors.background.surface};
    box-shadow: ${theme.vars.shadows.medium};
    font-family: ${theme.vars.typography.fontFamily};
    outline: none;
    z-index: 1000;
  `;

  const list: string = css`
    display: flex;
    flex-direction: column;
  `;

  const option: string = css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${theme.vars.spacing.unit};
    width: 100%;
    padding: ${theme.vars.spacing.unit} calc(${theme.vars.spacing.unit} * 1.25);
    border: none;
    border-radius: ${theme.vars.borderRadius.small};
    background-color: transparent;
    color: ${theme.vars.colors.text.primary};
    font: inherit;
    text-align: start;
    cursor: pointer;
    outline: none;

    &:hover,
    &:focus-visible {
      background-color: ${hover};
    }
  `;

  const optionCurrent: string = css`
    font-weight: 600;
  `;

  const optionText: string = css`
    display: flex;
    flex-direction: column;
    min-width: 0;
  `;

  const optionName: string = css`
    font-size: 0.875rem;
  `;

  const optionHandle: string = css`
    font-size: 0.75rem;
    font-weight: 400;
    color: ${theme.vars.colors.text.secondary};
  `;

  const check: string = css`
    display: flex;
    flex-shrink: 0;
    color: ${theme.vars.colors.primary.main};
  `;

  const status: string = css`
    display: flex;
    align-items: center;
    gap: ${theme.vars.spacing.unit};
    margin: 0;
    padding: ${theme.vars.spacing.unit} calc(${theme.vars.spacing.unit} * 1.25);
    font-size: 0.875rem;
    color: ${theme.vars.colors.text.secondary};
  `;

  const pagination: string = css`
    display: flex;
    justify-content: flex-end;
    gap: ${theme.vars.spacing.unit};
    margin-top: calc(${theme.vars.spacing.unit} * 0.5);
    padding-top: calc(${theme.vars.spacing.unit} * 0.5);
    border-top: 1px solid ${theme.vars.colors.border};
  `;

  return {
    check,
    chevron,
    chevronOpen,
    colorScheme,
    error,
    field,
    fieldText,
    label,
    list,
    menu,
    option,
    optionCurrent,
    optionHandle,
    optionName,
    optionText,
    pagination,
    root,
    status,
    value,
  };
};

export default useStyles;
