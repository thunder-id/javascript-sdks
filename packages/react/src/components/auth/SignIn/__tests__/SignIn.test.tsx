// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {type ConsentDecisions, I18nPreferences, ThunderIDAPIError, ThunderIDRuntimeError} from '@thunderid/browser';
import {ReactElement, ReactNode, useState} from 'react';
import {afterEach, beforeEach, describe, expect, it, vi, Mock} from 'vitest';
import I18nProvider from '../../../../contexts/I18n/I18nProvider';
import ThemeProvider from '../../../../contexts/Theme/ThemeProvider';
import ThunderIDContext, {ThunderIDContextProps} from '../../../../contexts/ThunderID/ThunderIDContext';
import useTranslation from '../../../../hooks/useTranslation';
import Consent from '../../flow/Consent';
import SignIn, {type SignInRenderProps} from '../SignIn';

const mockSignIn = vi.fn() as Mock;

const thunderIDContext: ThunderIDContextProps = {
  applicationId: undefined,
  getStorageManager: vi.fn(() =>
    Promise.resolve({
      getTemporaryData: vi.fn(() => Promise.resolve({})),
      removeHybridDataParameter: vi.fn(),
      removeTemporaryDataParameter: vi.fn(),
      setHybridDataParameter: vi.fn(),
      setTemporaryDataParameter: vi.fn(),
    }),
  ),
  isInitialized: true,
  isLoading: false,
  signIn: mockSignIn,
  vendor: 'thunderid',
} as unknown as ThunderIDContextProps;

describe('SignIn without an application', () => {
  const unhandled: unknown[] = [];
  const onUnhandledRejection = (event: PromiseRejectionEvent): void => {
    unhandled.push(event.reason);
    event.preventDefault();
  };

  beforeEach(() => {
    vi.clearAllMocks();
    unhandled.length = 0;
    sessionStorage.clear();
    window.history.replaceState({}, '', '/signin');
    window.addEventListener('unhandledrejection', onUnhandledRejection);
  });

  afterEach(() => {
    cleanup();
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
  });

  it('reports the missing applicationId through onError only', async () => {
    const onError = vi.fn();

    render(
      <ThunderIDContext.Provider value={thunderIDContext}>
        <I18nProvider>
          <ThemeProvider>
            <SignIn onError={onError} />
          </ThemeProvider>
        </I18nProvider>
      </ThunderIDContext.Provider>,
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1);
    });
    expect(onError.mock.calls[0][0]).toBeInstanceOf(ThunderIDRuntimeError);
    expect(mockSignIn).not.toHaveBeenCalled();

    // Give a rejected initialization promise time to surface as an unhandled rejection.
    await new Promise((resolve: (value: unknown) => void) => {
      setTimeout(resolve, 50);
    });
    expect(unhandled).toEqual([]);
  });

  it('passes the ThunderIDRuntimeError to the render prop with its code', async () => {
    const onError: Mock<(error: Error) => void> = vi.fn();
    const renderChild: Mock<(props: SignInRenderProps) => null> = vi.fn(() => null);

    render(
      <ThunderIDContext.Provider value={thunderIDContext}>
        <I18nProvider>
          <ThemeProvider>
            <SignIn onError={onError}>{renderChild}</SignIn>
          </ThemeProvider>
        </I18nProvider>
      </ThunderIDContext.Provider>,
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1);
    });
    const error: Error | null | undefined = renderChild.mock.lastCall?.[0].error;
    expect(error).toBeInstanceOf(ThunderIDRuntimeError);
    expect((error as ThunderIDRuntimeError).code).toBe('SIGN_IN_ERROR');
    expect(error).toBe(onError.mock.calls[0][0]);
  });
});

