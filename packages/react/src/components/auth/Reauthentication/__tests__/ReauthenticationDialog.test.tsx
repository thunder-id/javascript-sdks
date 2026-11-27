// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {EmbeddedSignInFlowResponse, ThunderIDRuntimeError} from '@thunderid/browser';
import {afterEach, describe, expect, it, vi} from 'vitest';
import I18nProvider from '../../../../contexts/I18n/I18nProvider';
import ThemeProvider from '../../../../contexts/Theme/ThemeProvider';
import ThunderIDContext, {ThunderIDContextProps} from '../../../../contexts/ThunderID/ThunderIDContext';
import ReauthenticationDialog from '../ReauthenticationDialog';

const thunderIDContext: ThunderIDContextProps = {meta: null, vendor: 'thunderid'} as unknown as ThunderIDContextProps;

const step = (executionId = 'e-1'): EmbeddedSignInFlowResponse =>
  ({
    data: {
      meta: {components: [{eventType: 'TRIGGER', id: 'action_continue', label: 'Continue', type: 'ACTION'}]},
    },
    executionId,
    flowStatus: 'INCOMPLETE',
    type: 'VIEW',
  }) as unknown as EmbeddedSignInFlowResponse;

const complete = {assertion: 'a', flowStatus: 'COMPLETE'} as unknown as EmbeddedSignInFlowResponse;

const renderDialog = (execute: ReturnType<typeof vi.fn>) => {
  const handlers = {onCancel: vi.fn(), onComplete: vi.fn(), onError: vi.fn()};

  render(
    <ThunderIDContext.Provider value={thunderIDContext}>
      <I18nProvider>
        <ThemeProvider>
          <ReauthenticationDialog execute={execute} maxAge={30} {...handlers} />
        </ThemeProvider>
      </I18nProvider>
    </ThunderIDContext.Provider>,
  );

  return handlers;
};

describe('ReauthenticationDialog', () => {
  afterEach(() => {
    cleanup();
  });

  it('starts the flow once with maxAge and completes after the step is submitted', async () => {
    const execute = vi.fn().mockResolvedValueOnce(step()).mockResolvedValueOnce(complete);
    const {onComplete, onError} = renderDialog(execute);

    fireEvent.click(await screen.findByRole('button', {name: 'Continue'}));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(execute).toHaveBeenNthCalledWith(1, {}, {maxAge: 30});
    expect(execute).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({action: 'action_continue', executionId: 'e-1'}),
      {maxAge: 30},
    );
    expect(onError).not.toHaveBeenCalled();
  });

  it('completes at once when the server reuses a recent enough sign-in', async () => {
    const execute = vi.fn().mockResolvedValueOnce(complete);
    const {onComplete} = renderDialog(execute);

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('reports a sign-in by a different user', async () => {
    const differentUser = new ThunderIDRuntimeError('x', 'BROWSER-REAUTHENTICATION-DU01', 'browser');
    const execute = vi.fn().mockResolvedValueOnce(step()).mockRejectedValueOnce(differentUser);
    const {onComplete, onError} = renderDialog(execute);

    fireEvent.click(await screen.findByRole('button', {name: 'Continue'}));

    await waitFor(() => expect(onError).toHaveBeenCalledWith(differentUser));
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('starts again and tells the user when they pick an option that leaves the page', async () => {
    const redirection = {executionId: 'e-1', flowStatus: 'INCOMPLETE', type: 'REDIRECTION'};
    const execute = vi
      .fn()
      .mockResolvedValueOnce(step())
      .mockResolvedValueOnce(redirection)
      .mockResolvedValueOnce(step('e-2'));
    const {onError} = renderDialog(execute);

    fireEvent.click(await screen.findByRole('button', {name: 'Continue'}));

    expect(await screen.findByText('This sign-in option is not available here. Choose another one.')).toBeTruthy();
    expect(execute).toHaveBeenNthCalledWith(3, {}, {maxAge: 30});
    expect(onError).not.toHaveBeenCalled();
  });

  it('fails when the flow offers only an option that leaves the page', async () => {
    const execute = vi.fn().mockResolvedValueOnce({executionId: 'e-1', flowStatus: 'INCOMPLETE', type: 'REDIRECTION'});
    const {onError} = renderDialog(execute);

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({code: 'REACT-REAUTHENTICATION-UO01'})),
    );
  });

  it('cancels when the user closes the dialog', async () => {
    const execute = vi.fn().mockResolvedValueOnce(step());
    const {onCancel} = renderDialog(execute);

    await screen.findByRole('button', {name: 'Continue'});
    fireEvent.click(screen.getByRole('button', {name: 'Close'}));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('ends the re-sign-in instead of starting again when a new flow cannot go on', async () => {
    const ended = {flowStatus: 'ERROR'} as unknown as EmbeddedSignInFlowResponse;
    const execute = vi.fn().mockResolvedValueOnce(ended).mockResolvedValue(ended);
    const {onError} = renderDialog(execute);

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({code: 'REACT-REAUTHENTICATION-FE01'})),
    );
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('starts again once when the flow ends after a step, then ends the re-sign-in', async () => {
    const ended = {flowStatus: 'ERROR'} as unknown as EmbeddedSignInFlowResponse;
    const execute = vi.fn().mockResolvedValueOnce(step()).mockResolvedValueOnce(ended).mockResolvedValue(ended);
    const {onError} = renderDialog(execute);

    fireEvent.click(await screen.findByRole('button', {name: 'Continue'}));

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({code: 'REACT-REAUTHENTICATION-FE01'})),
    );
    expect(execute).toHaveBeenCalledTimes(3);
  });
});
