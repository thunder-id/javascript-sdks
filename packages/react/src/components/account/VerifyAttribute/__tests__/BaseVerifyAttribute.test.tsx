// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {act, cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {
  EmbeddedFlowComponent,
  EmbeddedSelfServiceFlowResponse,
  EmbeddedSelfServiceFlowStatus,
  I18nBundle,
} from '@thunderid/browser';
import {ReactElement, StrictMode} from 'react';
import {afterEach, beforeEach, describe, expect, it, Mock, vi} from 'vitest';
import I18nProvider from '../../../../contexts/I18n/I18nProvider';
import ThemeProvider from '../../../../contexts/Theme/ThemeProvider';
import ThunderIDContext, {ThunderIDContextProps} from '../../../../contexts/ThunderID/ThunderIDContext';
import BaseVerifyAttribute, {BaseVerifyAttributeProps, BaseVerifyAttributeRenderProps} from '../BaseVerifyAttribute';

const thunderIDContext: ThunderIDContextProps = {
  baseUrl: 'https://localhost:8090',
  instanceId: 0,
  isInitialized: true,
  isLoading: false,
  meta: null,
  vendor: 'thunderid',
} as unknown as ThunderIDContextProps;

// The shipped email flow's code prompt (`prompt_otp`), as the server returns it.
const codePrompt: EmbeddedFlowComponent[] = [
  {
    align: 'left',
    id: 'prompt_otp_heading',
    label: '{{ t(verification:self.email.title) }}',
    type: 'TEXT',
    variant: 'HEADING_1',
  },
  {
    align: 'left',
    id: 'prompt_otp_message',
    label: '{{ t(verification:self.email.message) }}',
    type: 'TEXT',
    variant: 'HEADING_6',
  },
  {
    components: [
      {
        id: 'input_otp',
        label: '{{ t(verification:self.email.code.label) }}',
        ref: 'otp',
        required: true,
        type: 'OTP_INPUT',
      },
      {
        eventType: 'SUBMIT',
        id: 'action_verify',
        label: '{{ t(verification:self.email.verify) }}',
        type: 'ACTION',
        variant: 'PRIMARY',
      },
      {eventType: 'SUBMIT', id: 'action_resend', label: '{{ t(verification:self.email.resend) }}', type: 'RESEND'},
    ],
    id: 'block_otp',
    type: 'BLOCK',
  },
] as unknown as EmbeddedFlowComponent[];

const codePromptData = {
  actions: [
    {nextNode: 'verify_otp', ref: 'action_verify'},
    {nextNode: 'prepare_verification', ref: 'action_resend'},
  ],
  inputs: [{identifier: 'otp', ref: 'input_otp', required: true, type: 'OTP_INPUT'}],
  meta: {components: codePrompt},
};

// The server's verification translations, which flow metadata adds to the SDK's bundles.
const flowTranslations: I18nBundle = {
  translations: {
    verification: {
      'self.email.code.label': 'Verification code',
      'self.email.message': 'Enter the verification code sent to your email address.',
      'self.email.resend': 'Resend code',
      'self.email.title': 'Verify your email address',
      'self.email.verify': 'Verify',
    },
  },
} as unknown as I18nBundle;

const codeSent = (destination = 'a•••@example.com', challengeToken = 'ct-1'): EmbeddedSelfServiceFlowResponse => ({
  challengeToken,
  data: {
    ...codePromptData,
    additionalData: {emailSent: 'true', maskedDestination: destination},
  },
  executionId: 'exec-1',
  flowStatus: EmbeddedSelfServiceFlowStatus.Incomplete,
});