describe('SignIn error banner on a language change', () => {
  const i18nPreferences: I18nPreferences = {
    bundles: {
      'en-US': {
        translations: {
          'errors.signin.session.expired': 'Your session has expired.',
          'errors.signin.timeout': 'The step has expired.',
          invalid_individual_id: 'Invalid individual ID',
        },
      },
      'fr-FR': {
        translations: {
          'errors.signin.session.expired': 'Votre session a expiré.',
          'errors.signin.timeout': "L'étape a expiré.",
          invalid_individual_id: 'Identifiant individuel invalide',
        },
      },
    },
    language: 'en-US',
    storageStrategy: 'none',
    urlParam: false,
  } as unknown as I18nPreferences;

  // A step with a single action that submits without client-side validation.
  const step = (additionalData: Record<string, unknown> = {}): Record<string, unknown> => ({
    data: {
      additionalData,
      meta: {components: [{eventType: 'TRIGGER', id: 'action_continue', label: 'Continue', type: 'ACTION'}]},
    },
    executionId: 'exec-1',
    flowStatus: 'INCOMPLETE',
    type: 'VIEW',
  });

  const LanguageSwitcher = (): ReactElement => {
    const {setLanguage} = useTranslation();
    return <button type="button" data-testid="switch-to-french" onClick={() => setLanguage('fr-FR')} />;
  };

  const renderSignIn = (
    props: {children?: (renderProps: SignInRenderProps) => ReactNode; onError?: Mock} = {},
    context: Partial<ThunderIDContextProps> = {applicationId: 'app-1'},
  ): void => {
    render(
      <ThunderIDContext.Provider value={{...thunderIDContext, ...context}}>
        <I18nProvider preferences={i18nPreferences}>
          <ThemeProvider>
            <LanguageSwitcher />
            <SignIn {...props} />
          </ThemeProvider>
        </I18nProvider>
      </ThunderIDContext.Provider>,
    );
  };

  const switchToFrench = (): void => {
    fireEvent.click(screen.getByTestId('switch-to-french'));
  };

  const banner = (): string | null => screen.queryByRole('alert')?.textContent ?? null;

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    window.history.replaceState({}, '', '/signin');
  });

  afterEach(() => {
    cleanup();
  });

  it('translates a server error banner again when the language changes', async () => {
    mockSignIn.mockResolvedValueOnce(step());
    renderSignIn();

    const button: HTMLButtonElement = await screen.findByTestId('thunderid-signin-submit');
    mockSignIn.mockResolvedValueOnce({
      error: {
        code: 'invalid_individual_id',
        description: {defaultValue: 'The individual ID is not registered.', key: 'invalid_individual_id_description'},
        message: {defaultValue: 'Invalid individual ID', key: 'invalid_individual_id'},
      },
      executionId: 'exec-1',
      flowStatus: 'ERROR',
    });
    fireEvent.click(button);

    await waitFor(() => {
      expect(banner()).toBe('Invalid individual ID');
    });

    switchToFrench();

    await waitFor(() => {
      expect(banner()).toBe('Identifiant individuel invalide');
    });
  });

  it('translates the step timeout banner again when the language changes', async () => {
    mockSignIn.mockResolvedValueOnce(step({stepTimeout: Date.now() + 100}));
    renderSignIn();

    await waitFor(() => {
      expect(banner()).toBe('The step has expired.');
    });

    switchToFrench();

    await waitFor(() => {
      expect(banner()).toBe("L'étape a expiré.");
    });
  });

  it('translates the session expired error again and keeps its code', async () => {
    sessionStorage.setItem('thunderid_execution_id', 'stale-exec');
    mockSignIn.mockRejectedValueOnce(new ThunderIDAPIError('Invalid executionId', 'FLOW_ERROR', 'react', 400, 'Bad'));
    const renderChild: Mock<(props: SignInRenderProps) => null> = vi.fn(() => null);
    renderSignIn({children: renderChild}, {applicationId: undefined});

    const lastError = (): Error | null => renderChild.mock.lastCall?.[0].error ?? null;

    await waitFor(() => {
      expect(lastError()?.message).toBe('Your session has expired.');
    });
    expect((lastError() as ThunderIDRuntimeError).code).toBe('SIGN_IN_ERROR');

    switchToFrench();

    await waitFor(() => {
      expect(lastError()?.message).toBe('Votre session a expiré.');
    });
    expect((lastError() as ThunderIDRuntimeError).code).toBe('SIGN_IN_ERROR');
  });
});

