// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Theme} from '@thunderid/browser';
import {useMemo} from 'react';
import {css} from '../../../styles/emotion';

const useStyles = (theme: Theme, colorScheme: string, disabled: boolean, hasError: boolean): Record<string, string> =>
  useMemo(() => {
    const root: string = css`
      position: relative;
      width: 100%;
    `;

    const trigger: string = css`
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: ${theme.vars.spacing.unit};
      width: 100%;
      padding: ${theme.vars.spacing.unit} calc(${theme.vars.spacing.unit} * 1.5);
      border: 1px solid ${hasError ? theme.vars.colors.error.main : theme.vars.colors.border};
      border-radius: ${theme.vars.components?.Field?.root?.borderRadius ?? theme.vars.borderRadius.medium};
      font-size: ${theme.vars.typography.fontSizes.md};
      font-family: ${theme.vars.typography.fontFamily};
      color: ${theme.vars.colors.text.primary};
      background-color: ${disabled ? theme.vars.colors.background.disabled : theme.vars.colors.background.surface};
      cursor: ${disabled ? 'not-allowed' : 'pointer'};
      text-align: left;

      &:focus-visible {
        border-color: ${hasError ? theme.vars.colors.error.main : theme.vars.colors.primary.main};
        box-shadow: 0 0 0 2px ${hasError ? `${theme.vars.colors.error.main}20` : `${theme.vars.colors.primary.main}20`};
        outline: none;
      }
    `;

    const triggerError: string = css`
      border-color: ${theme.vars.colors.error.main};
    `;

    const triggerDisabled: string = css`
      opacity: 0.6;
      cursor: not-allowed;
    `;

    const triggerLabel: string = css`
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: ${theme.vars.colors.text.primary};
    `;

    const content: string = css`
      display: flex;
      flex-direction: column;
      max-height: 240px;
      overflow-y: auto;
      min-width: 200px;
      background-color: ${theme.vars.colors.background.surface};
      border: 1px solid ${theme.vars.colors.border};
      border-radius: ${theme.vars.borderRadius.medium};
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
      z-index: 1000;
    `;

    const option: string = css`
      display: flex;
      align-items: center;
      gap: calc(${theme.vars.spacing.unit} / 2);
      padding: calc(${theme.vars.spacing.unit} / 2) ${theme.vars.spacing.unit};
      border: none;
      background: none;
      color: ${theme.vars.colors.text.primary};
      font-size: ${theme.vars.typography.fontSizes.md};
      font-family: ${theme.vars.typography.fontFamily};
      text-align: left;
      cursor: pointer;

      &:hover:not(:disabled) {
        background-color: ${theme.vars.colors.action.hover};
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `;

    const optionActive: string = css`
      background-color: ${theme.vars.colors.primary.main}10;
      font-weight: 600;
    `;

    const optionLabel: string = css`
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    `;

    const statusRow: string = css`
      display: flex;
      align-items: center;
      gap: calc(${theme.vars.spacing.unit} / 2);
      padding: ${theme.vars.spacing.unit};
      color: ${theme.vars.colors.text.secondary};
      font-size: ${theme.vars.typography.fontSizes.sm};
    `;

    const retryButton: string = css`
      border: none;
      background: none;
      color: ${theme.vars.colors.primary.main};
      cursor: pointer;
      font-weight: 600;
      padding: 0;
    `;

    const loadMore: string = css`
      border: none;
      border-top: 1px solid ${theme.vars.colors.border};
      background: none;
      color: ${theme.vars.colors.primary.main};
      cursor: pointer;
      font-weight: 600;
      padding: ${theme.vars.spacing.unit};
      text-align: center;
    `;

    const visuallyHidden: string = css`
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;

    return {
      content,
      loadMore,
      option,
      optionActive,
      optionLabel,
      retryButton,
      root,
      statusRow,
      trigger,
      triggerDisabled,
      triggerError,
      triggerLabel,
      visuallyHidden,
    };
  }, [theme, colorScheme, disabled, hasError]);

export default useStyles;