// A link flow's step names where the link went and asks for nothing.
const linkSent: EmbeddedSelfServiceFlowResponse = {
  challengeToken: 'ct-1',
  data: {
    additionalData: {emailSent: 'true', maskedDestination: 'a•••@example.com'},
    components: [
      {id: 'link_sent_heading', label: 'Check your email', type: 'TEXT', variant: 'HEADING_1'},
      {id: 'link_sent_message', label: 'Open the link we sent you.', type: 'TEXT', variant: 'HEADING_6'},
    ],
  },
  executionId: 'exec-1',
  flowStatus: EmbeddedSelfServiceFlowStatus.Incomplete,
} as unknown as EmbeddedSelfServiceFlowResponse;

const codeRejected: EmbeddedSelfServiceFlowResponse = {
  challengeToken: 'ct-2',
  data: codePromptData,
  error: {message: {defaultValue: 'The code is incorrect.', key: 'otp.invalid'}},
  executionId: 'exec-1',
  flowStatus: EmbeddedSelfServiceFlowStatus.Incomplete,
} as unknown as EmbeddedSelfServiceFlowResponse;

const verified: EmbeddedSelfServiceFlowResponse = {
  executionId: 'exec-1',
  flowStatus: EmbeddedSelfServiceFlowStatus.Complete,
};

const refused: EmbeddedSelfServiceFlowResponse = {
  error: {message: {defaultValue: 'Verification is not allowed.', key: 'verification.refused'}},
  executionId: 'exec-1',
  flowStatus: EmbeddedSelfServiceFlowStatus.Error,
} as unknown as EmbeddedSelfServiceFlowResponse;

const withProviders = (ui: ReactElement): ReactElement => (
  <ThunderIDContext.Provider value={thunderIDContext}>
    <I18nProvider preferences={{bundles: {'en-US': flowTranslations}}}>
      <ThemeProvider>{ui}</ThemeProvider>
    </I18nProvider>
  </ThunderIDContext.Provider>
);

const renderVerify = (props: Partial<BaseVerifyAttributeProps> = {}): ReturnType<typeof render> =>
  render(withProviders(<BaseVerifyAttribute attributeDisplayName="Email" {...props} />));

const enterCode = (code: string): void => {
  const event: Event = new Event('paste', {bubbles: true, cancelable: true});
  Object.defineProperty(event, 'clipboardData', {value: {getData: () => code}});
  fireEvent(screen.getAllByRole('textbox')[0], event);
};