describe('SignIn flow expiry', () => {
  // A fragment of this page, so a redirect in a test never navigates the test page away.
  const appUrl = (): string => `${window.location.origin}${window.location.pathname}#app`;

  // `expiresIn` is in seconds, so 0.1 expires the step 100 ms after the response.
  const step = (expiresIn?: number): Record<string, unknown> => ({
    data: {
      meta: {components: [{eventType: 'TRIGGER', id: 'action_continue', label: 'Continue', type: 'ACTION'}]},
    },
    executionId: 'exec-1',
    ...(expiresIn !== undefined ? {expiresIn} : {}),
    flowStatus: 'INCOMPLETE',
    type: 'VIEW',
  });

  const expiredError = (): ThunderIDAPIError =>
    new ThunderIDAPIError(
      JSON.stringify({code: 'FES-1004', message: {defaultValue: 'Invalid request', key: 'error.invalid_request'}}),
      'executeEmbeddedSignInFlow-ResponseError-100',
      'javascript',
      400,
      'Bad Request',
    );

  const renderSignIn = (
    renderChild?: Mock<(props: SignInRenderProps) => ReactNode>,
    props: {afterFlowExpiredUrl?: string; onError?: Mock} = {},
    context: Partial<ThunderIDContextProps> = {applicationId: 'app-1'},
  ): void => {
    render(
      <ThunderIDContext.Provider value={{...thunderIDContext, ...context}}>
        <I18nProvider>
          <ThemeProvider>
            <SignIn {...props}>{renderChild}</SignIn>
          </ThemeProvider>
        </I18nProvider>
      </ThunderIDContext.Provider>,
    );
  };

  const lastProps = (renderChild: Mock<(props: SignInRenderProps) => ReactNode>): SignInRenderProps | undefined =>
    renderChild.mock.lastCall?.[0];

  const submittingChild = (): Mock<(props: SignInRenderProps) => ReactNode> =>
    vi.fn((props: SignInRenderProps) => (
      <button type="button" data-testid="submit" onClick={() => void props.onSubmit({action: 'action_continue'})} />
    ));

  const setUserPresent = (present: boolean): void => {
    vi.spyOn(document, 'hasFocus').mockReturnValue(present);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignIn.mockReset();
    sessionStorage.clear();
    window.history.replaceState({}, '', '/signin');
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.history.replaceState({}, '', '/signin');
  });

  it('is not expired while the flow is active', async () => {
    mockSignIn.mockResolvedValueOnce(step(60));
    const renderChild: Mock<(props: SignInRenderProps) => ReactNode> = vi.fn(() => null);
    renderSignIn(renderChild);

    await waitFor(() => {
      expect(lastProps(renderChild)?.components.length).toBeGreaterThan(0);
    });
    expect(lastProps(renderChild)?.isFlowExpired).toBe(false);
    expect(lastProps(renderChild)?.flowExpiryRedirect).toBeNull();
  });

  it('starts an expired flow again once the user is on the page, says so, and raises no error', async () => {
    setUserPresent(true);
    const onError: Mock = vi.fn();
    mockSignIn.mockResolvedValueOnce(step(0.1)).mockResolvedValueOnce(step(60));
    const renderChild: Mock<(props: SignInRenderProps) => ReactNode> = vi.fn(() => null);
    renderSignIn(renderChild, {onError});

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledTimes(2);
    });
    expect(mockSignIn).toHaveBeenLastCalledWith(expect.objectContaining({applicationId: 'app-1'}));
    await waitFor(() => {
      expect(lastProps(renderChild)?.isFlowRestarted).toBe(true);
    });
    expect(lastProps(renderChild)?.isFlowExpired).toBe(false);
    expect(onError).not.toHaveBeenCalled();
  });

  it('waits for the user before starting an expired flow again', async () => {
    setUserPresent(false);
    mockSignIn.mockResolvedValueOnce(step(0.1)).mockResolvedValueOnce(step(60));
    const renderChild: Mock<(props: SignInRenderProps) => ReactNode> = vi.fn(() => null);
    renderSignIn(renderChild);

    await waitFor(() => {
      expect(lastProps(renderChild)?.isFlowExpired).toBe(true);
    });
    expect(mockSignIn).toHaveBeenCalledTimes(1);

    window.dispatchEvent(new Event('focus'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledTimes(2);
    });
  });

  it('starts a resumed execution the server refused again, for the application from the URL', async () => {
    setUserPresent(true);
    window.history.replaceState({}, '', '/signin?executionId=stale-exec&applicationId=app-from-url');
    mockSignIn.mockRejectedValueOnce(expiredError()).mockResolvedValueOnce(step(60));
    const renderChild: Mock<(props: SignInRenderProps) => ReactNode> = vi.fn(() => null);
    renderSignIn(renderChild, {}, {applicationId: undefined});

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledTimes(2);
    });
    expect(mockSignIn.mock.calls[0][0]).toMatchObject({executionId: 'stale-exec'});
    expect(mockSignIn.mock.calls[1][0]).toMatchObject({applicationId: 'app-from-url'});
    expect(mockSignIn.mock.calls[1][0]).not.toHaveProperty('executionId');
    await waitFor(() => {
      expect(lastProps(renderChild)?.components.length).toBeGreaterThan(0);
    });
    expect(lastProps(renderChild)?.isFlowRestarted).toBe(true);
  });

  it('does not start a sign-in an authorize request started again, and tells the user to go back', async () => {
    setUserPresent(true);
    window.history.replaceState({}, '', '/signin?executionId=exec-1&authId=auth-1&applicationId=app-1');
    mockSignIn.mockResolvedValueOnce(step(0.1));
    renderSignIn(undefined, {}, {applicationId: undefined});

    expect(await screen.findByRole('heading', {name: 'Session expired'})).toBeInTheDocument();
    expect(screen.getByText('Please go back to the application and try again.')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Start again'})).not.toBeInTheDocument();
    expect(mockSignIn).toHaveBeenCalledTimes(1);
  });

  it('counts down to the application with afterFlowExpiredUrl instead of starting again', async () => {
    setUserPresent(false);
    mockSignIn.mockResolvedValueOnce(step(0.1));
    const renderChild: Mock<(props: SignInRenderProps) => ReactNode> = vi.fn(() => null);
    renderSignIn(renderChild, {afterFlowExpiredUrl: appUrl()});

    await waitFor(() => {
      expect(lastProps(renderChild)?.isFlowExpired).toBe(true);
    });
    expect(lastProps(renderChild)?.flowExpiryRedirect).toMatchObject({
      countdownSeconds: 10,
      isCountingDown: false,
      secondsLeft: 10,
      url: appUrl(),
    });

    window.dispatchEvent(new Event('focus'));

    await waitFor(() => {
      expect(lastProps(renderChild)?.flowExpiryRedirect?.isCountingDown).toBe(true);
    });
    expect(mockSignIn).toHaveBeenCalledTimes(1);
  });

  it('expires when the server refuses a submission as expired', async () => {
    mockSignIn.mockResolvedValueOnce(step());
    const renderChild = submittingChild();
    renderSignIn(renderChild, {afterFlowExpiredUrl: appUrl()});

    const button: HTMLElement = await screen.findByTestId('submit');
    await waitFor(() => {
      expect(lastProps(renderChild)?.components.length).toBeGreaterThan(0);
    });
    mockSignIn.mockRejectedValueOnce(expiredError());
    fireEvent.click(button);

    await waitFor(() => {
      expect(lastProps(renderChild)?.isFlowExpired).toBe(true);
    });
    expect(lastProps(renderChild)?.error?.message).toBe(
      'Your session has expired. Please return to the application and sign in again.',
    );
  });

  it('shows the countdown in the default UI with afterFlowExpiredUrl', async () => {
    setUserPresent(false);
    mockSignIn.mockResolvedValueOnce(step(0.1));
    renderSignIn(undefined, {afterFlowExpiredUrl: appUrl()});

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

  it('starts again in the default UI and tells the user', async () => {
    setUserPresent(true);
    mockSignIn.mockResolvedValueOnce(step(0.1)).mockResolvedValueOnce(step(60));
    renderSignIn();

    expect(await screen.findByText('Your session expired, so we started again.')).toBeInTheDocument();
    expect(await screen.findByTestId('thunderid-signin-submit')).toBeInTheDocument();
  });

  it('keeps the expired error when a flow already expired is refused again', async () => {
    setUserPresent(false);
    mockSignIn.mockResolvedValueOnce(step(0.1));
    const renderChild = submittingChild();
    renderSignIn(renderChild, {afterFlowExpiredUrl: appUrl()});

    await waitFor(() => {
      expect(lastProps(renderChild)?.isFlowExpired).toBe(true);
    });
    mockSignIn.mockRejectedValueOnce(expiredError());
    fireEvent.click(screen.getByTestId('submit'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(lastProps(renderChild)?.error?.message).toBe(
        'Your session has expired. Please return to the application and sign in again.',
      );
    });
    expect(lastProps(renderChild)?.isFlowExpired).toBe(true);
  });

  it('starts a stored execution the server refused as expired again, and says so', async () => {
    setUserPresent(true);
    sessionStorage.setItem('thunderid_execution_id', 'stale-exec');
    mockSignIn.mockRejectedValueOnce(expiredError()).mockResolvedValueOnce(step(60));
    const renderChild: Mock<(props: SignInRenderProps) => ReactNode> = vi.fn(() => null);
    renderSignIn(renderChild);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledTimes(2);
    });
    expect(mockSignIn.mock.calls[0][0]).toMatchObject({executionId: 'stale-exec'});
    expect(mockSignIn.mock.calls[1][0]).toMatchObject({applicationId: 'app-1'});
    await waitFor(() => {
      expect(lastProps(renderChild)?.isFlowRestarted).toBe(true);
    });
  });

  it('does not expire for another refusal', async () => {
    mockSignIn.mockResolvedValueOnce(step());
    const renderChild = submittingChild();
    renderSignIn(renderChild);

    const button: HTMLElement = await screen.findByTestId('submit');
    await waitFor(() => {
      expect(lastProps(renderChild)?.components.length).toBeGreaterThan(0);
    });
    mockSignIn.mockRejectedValueOnce(new ThunderIDAPIError('Server error', 'FLOW_ERROR', 'react', 500, 'Error'));
    fireEvent.click(button);

    await waitFor(() => {
      expect(lastProps(renderChild)?.error).not.toBeNull();
    });
    expect(lastProps(renderChild)?.isFlowExpired).toBe(false);
  });
});

