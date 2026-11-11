// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {act, cleanup, render, screen, waitFor} from '@testing-library/react';
import {ThunderIDAPIError} from '@thunderid/browser';
import type {ReactNode} from 'react';
import {afterEach, beforeEach, describe, expect, it, vi, Mock} from 'vitest';
import I18nProvider from '../../../../contexts/I18n/I18nProvider';
import ThemeProvider from '../../../../contexts/Theme/ThemeProvider';
import ThunderIDContext, {ThunderIDContextProps} from '../../../../contexts/ThunderID/ThunderIDContext';
import type {BaseRecoveryRenderProps} from '../BaseRecovery';
import Recovery from '../Recovery';

const mockRecover = vi.fn() as Mock;

const thunderIDContext: ThunderIDContextProps = {
  applicationId: 'app-1',
  isInitialized: true,
  isLoading: false,
  recover: mockRecover,
  vendor: 'thunderid',
} as unknown as ThunderIDContextProps;

const renderRecovery = (
  props: {afterFlowExpiredUrl?: string; tokenUrlParam?: string} = {},
): {last: () => BaseRecoveryRenderProps | undefined} => {
  const renderChild: Mock<(props: BaseRecoveryRenderProps) => ReactNode> = vi.fn(() => <div />);
  render(
    <ThunderIDContext.Provider value={thunderIDContext}>
      <I18nProvider>
        <ThemeProvider>
          <Recovery {...props}>{renderChild}</Recovery>
        </ThemeProvider>
      </I18nProvider>
    </ThunderIDContext.Provider>,
  );

  return {last: (): BaseRecoveryRenderProps | undefined => renderChild.mock.lastCall?.[0]};
};

const renderDefault = (props: {afterFlowExpiredUrl?: string} = {}): void => {
  render(
    <ThunderIDContext.Provider value={thunderIDContext}>
      <I18nProvider>
        <ThemeProvider>
          <Recovery {...props} />
        </ThemeProvider>
      </I18nProvider>
    </ThunderIDContext.Provider>,
  );
};

