// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {EmbeddedFlowComponent} from '@thunderid/browser';
import {ReactElement, useEffect} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import ComponentRendererContext, {
  ComponentRendererMap,
} from '../../../../contexts/ComponentRenderer/ComponentRendererContext';
import I18nProvider from '../../../../contexts/I18n/I18nProvider';
import ThemeProvider from '../../../../contexts/Theme/ThemeProvider';
import ThunderIDContext, {ThunderIDContextProps} from '../../../../contexts/ThunderID/ThunderIDContext';
import BaseSignIn from '../BaseSignIn';

const thunderIDContext: ThunderIDContextProps = {
  isInitialized: true,
  isLoading: false,
  vendor: 'thunderid',
} as unknown as ThunderIDContextProps;

describe('BaseSignIn', () => {
  afterEach(() => {
    cleanup();
  });

  it('exposes the step additionalData to render props', () => {
    const renderChild = vi.fn(() => <div />);

    render(
      <ThunderIDContext.Provider value={thunderIDContext}>
        <I18nProvider>
          <ThemeProvider>
            <BaseSignIn additionalData={{linkingPromptDetails: '[]'}} components={[]} onSubmit={vi.fn()}>
              {renderChild}
            </BaseSignIn>
          </ThemeProvider>
        </I18nProvider>
      </ThunderIDContext.Provider>,
    );

    expect(renderChild).toHaveBeenLastCalledWith(
      expect.objectContaining({additionalData: {linkingPromptDetails: '[]'}}),
    );
  });

  it('applies supplied initial values to the form render props', async () => {
    let renderedValues: Record<string, string> = {};

    render(
      <ThunderIDContext.Provider value={thunderIDContext}>
        <I18nProvider>
          <ThemeProvider>
            <BaseSignIn components={[]} initialValues={{user_code: 'ABCD-EFGH'}} onSubmit={vi.fn()}>
              {({values}) => {
                renderedValues = values;
                return <div />;
              }}
            </BaseSignIn>
          </ThemeProvider>
        </I18nProvider>
      </ThunderIDContext.Provider>,
    );

    await waitFor(() => expect(renderedValues).toEqual({user_code: 'ABCD-EFGH'}));
  });

  it('does not reapply equivalent initial values after the user edits a field', async () => {
    const renderBaseSignIn = (initialValues: Record<string, string>) => (
      <ThunderIDContext.Provider value={thunderIDContext}>
        <I18nProvider>
          <ThemeProvider>
            <BaseSignIn components={[]} initialValues={initialValues} onSubmit={vi.fn()}>
              {({handleInputChange, values}) => (
                <input
                  aria-label="Verification code"
                  value={values.user_code ?? ''}
                  onChange={(event) => handleInputChange('user_code', event.target.value)}
                />
              )}
            </BaseSignIn>
          </ThemeProvider>
        </I18nProvider>
      </ThunderIDContext.Provider>
    );
    const {rerender} = render(renderBaseSignIn({user_code: 'ABCD-EFGH'}));

    await waitFor(() => expect(screen.getByRole('textbox', {name: 'Verification code'})).toHaveValue('ABCD-EFGH'));
    fireEvent.change(screen.getByRole('textbox', {name: 'Verification code'}), {target: {value: 'WXYZ-1234'}});
    rerender(renderBaseSignIn({user_code: 'ABCD-EFGH'}));

    expect(screen.getByRole('textbox', {name: 'Verification code'})).toHaveValue('WXYZ-1234');
  });

  it('keeps a submit action disabled until every field passes validation', () => {
    const components: EmbeddedFlowComponent[] = [
      {
        id: 'otp_input',
        ref: 'otp',
        required: true,
        type: 'OTP_INPUT',
        validation: [{message: 'otp.too_short', type: 'minLength', value: 6}],
      },
      {
        eventType: 'SUBMIT',
        id: 'action_submit_otp',
        label: 'Verify',
        type: 'ACTION',
      },
    ];

    const {container} = render(
      <ThunderIDContext.Provider value={thunderIDContext}>
        <I18nProvider>
          <ThemeProvider>
            <BaseSignIn components={components} onSubmit={vi.fn()} />
          </ThemeProvider>
        </I18nProvider>
      </ThunderIDContext.Provider>,
    );

    const button: HTMLButtonElement = screen.getByRole('button', {name: 'Verify'});
    const digits = container.querySelectorAll<HTMLInputElement>('input[autocomplete="one-time-code"]');
    expect(digits).toHaveLength(6);
    expect(button.disabled).toBe(true);

    '123'.split('').forEach((digit, index) => fireEvent.change(digits[index], {target: {value: digit}}));
    expect(button.disabled).toBe(true);
    // Typing alone never surfaces the validation message.
    expect(screen.queryByText('otp.too_short')).toBeNull();

    '456'.split('').forEach((digit, index) => fireEvent.change(digits[index + 3], {target: {value: digit}}));
    expect(button.disabled).toBe(false);
  });

  it('keeps submit disabled once a custom renderer expires the step, until a new step arrives', () => {
    const step = (): EmbeddedFlowComponent[] => [
      {id: 'otp_input', ref: 'otp', required: true, type: 'OTP_INPUT'},
      {eventType: 'SUBMIT', id: 'action_submit_otp', label: 'Verify', type: 'ACTION'},
      {id: 'RESEND_OTP', type: 'CUSTOM'},
    ];
    const renderers: ComponentRendererMap = {
      RESEND_OTP: (_component, context) => (
        <button type="button" onClick={(): void => context.expireStep?.()}>
          {context.isTimeoutDisabled ? 'expired' : 'running'}
        </button>
      ),
    };
    const ui = (components: EmbeddedFlowComponent[]): ReactElement => (
      <ThunderIDContext.Provider value={thunderIDContext}>
        <ComponentRendererContext.Provider value={renderers}>
          <I18nProvider>
            <ThemeProvider>
              <BaseSignIn components={components} onSubmit={vi.fn()} />
            </ThemeProvider>
          </I18nProvider>
        </ComponentRendererContext.Provider>
      </ThunderIDContext.Provider>
    );
    const submit = (): HTMLButtonElement => screen.getByRole('button', {name: 'Verify'});

    const first = step();
    const {container, rerender} = render(ui(first));

    // Fill the required field first, so the expiry is the only thing left to disable submit.
    const digits = container.querySelectorAll<HTMLInputElement>('input[autocomplete="one-time-code"]');
    '123456'.split('').forEach((digit, index) => fireEvent.change(digits[index], {target: {value: digit}}));
    expect(submit().disabled).toBe(false);

    // A filled field does not keep submit enabled once the step expires.
    fireEvent.click(screen.getByRole('button', {name: 'running'}));
    expect(submit().disabled).toBe(true);
    expect(screen.getByRole('button', {name: 'expired'})).not.toBeNull();

    // A re-render with the same step keeps it; a new step response lifts it.
    rerender(ui(first));
    expect(submit().disabled).toBe(true);
    rerender(ui(step()));
    expect(submit().disabled).toBe(false);
    expect(screen.getByRole('button', {name: 'running'})).not.toBeNull();
  });

  it('honours an expiry a custom renderer raises from its mount effect on a new step', () => {
    const step = (): EmbeddedFlowComponent[] => [
      {eventType: 'SUBMIT', id: 'action_submit_otp', label: 'Verify', type: 'ACTION'},
      {id: 'RESEND_OTP', type: 'CUSTOM'},
    ];
    const ExpireOnMount = ({expire}: {expire: (() => void) | undefined}): null => {
      // Mount-only on purpose: a countdown that already ran out expires the step it mounted with.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      useEffect(() => expire?.(), []);
      return null;
    };
    const renderers: ComponentRendererMap = {
      RESEND_OTP: (_component, context) => <ExpireOnMount expire={context.expireStep} />,
    };
    const ui = (components: EmbeddedFlowComponent[]): ReactElement => (
      <ThunderIDContext.Provider value={thunderIDContext}>
        <ComponentRendererContext.Provider value={renderers}>
          <I18nProvider>
            <ThemeProvider>
              <BaseSignIn components={components} onSubmit={vi.fn()} />
            </ThemeProvider>
          </I18nProvider>
        </ComponentRendererContext.Provider>
      </ThunderIDContext.Provider>
    );

    const {rerender} = render(ui(step()));
    expect(screen.getByRole<HTMLButtonElement>('button', {name: 'Verify'}).disabled).toBe(true);

    // The renderer stays mounted across steps, so its mount effect does not re-run on the new step.
    rerender(ui(step()));
    expect(screen.getByRole<HTMLButtonElement>('button', {name: 'Verify'}).disabled).toBe(false);
  });
});