const consentPrompt = [
  {
    essential: [],
    optional: [
      {
        detailType: 'payment_initiation',
        name: 'd-1',
        rows: [
          {as: 'number', label: 'Amount', modification: 'decrease', path: 'instructedAmount.amount', value: 35},
          {label: 'Pay to', path: 'creditorName', value: 'Merchant A'},
        ],
        summary: 'Pay 35 EUR to Merchant A',
      },
    ],
    purposeId: 'authorization_details:app1',
    purposeName: 'authorization_details:app1',
    type: 'authorization_details',
  },
];

const consentStep = {
  data: {
    additionalData: {consentPrompt: JSON.stringify(consentPrompt)},
    meta: {
      components: [
        {id: 'consent', type: 'CONSENT'},
        {eventType: 'SUBMIT', id: 'allow', label: 'Allow', type: 'ACTION', variant: 'PRIMARY'},
        {eventType: 'SUBMIT', id: 'deny', label: 'Deny', type: 'ACTION', variant: 'SECONDARY'},
      ],
    },
  },
  executionId: 'exec-1',
  flowStatus: 'INCOMPLETE',
  type: 'VIEW',
};

const renderOnConsentStep = async (): Promise<{container: HTMLElement; signIn: ReturnType<typeof vi.fn>}> => {
  const signIn = vi.fn().mockResolvedValueOnce(consentStep).mockResolvedValueOnce(consentStep);
  const thunderIDContext: ThunderIDContextProps = {
    applicationId: 'app1',
    getStorageManager: vi.fn(() => Promise.resolve(undefined)),
    isInitialized: true,
    isLoading: false,
    meta: null,
    signIn,
    vendor: 'thunderid',
  } as unknown as ThunderIDContextProps;

  const {container} = render(
    <ThunderIDContext.Provider value={thunderIDContext}>
      <I18nProvider>
        <ThemeProvider>
          <SignIn />
        </ThemeProvider>
      </I18nProvider>
    </ThunderIDContext.Provider>,
  );
  await waitFor(() =>
    expect(
      container.querySelector('#consent_modify_authorization_details\\:app1_d-1_instructedAmount\\.amount'),
    ).not.toBeNull(),
  );

  return {container, signIn};
};