describe('Recovery flow expiry', () => {
  // A fragment of this page, so a redirect in a test never navigates the test page away.
  const appUrl = (): string => `${window.location.origin}${window.location.pathname}#app`;

  const setUserPresent = (present: boolean): void => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(present);
  };

  beforeEach(() => {
    mockRecover.mockReset();
    window.history.replaceState({}, '', '/recovery');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.history.replaceState({}, '', '/recovery');
  });

  it('counts down to the application with afterFlowExpiredUrl once the response expiresIn passes', async () => {
    setUserPresent(false);
    mockRecover.mockResolvedValueOnce({executionId: 'exec-1', expiresIn: 0.1, flowStatus: 'INCOMPLETE'});
    const {last} = renderRecovery({afterFlowExpiredUrl: appUrl()});

    await waitFor(() => {
      expect(mockRecover).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(last()?.isFlowExpired).toBe(true);
    });
    expect(last()?.flowExpiryRedirect).toMatchObject({isCountingDown: false, secondsLeft: 10, url: appUrl()});
  });

  it('expires when the server refuses a submission as expired', async () => {
    mockRecover.mockResolvedValueOnce({executionId: 'exec-1', flowStatus: 'INCOMPLETE'});
    const {last} = renderRecovery({afterFlowExpiredUrl: appUrl()});
    await waitFor(() => {
      expect(mockRecover).toHaveBeenCalledTimes(1);
      expect(last()?.isLoading).toBe(false);
    });

    mockRecover.mockRejectedValueOnce(
      new ThunderIDAPIError(
        JSON.stringify({code: 'FES-1004', message: {defaultValue: 'Invalid request', key: 'error.invalid_request'}}),
        'executeEmbeddedRecoveryFlow-ResponseError-001',
        'javascript',
        400,
        'Bad Request',
      ),
    );
    await act(async () => {
      await last()?.handleSubmit({id: 'continue'}, {});
    });

    await waitFor(() => {
      expect(last()?.isFlowExpired).toBe(true);
    });
  });

  it('starts an expired flow again once the user is on the page, and says so', async () => {
    setUserPresent(true);
    mockRecover
      .mockResolvedValueOnce({executionId: 'exec-1', expiresIn: 0.1, flowStatus: 'INCOMPLETE'})
      .mockResolvedValueOnce({executionId: 'exec-2', expiresIn: 60, flowStatus: 'INCOMPLETE'});
    const {last} = renderRecovery();

    await waitFor(() => {
      expect(mockRecover).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(last()?.isFlowRestarted).toBe(true);
    });
  });

  it('shows the countdown in the default UI with afterFlowExpiredUrl', async () => {
    setUserPresent(false);
    mockRecover.mockResolvedValueOnce({executionId: 'exec-1', expiresIn: 0.1, flowStatus: 'INCOMPLETE'});
    renderDefault({afterFlowExpiredUrl: appUrl()});

    expect(await screen.findByRole('heading', {name: 'Session expired'})).toBeInTheDocument();
    // Until the user is on the page, there is no countdown, only the link back.
    expect(screen.getByText('Please go back to the application and try again.')).toBeInTheDocument();
    expect(screen.getByRole('link', {name: 'Back to the application'})).toHaveAttribute('href', appUrl());

    // The user comes back; repeated until the listener is in place, since it runs only once.
    await waitFor(() => {
      window.dispatchEvent(new Event('focus'));
      expect(screen.getByText(/Taking you back to the application in \d+s\./)).toBeInTheDocument();
    });
    expect(screen.getByRole('link', {name: 'Back to the application now'})).toHaveAttribute('href', appUrl());
  });

  it('tells the user in the default UI that the flow started again', async () => {
    setUserPresent(true);
    mockRecover
      .mockResolvedValueOnce({executionId: 'exec-1', expiresIn: 0.1, flowStatus: 'INCOMPLETE'})
      .mockResolvedValueOnce({executionId: 'exec-2', expiresIn: 60, flowStatus: 'INCOMPLETE'});
    renderDefault();

    expect(await screen.findByText('Your session expired, so we started again.')).toBeInTheDocument();
    expect(mockRecover).toHaveBeenCalledTimes(2);
  });

  it('starts a recovery opened from an expired link again, without resuming the link', async () => {
    setUserPresent(true);
    window.history.replaceState({}, '', '/recovery?executionId=stale-exec&token=link-token');
    mockRecover
      .mockRejectedValueOnce(
        new ThunderIDAPIError(
          JSON.stringify({code: 'FES-1004', message: {defaultValue: 'Invalid request', key: 'error.invalid_request'}}),
          'executeEmbeddedRecoveryFlow-ResponseError-001',
          'javascript',
          400,
          'Bad Request',
        ),
      )
      .mockResolvedValueOnce({executionId: 'exec-2', expiresIn: 60, flowStatus: 'INCOMPLETE'});
    const {last} = renderRecovery({tokenUrlParam: 'token'});

    await waitFor(() => {
      expect(mockRecover).toHaveBeenCalledTimes(2);
    });
    expect(mockRecover.mock.calls[0][0]).toMatchObject({executionId: 'stale-exec'});
    expect(mockRecover.mock.calls[1][0]).not.toHaveProperty('executionId');
    await waitFor(() => {
      expect(last()?.isFlowRestarted).toBe(true);
    });
  });

  it('does not expire for another refusal', async () => {
    mockRecover.mockResolvedValueOnce({executionId: 'exec-1', flowStatus: 'INCOMPLETE'});
    const {last} = renderRecovery();
    await waitFor(() => {
      expect(mockRecover).toHaveBeenCalledTimes(1);
      expect(last()?.isLoading).toBe(false);
    });

    mockRecover.mockRejectedValueOnce(new ThunderIDAPIError('Server error', 'FLOW_ERROR', 'react', 500, 'Error'));
    await act(async () => {
      await last()?.handleSubmit({id: 'continue'}, {});
    });

    await waitFor(() => {
      expect(last()?.error).toBeTruthy();
    });
    expect(last()?.isFlowExpired).toBe(false);
  });
});
