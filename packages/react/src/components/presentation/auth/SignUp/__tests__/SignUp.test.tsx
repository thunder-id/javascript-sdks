// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {render, waitFor, cleanup, act} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi, Mock} from 'vitest';
import I18nProvider from '../../../../../contexts/I18n/I18nProvider';
import ThemeProvider from '../../../../../contexts/Theme/ThemeProvider';
import ThunderIDContext, {ThunderIDContextProps} from '../../../../../contexts/ThunderID/ThunderIDContext';
import SignUp from '../SignUp';

const mockSignUp = vi.fn() as Mock;

const thunderIDContext: ThunderIDContextProps = {
  applicationId: 'app-1',
  getStorageManager: vi.fn(() =>
    Promise.resolve({
      getTemporaryData: vi.fn(() => Promise.resolve({})),
      removeTemporaryDataParameter: vi.fn(),
      setTemporaryDataParameter: vi.fn(),
    }),
  ),
  isInitialized: true,
  isLoading: false,
  signUp: mockSignUp,
  vendor: 'thunderid',
} as unknown as ThunderIDContextProps;

/**
 * Renders SignUp with a render-prop child that captures handleSubmit, so a step can be submitted
 * without depending on the default UI. Navigation is disabled unless a test opts in, because these
 * tests run in a real browser and assigning window.location.href would navigate the test page.
 */
const renderSignUp = (props: Record<string, unknown> = {}) => {
  const captured: {submit?: (component: unknown, data?: unknown, skipValidation?: boolean) => Promise<void>} = {};

  render(
    <ThunderIDContext.Provider value={thunderIDContext}>
      <I18nProvider>
        <ThemeProvider>
          <SignUp shouldRedirectAfterSignUp={false} {...props}>
            {({handleSubmit}: {handleSubmit: typeof captured.submit}) => {
              captured.submit = handleSubmit;
              return <div />;
            }}
          </SignUp>
        </ThemeProvider>
      </I18nProvider>
    </ThunderIDContext.Provider>,
  );

  return captured;
};