const submittedInputs = (signIn: ReturnType<typeof vi.fn>): Record<string, string> =>
  (signIn.mock.calls[1][0] as {inputs: Record<string, string>}).inputs;

describe('SignIn consent decisions', () => {
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  it('sends the values the user modified on an approved authorization detail', async () => {
    const {container, signIn} = await renderOnConsentStep();

    fireEvent.change(
      container.querySelector('#consent_modify_authorization_details\\:app1_d-1_instructedAmount\\.amount')!,
      {
        target: {value: '20'},
      },
    );
    fireEvent.click(container.querySelector('#allow')!);
    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(2));

    const inputs: Record<string, string> = submittedInputs(signIn);
    const decisions: ConsentDecisions = JSON.parse(inputs['consent_decisions']) as ConsentDecisions;

    expect(decisions.approved).toBe(true);
    expect(decisions.purposes[0].elements).toEqual([
      {approved: true, modified: {'instructedAmount.amount': 20}, name: 'd-1'},
    ]);
    expect(Object.keys(inputs)).toEqual(['consent_decisions']);
  });

  it('sends no modified values when the user denies', async () => {
    const {container, signIn} = await renderOnConsentStep();

    fireEvent.change(
      container.querySelector('#consent_modify_authorization_details\\:app1_d-1_instructedAmount\\.amount')!,
      {
        target: {value: '20'},
      },
    );
    fireEvent.click(container.querySelector('#deny')!);
    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(2));

    const inputs: Record<string, string> = submittedInputs(signIn);
    const decisions: ConsentDecisions = JSON.parse(inputs['consent_decisions']) as ConsentDecisions;

    expect(decisions).toMatchObject({approved: false, reason: 'user_denied'});
    expect(decisions.purposes[0].elements).toEqual([{approved: false, name: 'd-1'}]);
    expect(Object.keys(inputs)).toEqual(['consent_decisions']);
  });
});

