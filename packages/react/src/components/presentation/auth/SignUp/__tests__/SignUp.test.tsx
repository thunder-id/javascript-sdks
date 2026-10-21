// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {render, waitFor, cleanup, act} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi, Mock, MockInstance} from 'vitest';
import type {ReactNode} from 'react';
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
const renderSignUp = ({children, ...props}: Record<string, unknown> = {}) => {
  const captured: {submit?: (component: unknown, data?: unknown, skipValidation?: boolean) => Promise<void>} = {};

  render(
    <ThunderIDContext.Provider value={thunderIDContext}>
      <I18nProvider>
        <ThemeProvider>
          <SignUp shouldRedirectAfterSignUp={false} {...props}>
            {(children as (renderProps: unknown) => ReactNode) ??
              (({handleSubmit}: {handleSubmit: typeof captured.submit}) => {
                captured.submit = handleSubmit;
                return <div />;
              })}
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

  it('attaches the current UI language as locale on the initiation request', async () => {
    mockSignUp.mockResolvedValueOnce({executionId: 'exec-1', flowStatus: 'INCOMPLETE'});

    renderSignUp();

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledTimes(1);
    });
    expect(mockSignUp).toHaveBeenCalledWith(expect.objectContaining({locale: expect.any(String)}));
  });

  it('attaches the current UI language as locale on a step submission', async () => {
    mockSignUp.mockResolvedValueOnce({executionId: 'exec-1', flowStatus: 'INCOMPLETE'});
    const captured = renderSignUp();
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledTimes(1);
    });

    mockSignUp.mockResolvedValueOnce({executionId: 'exec-1', flowStatus: 'INCOMPLETE'});
    await act(async () => {
      await captured.submit?.({id: 'continue'}, {username: 'user'}, true);
    });
    expect(mockSignUp).toHaveBeenLastCalledWith(expect.objectContaining({locale: expect.any(String)}));
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

  it('exposes the step additionalData to render props', async () => {
    mockSignUp.mockResolvedValueOnce({
      data: {additionalData: {linkingPromptDetails: '[]'}, components: []},
      executionId: 'exec-1',
      flowStatus: 'INCOMPLETE',
      type: 'VIEW',
    });
    const renderChild = vi.fn(() => <div />);

    renderSignUp({children: renderChild});

    await waitFor(() => {
      expect(renderChild).toHaveBeenLastCalledWith(
        expect.objectContaining({additionalData: {linkingPromptDetails: '[]'}}),
      );
    });
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

  describe('social sign-up popup', () => {
    const callbackUrl = (code: string, state: string): string =>
      `${window.location.origin}/callback?code=${code}&state=${state}`;

    let popup: {close: Mock; closed: boolean; location: {href: string}};
    // Where the popup was told to go. Its `href` keeps the current page until a test lands it, as a real
    // navigation commits only after the new page responds.
    let navigations: string[];
    let land: (url: string) => void;
    let open: MockInstance<typeof window.open>;
    let addListener: MockInstance<typeof window.addEventListener>;

    beforeEach(() => {
      let href = 'about:blank';
      navigations = [];
      land = (url: string): void => {
        href = url;
      };
      popup = {
        close: vi.fn(() => {
          popup.closed = true;
        }),
        closed: false,
        location: {
          get href(): string {
            return href;
          },
          set href(url: string) {
            navigations.push(url);
          },
        },
      };
      open = vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
      addListener = vi.spyOn(window, 'addEventListener');
    });

    afterEach(() => {
      // Stops the poll of any popup a failed assertion left open.
      popup.closed = true;
      open.mockRestore();
      addListener.mockRestore();
    });

    /**
     * Delivers the callback the way a callback page posting to its opener does. A synthetic MessageEvent cannot
     * carry the stand-in popup as its source, so the newest registered listener is called directly.
     */
    const postCallback = async (code: string, state: string): Promise<void> => {
      const handlers: Parameters<typeof window.addEventListener>[] = addListener.mock.calls.filter(
        ([type]) => type === 'message',
      );
      const handler = handlers[handlers.length - 1][1] as (event: unknown) => Promise<void>;
      await act(async () => {
        await handler({data: {code, state}, origin: window.location.origin, source: popup});
      });
    };

    const startSocialSignUp = async (props: Record<string, unknown> = {}) => {
      mockSignUp.mockResolvedValueOnce({executionId: 'exec-1', flowStatus: 'INCOMPLETE'});
      const captured = renderSignUp(props);
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
      expect(open).toHaveBeenCalledWith(
        'https://idp.example.com/authorize?state=s1',
        'oauth_popup',
        expect.any(String),
      );
    };

    const chainedRedirect = {
      data: {redirectURL: 'https://idp.example.com/authorize?state=s2'},
      executionId: 'exec-1',
      flowStatus: 'INCOMPLETE',
      type: 'REDIRECTION',
    };

    it('follows a REDIRECTION that the polled callback leads into', async () => {
      await startSocialSignUp();

      // The callback answers with the account-linking re-authentication: a second redirect.
      mockSignUp.mockResolvedValueOnce(chainedRedirect);
      land(callbackUrl('c1', 's1'));

      // No user activation is left to open a new popup, so the open one is navigated instead.
      await waitFor(
        () => {
          expect(navigations).toEqual(['https://idp.example.com/authorize?state=s2']);
        },
        {timeout: 3000},
      );
      expect(mockSignUp).toHaveBeenLastCalledWith(expect.objectContaining({inputs: {code: 'c1', state: 's1'}}));
      expect(open).toHaveBeenCalledTimes(1);
      expect(popup.close).not.toHaveBeenCalled();

      // The popup still shows the first callback until the new page responds; it must not be submitted again.
      await new Promise((resolve) => {
        setTimeout(resolve, 1500);
      });
      expect(mockSignUp).toHaveBeenCalledTimes(3);
    });

    it('follows a REDIRECTION that the posted callback leads into', async () => {
      await startSocialSignUp();

      mockSignUp.mockResolvedValueOnce(chainedRedirect);
      await postCallback('c1', 's1');

      expect(mockSignUp).toHaveBeenLastCalledWith(expect.objectContaining({inputs: {code: 'c1', state: 's1'}}));
      expect(navigations).toEqual(['https://idp.example.com/authorize?state=s2']);
      expect(open).toHaveBeenCalledTimes(1);
      expect(popup.close).not.toHaveBeenCalled();
    });

    it('submits a callback once when both the poll and the posted message deliver it', async () => {
      await startSocialSignUp();

      let resolveCallback: (value: unknown) => void = () => undefined;
      mockSignUp.mockReturnValueOnce(
        new Promise((resolve) => {
          resolveCallback = resolve;
        }),
      );
      land(callbackUrl('c1', 's1'));
      await waitFor(
        () => {
          expect(mockSignUp).toHaveBeenCalledTimes(3);
        },
        {timeout: 3000},
      );

      // The callback page posts to its opener while the polled submit is still in flight.
      const pending: Promise<void> = postCallback('c1', 's1');
      resolveCallback(chainedRedirect);
      await pending;

      await waitFor(() => {
        expect(navigations).toEqual(['https://idp.example.com/authorize?state=s2']);
      });
      expect(mockSignUp).toHaveBeenCalledTimes(3);
      expect(popup.close).not.toHaveBeenCalled();
    });

    it('ignores a late message from the previous callback page once the chained redirect starts', async () => {
      await startSocialSignUp();

      mockSignUp.mockResolvedValueOnce(chainedRedirect);
      land(callbackUrl('c1', 's1'));
      await waitFor(
        () => {
          expect(navigations).toEqual(['https://idp.example.com/authorize?state=s2']);
        },
        {timeout: 3000},
      );

      // The first callback page boots and posts after the poll already submitted its code.
      await postCallback('c1', 's1');

      expect(mockSignUp).toHaveBeenCalledTimes(3);
      expect(popup.close).not.toHaveBeenCalled();
    });

    it('stops listening for the popup when unmounted', async () => {
      const removeListener: MockInstance<typeof window.removeEventListener> = vi.spyOn(window, 'removeEventListener');
      await startSocialSignUp();
      const handler = addListener.mock.calls.filter(([type]) => type === 'message').pop()?.[1];

      cleanup();

      expect(removeListener).toHaveBeenCalledWith('message', handler);
      removeListener.mockRestore();
    });

    it('closes the popup and reports an error when the chained REDIRECTION cannot be followed', async () => {
      const onError = vi.fn();
      await startSocialSignUp({onError});

      // A REDIRECTION without a redirectURL has nowhere to send the popup.
      mockSignUp.mockResolvedValueOnce({executionId: 'exec-1', flowStatus: 'INCOMPLETE', type: 'REDIRECTION'});
      await postCallback('c1', 's1');

      expect(popup.close).toHaveBeenCalledTimes(1);
      expect(navigations).toEqual([]);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({message: 'Could not continue the sign-up in the pop-up window. Please try again.'}),
      );
    });
  });
});
