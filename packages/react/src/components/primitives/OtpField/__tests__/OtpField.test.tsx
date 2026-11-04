// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {render, screen, cleanup, fireEvent} from '@testing-library/react';
import {createTheme} from '@thunderid/browser';
import {ReactElement} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import ThemeContext, {ThemeContextValue} from '../../../../contexts/Theme/ThemeContext';
import OtpField from '../OtpField';

const themeContextValue: ThemeContextValue = {
  colorScheme: 'light',
  direction: 'ltr',
  theme: createTheme(),
  toggleTheme: vi.fn(),
};

const withTheme = (ui: ReactElement): ReactElement => (
  <ThemeContext.Provider value={themeContextValue}>{ui}</ThemeContext.Provider>
);

const boxes = (): HTMLInputElement[] => screen.getAllByRole('textbox');

const paste = (target: HTMLElement, text: string): void => {
  const event: Event = new Event('paste', {bubbles: true, cancelable: true});
  Object.defineProperty(event, 'clipboardData', {value: {getData: () => text}});
  fireEvent(target, event);
};

describe('OtpField', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders six boxes by default', () => {
    render(withTheme(<OtpField />));
    expect(boxes()).toHaveLength(6);
  });

  it('renders the requested number of boxes', () => {
    render(withTheme(<OtpField length={8} />));
    expect(boxes()).toHaveLength(8);
  });

  it('shows a visual separator without including it in the field value', () => {
    const onChange = vi.fn();
    const {container} = render(withTheme(<OtpField length={8} separatorAfter={4} uppercase onChange={onChange} />));

    expect(container.querySelector('[aria-hidden="true"]')).toHaveTextContent('-');
    paste(boxes()[0], 'abcd-efgh');

    expect(onChange).toHaveBeenCalledWith({target: {value: 'ABCDEFGH'}});
  });

  it('rejects a letter when the field is numeric', () => {
    const onChange = vi.fn();
    render(withTheme(<OtpField type="number" onChange={onChange} />));

    fireEvent.change(boxes()[0], {target: {value: 'a'}});

    expect(onChange).not.toHaveBeenCalled();
  });

  it('accepts a digit when the field is numeric', () => {
    const onChange = vi.fn();
    render(withTheme(<OtpField type="number" onChange={onChange} />));

    fireEvent.change(boxes()[0], {target: {value: '7'}});

    expect(onChange).toHaveBeenCalledWith({target: {value: '7'}});
  });

  it('marks a numeric field with the numeric input mode', () => {
    render(withTheme(<OtpField type="number" />));
    expect(boxes()[0]).toHaveAttribute('inputmode', 'numeric');
  });

  it('accepts a letter when the field is alphanumeric', () => {
    const onChange = vi.fn();
    render(withTheme(<OtpField onChange={onChange} />));

    fireEvent.change(boxes()[0], {target: {value: 'K'}});

    expect(onChange).toHaveBeenCalledWith({target: {value: 'K'}});
  });

  it('upper-cases entered characters when asked to', () => {
    const onChange = vi.fn();
    render(withTheme(<OtpField uppercase onChange={onChange} />));

    fireEvent.change(boxes()[0], {target: {value: 'k'}});

    expect(onChange).toHaveBeenCalledWith({target: {value: 'K'}});
  });

  it('upper-cases a pasted code when asked to', () => {
    const onChange = vi.fn();
    render(withTheme(<OtpField uppercase onChange={onChange} />));

    paste(boxes()[0], 'k7gx2m');

    expect(onChange).toHaveBeenCalledWith({target: {value: 'K7GX2M'}});
  });

  it('keeps a pasted code intact when surrounded by other text', () => {
    const onChange = vi.fn();
    render(withTheme(<OtpField type="number" onChange={onChange} />));

    paste(boxes()[0], 'Your code is 123456');

    expect(onChange).toHaveBeenCalledWith({target: {value: '123456'}});
  });

  it('calls onComplete once every box is filled', () => {
    const onComplete = vi.fn();
    render(withTheme(<OtpField type="number" onComplete={onComplete} />));

    paste(boxes()[0], '123456');

    expect(onComplete).toHaveBeenCalledWith('123456');
  });
});
