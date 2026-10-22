// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, render, screen} from '@testing-library/react';
import {ReactElement, ReactNode} from 'react';
import {afterEach, describe, expect, it} from 'vitest';
import I18nProvider from '../../../../contexts/I18n/I18nProvider';
import ThemeProvider from '../../../../contexts/Theme/ThemeProvider';
import Attribution from '../Attribution';

const renderWithProviders = (ui: ReactElement): ReturnType<typeof render> => {
  function Providers({children}: {children: ReactNode}): ReactElement {
    return (
      <I18nProvider>
        <ThemeProvider>{children}</ThemeProvider>
      </I18nProvider>
    );
  }

  return render(ui, {wrapper: Providers});
};

afterEach(() => {
  cleanup();
});

describe('Attribution', () => {
  it('credits ThunderID with a translated label and an accessible wordmark', () => {
    renderWithProviders(<Attribution />);

    expect(screen.getByText('Secured by')).toBeTruthy();
    expect(screen.getByRole('img', {name: 'ThunderID'})).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('says "Powered by" for the powered variant', () => {
    renderWithProviders(<Attribution variant="powered" />);

    expect(screen.getByText('Powered by')).toBeTruthy();
  });

  it('opens a link in a new tab when given one', () => {
    renderWithProviders(<Attribution href="https://example.com/security" />);

    const link: HTMLElement = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('https://example.com/security');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('hangs a ribbon off the edge of a card', () => {
    const {container} = renderWithProviders(<Attribution appearance="ribbon" variant="powered" />);

    expect(screen.getByText('Powered by')).toBeTruthy();
    expect(container.querySelector('[class*="attribution--ribbon"]')).toBeTruthy();
  });
});