/**
 * A custom consent screen built on the render props: the SDK consent UI with allow and deny buttons that submit
 * through `onSubmit`, which leaves blocking an approval to the container.
 */
const RenderPropsConsent = ({additionalData, onSubmit}: SignInRenderProps): ReactElement | null => {
  const [values, setValues] = useState<Record<string, string>>({});

  if (!additionalData?.['consentPrompt']) {
    return null;
  }

  return (
    <>
      <Consent
        consentData={additionalData['consentPrompt'] as string}
        formValues={values}
        onInputChange={(name: string, value: string): void =>
          setValues((prev: Record<string, string>) => ({...prev, [name]: value}))
        }
      />
      <button type="button" id="allow" onClick={(): void => void onSubmit({action: 'allow', inputs: values})}>
        Allow
      </button>
      <button type="button" id="deny" onClick={(): void => void onSubmit({action: 'deny', inputs: values})}>
        Deny
      </button>
    </>
  );
};

const renderRenderPropsOnConsentStep = async (): Promise<{
  container: HTMLElement;
  signIn: ReturnType<typeof vi.fn>;
}> => {
  const signIn = vi.fn().mockResolvedValueOnce(consentStep).mockResolvedValueOnce(consentStep);
  const thunderIDContext: ThunderIDContextProps = {
    applicationId: 'app1',
    getStorageManager: vi.fn(() => Promise.resolve(undefined)),
    isInitialized: true,
    isLoading: false,
    meta: null,
    signIn,
    vendor: 'thunderid',
  } as unknown as ThunderIDContextProps;

  const {container} = render(
    <ThunderIDContext.Provider value={thunderIDContext}>
      <I18nProvider>
        <ThemeProvider>
          <SignIn>{(props: SignInRenderProps) => <RenderPropsConsent {...props} />}</SignIn>
        </ThemeProvider>
      </I18nProvider>
    </ThunderIDContext.Provider>,
  );
  await waitFor(() =>
    expect(
      container.querySelector('#consent_modify_authorization_details\\:app1_d-1_instructedAmount\\.amount'),
    ).not.toBeNull(),
  );

  return {container, signIn};
};

