// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {Theme} from '@thunderid/browser';
import {useMemo} from 'react';
import {css} from '../../../styles/emotion';

const useStyles = (theme: Theme): Record<string, string> =>
  useMemo(
    () => ({
      fieldset: css`
        border: none;
        margin: 0;
        min-width: 0;
        padding: 0;
      `,
      legend: css`
        padding: 0;
      `,
      options: css`
        display: flex;
        flex-direction: column;
        gap: calc(${theme.vars.spacing.unit} * 0.5);
      `,
    }),
    [theme],
  );

export default useStyles;
