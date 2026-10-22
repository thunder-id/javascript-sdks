// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, render, screen} from '@testing-library/react';
import {FlowMetaTheme} from '@thunderid/browser';
import {ReactElement} from 'react';
import {afterEach, describe, expect, it} from 'vitest';
import ThemeProvider from '../ThemeProvider';
import useTheme from '../useTheme';

function PrimaryColor(): ReactElement {
  const {theme} = useTheme();

  return <output>{theme.colors.primary.main}</output>;
}

const designTheme: FlowMetaTheme = {
  colorSchemes: {
    dark: {palette: {primary: {main: '#5eead4'}}},
    light: {palette: {primary: {main: '#0f766e'}}},
  },
} as FlowMetaTheme;

afterEach(() => {
  cleanup();
});

describe('ThemeProvider designTheme', () => {
  it('uses the given Design theme for the active color scheme', () => {
    render(
      <ThemeProvider mode="light" designTheme={designTheme}>
        <PrimaryColor />
      </ThemeProvider>,
    );

    expect(screen.getByRole('status').textContent).toBe('#0f766e');
  });

  it('follows the dark color scheme', () => {
    render(
      <ThemeProvider mode="dark" designTheme={designTheme}>
        <PrimaryColor />
      </ThemeProvider>,
    );

    expect(screen.getByRole('status').textContent).toBe('#5eead4');
  });

  it('still applies explicit overrides on top', () => {
    render(
      <ThemeProvider mode="light" designTheme={designTheme} theme={{colors: {primary: {main: '#111111'}}}}>
        <PrimaryColor />
      </ThemeProvider>,
    );

    expect(screen.getByRole('status').textContent).toBe('#111111');
  });
});