describe('SignUp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/signup');
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState({}, '', '/signup');
  });

  it('redirects to afterSignUpUrl when the completion carries an assertion', async () => {
    // A URL differing from the current one only by its fragment is a same-document navigation:
    // location updates without the page reloading, so the redirect can be observed from inside the
    // test. Anything else would navigate the test page away and take the run with it.
    const afterSignUpUrl = `${window.location.origin}${window.location.pathname}#signed-up`;
    mockSignUp.mockResolvedValueOnce({executionId: 'exec-1', flowStatus: 'INCOMPLETE'});

    const captured = renderSignUp({afterSignUpUrl, shouldRedirectAfterSignUp: true});
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledTimes(1);
    });

    mockSignUp.mockResolvedValueOnce({assertion: 'a-jwt', executionId: 'exec-1', flowStatus: 'COMPLETE'});
    await act(async () => {
      await captured.submit?.({id: 'continue'}, {}, true);
    });

    await waitFor(() => {
      expect(window.location.hash).toBe('#signed-up');
    });
  });

  it('hands a completion carrying an assertion to onComplete', async () => {
    const onComplete = vi.fn();
    mockSignUp.mockResolvedValueOnce({executionId: 'exec-1', flowStatus: 'INCOMPLETE'});

    const captured = renderSignUp({onComplete});
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledTimes(1);
    });

    mockSignUp.mockResolvedValueOnce({assertion: 'a-jwt', executionId: 'exec-1', flowStatus: 'COMPLETE'});
    await act(async () => {
      await captured.submit?.({id: 'continue'}, {}, true);
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
    expect(onComplete.mock.calls[0][0]).toMatchObject({flowStatus: 'COMPLETE', assertion: 'a-jwt'});
  });

  it('renders a KEY_VALUE_LIST from the step additionalData', async () => {
    mockSignUp.mockResolvedValueOnce({
      data: {
        additionalData: {
          linkingPromptDetails: JSON.stringify([{label: 'Email', value: 'alice@example.com'}]),
        },
        meta: {
          components: [{category: 'DISPLAY', id: 'kv_1', source: 'linkingPromptDetails', type: 'KEY_VALUE_LIST'}],
        },
      },
      executionId: 'exec-1',
      flowStatus: 'INCOMPLETE',
      type: 'VIEW',
    });

    render(
      <ThunderIDContext.Provider value={thunderIDContext}>
        <I18nProvider>
          <ThemeProvider>
            <SignUp shouldRedirectAfterSignUp={false} />
          </ThemeProvider>
        </I18nProvider>
      </ThunderIDContext.Provider>,
    );

    await waitFor(() => {
      expect(document.querySelector('dd')?.textContent).toBe('alice@example.com');
    });
    expect(document.querySelector('dt')?.textContent).toBe('Email');
  });

  it('refuses to submit again once the flow has completed', async () => {
    mockSignUp.mockResolvedValueOnce({executionId: 'exec-1', flowStatus: 'INCOMPLETE'});

    const captured = renderSignUp();
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledTimes(1);
    });

    mockSignUp.mockResolvedValueOnce({assertion: 'a-jwt', executionId: 'exec-1', flowStatus: 'COMPLETE'});
    await act(async () => {
      await captured.submit?.({id: 'continue'}, {}, true);
    });
    expect(mockSignUp).toHaveBeenCalledTimes(2);

    // The completed step stays on screen while the consumer navigates away, so its submit action
    // is still clickable. Submitting again must not start a fresh flow.
    await act(async () => {
      await captured.submit?.({id: 'continue'}, {}, true);
    });
    expect(mockSignUp).toHaveBeenCalledTimes(2);
  });

  it('follows a REDIRECTION that the provider callback leads into', async () => {
    // Stand-ins for the provider popups. The callback is picked up by polling the popup URL, as it is
    // when the provider redirects back to this origin.
    const firstPopup = {close: vi.fn(), closed: false, location: {href: 'about:blank'}};
    const secondPopup = {close: vi.fn(), closed: false, location: {href: 'about:blank'}};
    const open = vi
      .spyOn(window, 'open')
      .mockReturnValueOnce(firstPopup as unknown as Window)
      .mockReturnValueOnce(secondPopup as unknown as Window);

    mockSignUp.mockResolvedValueOnce({executionId: 'exec-1', flowStatus: 'INCOMPLETE'});
    const captured = renderSignUp();
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledTimes(1);
    });

    mockSignUp.mockResolvedValueOnce({
      data: {redirectURL: 'https://idp.example.com/authorize?state=s1'},
      executionId: 'exec-1',
      flowStatus: 'INCOMPLETE',
      type: 'REDIRECTION',
    });
    await act(async () => {
      await captured.submit?.({id: 'google'}, {}, true);
    });
    expect(open).toHaveBeenCalledWith('https://idp.example.com/authorize?state=s1', 'oauth_popup', expect.any(String));

    // The callback answers with the account-linking re-authentication: a second redirect.
    mockSignUp.mockResolvedValueOnce({
      data: {redirectURL: 'https://idp.example.com/authorize?state=s2'},
      executionId: 'exec-1',
      flowStatus: 'INCOMPLETE',
      type: 'REDIRECTION',
    });
    firstPopup.location.href = `${window.location.origin}/callback?code=c1&state=s1`;

    await waitFor(
      () => {
        expect(open).toHaveBeenCalledWith(
          'https://idp.example.com/authorize?state=s2',
          'oauth_popup',
          expect.any(String),
        );
      },
      {timeout: 3000},
    );
    expect(mockSignUp).toHaveBeenLastCalledWith(expect.objectContaining({inputs: {code: 'c1', state: 's1'}}));
    expect(firstPopup.close).toHaveBeenCalled();
    expect(secondPopup.close).not.toHaveBeenCalled();

    secondPopup.closed = true;
    open.mockRestore();
  });
});