const changeAmount = (container: HTMLElement, value: string): void => {
  fireEvent.change(
    container.querySelector('#consent_modify_authorization_details\\:app1_d-1_instructedAmount\\.amount')!,
    {target: {value}},
  );
};

describe('SignIn consent approval through render props', () => {
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  it('sends nothing and stays on the step when approving with an invalid authorization detail field', async () => {
    const {container, signIn} = await renderRenderPropsOnConsentStep();

    changeAmount(container, '50');
    fireEvent.click(container.querySelector('#allow')!);
    await new Promise((resolve: (value: unknown) => void) => {
      setTimeout(resolve, 50);
    });

    expect(signIn).toHaveBeenCalledTimes(1);
    expect(
      container.querySelector('#consent_modify_authorization_details\\:app1_d-1_instructedAmount\\.amount'),
    ).not.toBeNull();
  });

  it('still submits a denial with an invalid authorization detail field', async () => {
    const {container, signIn} = await renderRenderPropsOnConsentStep();

    changeAmount(container, '50');
    fireEvent.click(container.querySelector('#deny')!);
    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(2));

    const decisions: ConsentDecisions = JSON.parse(submittedInputs(signIn)['consent_decisions']) as ConsentDecisions;

    expect(decisions).toMatchObject({approved: false, reason: 'user_denied'});
    expect(decisions.purposes[0].elements).toEqual([{approved: false, name: 'd-1'}]);
  });

  it('submits an approval with the modified values when every field is valid', async () => {
    const {container, signIn} = await renderRenderPropsOnConsentStep();

    changeAmount(container, '20');
    fireEvent.click(container.querySelector('#allow')!);
    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(2));

    const decisions: ConsentDecisions = JSON.parse(submittedInputs(signIn)['consent_decisions']) as ConsentDecisions;

    expect(decisions.approved).toBe(true);
    expect(decisions.purposes[0].elements).toEqual([
      {approved: true, modified: {'instructedAmount.amount': 20}, name: 'd-1'},
    ]);
  });
});

describe('SignIn bounded to an organization unit', () => {
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  it('sends ouId on the request that starts the flow, and never on a continuation', async () => {
    const signIn = vi.fn().mockResolvedValueOnce(consentStep).mockResolvedValueOnce(consentStep);
    const context: ThunderIDContextProps = {
      applicationId: 'app1',
      getStorageManager: vi.fn(() => Promise.resolve(undefined)),
      isInitialized: true,
      isLoading: false,
      meta: null,
      signIn,
      vendor: 'thunderid',
    } as unknown as ThunderIDContextProps;

    const {container} = render(
      <ThunderIDContext.Provider value={context}>
        <I18nProvider>
          <ThemeProvider>
            <SignIn organizationUnitId="ou-acme" />
          </ThemeProvider>
        </I18nProvider>
      </ThunderIDContext.Provider>,
    );

    await waitFor(() => expect(container.querySelector('#allow')).not.toBeNull());
    fireEvent.click(container.querySelector('#allow')!);
    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(2));

    expect(signIn.mock.calls[0][0]).toMatchObject({applicationId: 'app1', flowType: 'AUTHENTICATION', ouId: 'ou-acme'});
    expect(signIn.mock.calls[1][0]).not.toHaveProperty('ouId');
  });
});
