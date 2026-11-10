// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access -- the lint project does not resolve the vitest/browser types */

import {cleanup, render, screen} from '@testing-library/react';
import {ReactElement} from 'react';
import {afterEach, describe, expect, it} from 'vitest';
import {userEvent} from 'vitest/browser';
import ThemeProvider from '../../../../contexts/Theme/ThemeProvider';
import Checkbox from '../Checkbox';

const withProviders = (ui: ReactElement): ReactElement => <ThemeProvider>{ui}</ThemeProvider>;

const outlineOf = (element: HTMLElement): string => getComputedStyle(element).outlineStyle;

describe('Checkbox focus outline', () => {
  afterEach(cleanup);

  it('draws no outline after a mouse click, so the box does not stay outlined', async () => {
    render(withProviders(<Checkbox label="Remember" />));
    const box: HTMLElement = screen.getByRole('checkbox');

    await userEvent.click(box);

    expect(box).toHaveFocus();
    expect(outlineOf(box)).not.toBe('solid');
  });

  it('draws an outline when the keyboard moves focus to it', async () => {
    render(withProviders(<Checkbox label="Remember" />));
    const box: HTMLElement = screen.getByRole('checkbox');

    await userEvent.tab();

    expect(box).toHaveFocus();
    expect(outlineOf(box)).toBe('solid');
  });
});
