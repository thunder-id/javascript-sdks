// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Theme} from '@thunderid/browser';
import {useMemo} from 'react';
import {css} from '../../../styles/emotion';

const useStyles = (theme: Theme): Record<string, string> =>
  useMemo(
    () => ({
      container: css`
        display: flex;
        flex-direction: column;
        gap: calc(${theme.vars.spacing.unit} * 0.5);
        width: 100%;
      `,
      label: css`
        color: ${theme.vars.colors.text.secondary};
        font-size: 0.875rem;
        font-weight: 500;
      `,
      // Two columns rather than a row each, so every value starts at the same edge however long the labels
      // beside them are.
      list: css`
        background-color: ${theme.vars.colors.background.surface};
        border: 1px solid ${theme.vars.colors.border};
        border-radius: ${theme.vars.borderRadius.small};
        column-gap: calc(${theme.vars.spacing.unit} * 3);
        display: grid;
        grid-template-columns: minmax(0, max-content) minmax(0, 1fr);
        margin: 0;
        padding: calc(${theme.vars.spacing.unit} * 2);
        row-gap: calc(${theme.vars.spacing.unit} * 1.5);
      `,
      pairLabel: css`
        color: ${theme.vars.colors.text.secondary};
        font-size: 0.875rem;
      `,
      pairValue: css`
        color: ${theme.vars.colors.text.primary};
        font-size: 0.875rem;
        font-weight: 500;
        margin: 0;
        overflow-wrap: anywhere;
      `,
    }),
    [theme],
  );

export default useStyles;