describe('BaseVerifyAttribute', () => {
  let onInitialize: Mock;
  let onSubmit: Mock;

  beforeEach(() => {
    onInitialize = vi.fn().mockResolvedValue(codeSent());
    onSubmit = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows a spinner and no prompt while the code is being sent', () => {
    onInitialize.mockReturnValue(new Promise(() => undefined));

    const {container} = renderVerify({onInitialize, onSubmit});

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.getByRole('status', {name: 'Loading'})).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('starts the verification once per mount', async () => {
    render(
      <StrictMode>{withProviders(<BaseVerifyAttribute onInitialize={onInitialize} onSubmit={onSubmit} />)}</StrictMode>,
    );

    await screen.findByRole('button', {name: 'Verify'});
    expect(onInitialize).toHaveBeenCalledTimes(1);
  });

  it('waits for the SDK to initialize before starting', async () => {
    const {rerender} = renderVerify({isInitialized: false, onInitialize, onSubmit});

    expect(onInitialize).not.toHaveBeenCalled();

    rerender(withProviders(<BaseVerifyAttribute isInitialized onInitialize={onInitialize} onSubmit={onSubmit} />));

    await waitFor(() => expect(onInitialize).toHaveBeenCalledTimes(1));
  });

  it('prompts for the code and names where it was sent', async () => {
    renderVerify({onInitialize, onSubmit});

    expect(await screen.findByText('Verify your email address')).toBeTruthy();
    expect(screen.getByText('Enter the verification code sent to your email address.')).toBeTruthy();
    expect(screen.getByText('Sent to a•••@example.com.')).toBeTruthy();
    expect(screen.getAllByRole('textbox')).toHaveLength(6);
    expect(screen.getByRole('button', {name: 'Resend code'})).toBeTruthy();
  });

  it('submits the code to the same execution with its challenge token', async () => {
    onSubmit.mockResolvedValue(verified);
    renderVerify({onInitialize, onSubmit});
    await screen.findByRole('button', {name: 'Verify'});

    enterCode('123456');
    fireEvent.click(screen.getByRole('button', {name: 'Verify'}));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        action: 'action_verify',
        challengeToken: 'ct-1',
        executionId: 'exec-1',
        inputs: {otp: '123456'},
      }),
    );
  });

  it('does not submit without a code', async () => {
    renderVerify({onInitialize, onSubmit});
    await screen.findByRole('button', {name: 'Verify'});

    fireEvent.click(screen.getByRole('button', {name: 'Verify'}));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('confirms a recorded verification and reports it', async () => {
    const onComplete = vi.fn();
    onSubmit.mockResolvedValue(verified);
    renderVerify({onCancel: vi.fn(), onComplete, onInitialize, onSubmit});
    await screen.findByRole('button', {name: 'Verify'});

    enterCode('123456');
    fireEvent.click(screen.getByRole('button', {name: 'Verify'}));

    expect(await screen.findByText('Email verified.')).toBeTruthy();
    expect(onComplete).toHaveBeenCalledWith(verified);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('Close')).toBeTruthy();
  });

  it('keeps the prompt and the destination when a code is rejected', async () => {
    const onComplete = vi.fn();
    onSubmit.mockResolvedValue(codeRejected);
    renderVerify({onComplete, onInitialize, onSubmit});
    await screen.findByRole('button', {name: 'Verify'});

    enterCode('000000');
    fireEvent.click(screen.getByRole('button', {name: 'Verify'}));

    expect(await screen.findByText('The code is incorrect.')).toBeTruthy();
    expect(screen.getByText('Sent to a•••@example.com.')).toBeTruthy();
    expect(screen.getAllByRole('textbox')).toHaveLength(6);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('sends the next code attempt with the token of the rejected step', async () => {
    onSubmit.mockResolvedValueOnce(codeRejected).mockResolvedValueOnce(verified);
    renderVerify({onInitialize, onSubmit});
    await screen.findByRole('button', {name: 'Verify'});

    enterCode('000000');
    fireEvent.click(screen.getByRole('button', {name: 'Verify'}));
    await screen.findByText('The code is incorrect.');
    enterCode('123456');
    fireEvent.click(screen.getByRole('button', {name: 'Verify'}));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));
    expect(onSubmit.mock.calls[1][0]).toMatchObject({challengeToken: 'ct-2', inputs: {otp: '123456'}});
  });

  it('resends without asking for a code and shows the new destination', async () => {
    onSubmit.mockResolvedValue(codeSent('b•••@example.com', 'ct-3'));
    renderVerify({onInitialize, onSubmit});

    fireEvent.click(await screen.findByRole('button', {name: 'Resend code'}));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        action: 'action_resend',
        challengeToken: 'ct-1',
        executionId: 'exec-1',
        inputs: {},
      }),
    );
    expect(await screen.findByText('Sent to b•••@example.com.')).toBeTruthy();
  });

  it('leaves a partly typed code out of a resend', async () => {
    onSubmit.mockResolvedValue(codeSent('a•••@example.com', 'ct-3'));
    renderVerify({onInitialize, onSubmit});
    await screen.findByRole('button', {name: 'Resend code'});

    enterCode('12');
    fireEvent.click(screen.getByRole('button', {name: 'Resend code'}));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        action: 'action_resend',
        challengeToken: 'ct-1',
        executionId: 'exec-1',
        inputs: {},
      }),
    );
  });

  it('shows a refusal, reports it and stops prompting', async () => {
    const onError = vi.fn();
    onSubmit.mockResolvedValue(refused);
    renderVerify({onCancel: vi.fn(), onError, onInitialize, onSubmit});
    await screen.findByRole('button', {name: 'Verify'});

    enterCode('123456');
    fireEvent.click(screen.getByRole('button', {name: 'Verify'}));

    expect(await screen.findByText('Verification is not allowed.')).toBeTruthy();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({message: 'Verification is not allowed.'}));
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('Close')).toBeTruthy();
  });

  it('shows a generic message, not the response body, when the request fails', async () => {
    const onError = vi.fn();
    const failure = new Error('{"code":"FLW-1001","description":"internal detail"}');
    onInitialize.mockRejectedValue(failure);
    renderVerify({onError, onInitialize, onSubmit});

    expect(await screen.findByText('Verification failed. Please try again.')).toBeTruthy();
    expect(screen.queryByText(/internal detail/)).toBeNull();
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it('offers Cancel while verifying when the panel can be dismissed', async () => {
    const onCancel = vi.fn();
    renderVerify({onCancel, onInitialize, onSubmit});
    await screen.findByRole('button', {name: 'Verify'});

    fireEvent.click(screen.getByText('Cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('tells the user to open the link and reports Done for a link flow', async () => {
    const onDone = vi.fn();
    onInitialize.mockResolvedValue(linkSent);
    renderVerify({onDone, onInitialize, onSubmit});

    await screen.findByText('Open the link we sent you.');
    expect(screen.getByText('Sent to a•••@example.com.')).toBeTruthy();
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    fireEvent.click(screen.getByText('Done'));

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('offers Done only for a link flow', async () => {
    renderVerify({onDone: vi.fn(), onInitialize, onSubmit});
    await screen.findByRole('button', {name: 'Verify'});

    expect(screen.queryByText('Done')).toBeNull();
  });

  it('names the destination in its own words when the flow gives no prompt text', async () => {
    onInitialize.mockResolvedValue({
      ...codeSent(),
      data: {
        ...codeSent().data,
        components: codePrompt.filter((c: EmbeddedFlowComponent) => c.variant !== 'HEADING_6'),
      },
    } as unknown as EmbeddedSelfServiceFlowResponse);
    renderVerify({onInitialize, onSubmit});

    expect(await screen.findByText('Enter the code sent to a•••@example.com.')).toBeTruthy();
    expect(screen.queryByText('Sent to a•••@example.com.')).toBeNull();
  });

  it('tells the user to open the link when a link flow gives no prompt text', async () => {
    onInitialize.mockResolvedValue({
      ...linkSent,
      data: {...linkSent.data, components: [linkSent.data!.components![0]]},
    } as unknown as EmbeddedSelfServiceFlowResponse);
    renderVerify({onDone: vi.fn(), onInitialize, onSubmit});

    expect(
      await screen.findByText('We sent a verification link to a•••@example.com. Open it, then select Done.'),
    ).toBeTruthy();
  });

  it('lets a custom renderer resend without validating the code', async () => {
    onSubmit.mockResolvedValue(codeSent('a•••@example.com', 'ct-3'));
    renderVerify({
      children: ({components, destination, handleSubmit}) => {
        const resend: EmbeddedFlowComponent | undefined = components[0]?.components?.find(
          (component: EmbeddedFlowComponent) => component.type === 'RESEND',
        );
        if (!resend) return null;
        return (
          <button type="button" onClick={(): void => void handleSubmit(resend, {}, true)}>
            {`Resend to ${destination}`}
          </button>
        );
      },
      onInitialize,
      onSubmit,
    });

    fireEvent.click(await screen.findByText('Resend to a•••@example.com'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        action: 'action_resend',
        challengeToken: 'ct-1',
        executionId: 'exec-1',
        inputs: {},
      }),
    );
  });

  it('treats a step with an action and no input as a step to submit, not a link', async () => {
    onInitialize.mockResolvedValue({
      ...linkSent,
      data: {
        ...linkSent.data,
        components: [{eventType: 'SUBMIT', id: 'action_confirm', label: 'Confirm', type: 'ACTION', variant: 'PRIMARY'}],
      },
    } as unknown as EmbeddedSelfServiceFlowResponse);
    renderVerify({onDone: vi.fn(), onInitialize, onSubmit});
    await screen.findByText('Confirm');

    expect(screen.queryByText('Done')).toBeNull();
  });

  it('tags the inputs and actions rendered from the flow, and its own actions, with flow identifiers', async () => {
    const {container} = renderVerify({onCancel: vi.fn(), onInitialize, onSubmit});
    const verify: HTMLElement = await screen.findByRole('button', {name: 'Verify'});

    expect(verify.getAttribute('data-testid')).toBe('thunderid-action-action_verify');
    expect(screen.getByRole('button', {name: 'Resend code'}).getAttribute('data-testid')).toBe(
      'thunderid-action-action_resend',
    );
    expect(screen.getByRole('button', {name: 'Cancel'}).getAttribute('data-testid')).toBe(
      'thunderid-action-verificationCancel',
    );
    expect(container.querySelector('[data-testid="thunderid-field-otp"]')).not.toBeNull();
    expect(container.querySelector('[data-testid^="thunderid-signin-"]')).toBeNull();
  });

  it('tags Done for a link flow', async () => {
    onInitialize.mockResolvedValue(linkSent);
    renderVerify({onDone: vi.fn(), onInitialize, onSubmit});

    expect((await screen.findByRole('button', {name: 'Done'})).getAttribute('data-testid')).toBe(
      'thunderid-action-verificationDone',
    );
  });

  it('offers no dismiss action when none is handled', async () => {
    renderVerify({onInitialize, onSubmit});
    await screen.findByRole('button', {name: 'Verify'});

    expect(screen.queryByText('Cancel')).toBeNull();
    expect(screen.queryByText('Close')).toBeNull();
  });

  describe('custom render', () => {
    // Draws the step with plain elements and keeps the last render props for assertions.
    const renderCustom = (
      props: Partial<BaseVerifyAttributeProps> = {},
    ): {latest: () => BaseVerifyAttributeRenderProps} => {
      let latest: BaseVerifyAttributeRenderProps | undefined;
      renderVerify({
        children: (renderProps: BaseVerifyAttributeRenderProps) => {
          latest = renderProps;
          const verify: EmbeddedFlowComponent | undefined = renderProps.components[0]?.components?.find(
            (component: EmbeddedFlowComponent) => component.type === 'ACTION',
          );
          return (
            <form aria-busy={renderProps.isLoading}>
              <h2>{renderProps.title}</h2>
              <p>{renderProps.subtitle}</p>
              {renderProps.destinationText && <p>{renderProps.destinationText}</p>}
              {renderProps.error && <p role="alert">{renderProps.error}</p>}
              {renderProps.isComplete && <p>{renderProps.successMessage}</p>}
              <input
                aria-label="Code"
                value={renderProps.values['otp'] ?? ''}
                onChange={(event): void => renderProps.handleInputChange('otp', event.target.value)}
              />
              {verify && (
                <button type="button" onClick={(): void => void renderProps.handleSubmit(verify, renderProps.values)}>
                  Check
                </button>
              )}
              {renderProps.handleResend && (
                <button type="button" onClick={(): void => void renderProps.handleResend?.()}>
                  Send again
                </button>
              )}
              {renderProps.onCancel && (
                <button type="button" onClick={renderProps.onCancel}>
                  Dismiss
                </button>
              )}
              {renderProps.onDone && (
                <button type="button" onClick={renderProps.onDone}>
                  Opened it
                </button>
              )}
            </form>
          );
        },
        onInitialize,
        onSubmit,
        ...props,
      });
      return {latest: () => latest!};
    };

    it('replaces the built-in steps and hands over the step, headings and destination', async () => {
      renderCustom();

      expect(await screen.findByText('Verify your email address')).toBeTruthy();
      expect(screen.getByText('Enter the verification code sent to your email address.')).toBeTruthy();
      expect(screen.getByText('Sent to a•••@example.com.')).toBeTruthy();
      expect(screen.queryByRole('button', {name: 'Verify'})).toBeNull();
      expect(screen.queryAllByRole('textbox')).toHaveLength(1);
    });

    it('submits the values the custom UI set, with the challenge token', async () => {
      onSubmit.mockResolvedValue(verified);
      const onComplete: Mock = vi.fn();
      renderCustom({onComplete});
      fireEvent.change(await screen.findByLabelText('Code'), {target: {value: '123456'}});
      fireEvent.click(screen.getByRole('button', {name: 'Check'}));

      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith({
          action: 'action_verify',
          challengeToken: 'ct-1',
          executionId: 'exec-1',
          inputs: {otp: '123456'},
        }),
      );
      expect(await screen.findByText('Email verified.')).toBeTruthy();
      expect(onComplete).toHaveBeenCalledWith(verified);
    });

    it('keeps validation: an empty code is not sent', async () => {
      renderCustom();
      fireEvent.click(await screen.findByRole('button', {name: 'Check'}));

      await waitFor(() => expect(screen.getByLabelText('Code')).toBeTruthy());
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('resends through handleResend without validating the code', async () => {
      onSubmit.mockResolvedValue(codeSent('a•••@example.com', 'ct-3'));
      renderCustom();
      fireEvent.click(await screen.findByRole('button', {name: 'Send again'}));

      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith({
          action: 'action_resend',
          challengeToken: 'ct-1',
          executionId: 'exec-1',
          inputs: {},
        }),
      );
    });

    it('sends one resend when a custom UI calls handleResend twice at once', async () => {
      onSubmit.mockResolvedValue(codeSent('a•••@example.com', 'ct-3'));
      const {latest} = renderCustom();
      await screen.findByRole('button', {name: 'Send again'});

      await act(async () => {
        await Promise.all([latest().handleResend?.(), latest().handleResend?.()]);
      });

      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('hands over cancel, and Done only while a link is awaited', async () => {
      const onCancel: Mock = vi.fn();
      const onDone: Mock = vi.fn();
      const {latest} = renderCustom({onCancel, onDone});
      fireEvent.click(await screen.findByRole('button', {name: 'Dismiss'}));

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(latest().onDone).toBeUndefined();
      expect(latest().isAwaitingLink).toBe(false);
    });

    it('hands over Done and no resend for a link step', async () => {
      onInitialize.mockResolvedValue(linkSent);
      const onDone: Mock = vi.fn();
      const {latest} = renderCustom({onDone});
      fireEvent.click(await screen.findByRole('button', {name: 'Opened it'}));

      expect(onDone).toHaveBeenCalledTimes(1);
      expect(latest().isAwaitingLink).toBe(true);
      expect(latest().handleResend).toBeUndefined();
    });

    it('hands over a refusal as a translated error and the failed state', async () => {
      onSubmit.mockResolvedValue(refused);
      const {latest} = renderCustom();
      fireEvent.change(await screen.findByLabelText('Code'), {target: {value: '123456'}});
      fireEvent.click(screen.getByRole('button', {name: 'Check'}));

      expect((await screen.findByRole('alert')).textContent).toBe('Verification is not allowed.');
      expect(latest().isFailed).toBe(true);
      expect(latest().handleResend).toBeUndefined();
    });

    it('starts the verification once per mount', async () => {
      render(
        <StrictMode>
          {withProviders(
            <BaseVerifyAttribute onInitialize={onInitialize} onSubmit={onSubmit}>
              {({title}: BaseVerifyAttributeRenderProps) => <h2>{title}</h2>}
            </BaseVerifyAttribute>,
          )}
        </StrictMode>,
      );

      await screen.findByText('Verify your email address');
      expect(onInitialize).toHaveBeenCalledTimes(1);
    });
  });
});
