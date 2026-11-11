// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, fireEvent, render, screen, within} from '@testing-library/react';
import type {ReactElement} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import I18nProvider from '../../../../contexts/I18n/I18nProvider';
import ThemeProvider from '../../../../contexts/Theme/ThemeProvider';
import FlowExpired from '../FlowExpired';

const withProviders = (ui: ReactElement): ReactElement => (
  <I18nProvider>
    <ThemeProvider>{ui}</ThemeProvider>
  </I18nProvider>
);

describe('FlowExpired', () => {
  afterEach(() => {
    cleanup();
  });

  it('offers to start again and focuses the expired state', () => {
    const onRestart = vi.fn();
    render(withProviders(<FlowExpired onRestart={onRestart} />));

    expect(screen.getByRole('heading', {name: 'Session expired'})).toBeInTheDocument();
    expect(screen.getByText('Please start again.')).toBeInTheDocument();
    expect(screen.getByTestId('thunderid-flow-expired')).toHaveFocus();

    fireEvent.click(screen.getByRole('button', {name: 'Start again'}));

    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('counts down to the application and links back to it', () => {
    const redirect = {
      countdownSeconds: 10,
      isCountingDown: true,
      isRedirectFailed: false,
      secondsLeft: 7,
      url: 'https://app.example.com',
    };
    render(withProviders(<FlowExpired redirect={redirect} onRestart={vi.fn()} />));

    expect(screen.getByText('Taking you back to the application in 7s.')).toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'Back to the application now'})).toHaveAttribute(
      'href',
      'https://app.example.com',
    );
    expect(screen.queryByRole('button', {name: 'Start again'})).not.toBeInTheDocument();
  });

  it('shortens only the application name in the link', () => {
    const redirect = {
      countdownSeconds: 10,
      isCountingDown: true,
      isRedirectFailed: false,
      secondsLeft: 7,
      url: 'https://app.example.com',
    };
    render(withProviders(<FlowExpired redirect={redirect} />));

    const link: HTMLElement = screen.getByRole('link', {name: 'Back to the application now'});
    const name: HTMLElement = within(link).getByText('the application');
    expect(getComputedStyle(name).textOverflow).toBe('ellipsis');
    expect(getComputedStyle(name).whiteSpace).toBe('nowrap');
    expect(link.textContent).toBe('Back to the application now');
  });

  it('does not show the countdown before it starts', () => {
    const redirect = {
      countdownSeconds: 10,
      isCountingDown: false,
      isRedirectFailed: false,
      secondsLeft: 10,
      url: 'https://app.example.com',
    };
    render(withProviders(<FlowExpired redirect={redirect} />));

    expect(screen.getByText('Please go back to the application and try again.')).toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'Back to the application'})).toBeInTheDocument();
  });

  it('offers the link back once the redirect did not happen', () => {
    const redirect = {
      countdownSeconds: 10,
      isCountingDown: false,
      isRedirectFailed: true,
      secondsLeft: 0,
      url: 'https://app.example.com',
    };
    render(withProviders(<FlowExpired redirect={redirect} />));

    expect(screen.getByText('Please go back to the application and try again.')).toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'Back to the application'})).toBeInTheDocument();
  });

  it('tells the user to go back to the application when it cannot start again', () => {
    render(withProviders(<FlowExpired />));

    expect(screen.getByText('Please go back to the application and try again.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
