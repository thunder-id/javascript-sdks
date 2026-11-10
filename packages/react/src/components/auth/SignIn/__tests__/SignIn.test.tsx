// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {
  CONSENT_VALIDITY_PERIOD_KEY,
  type ConsentDecisions,
  I18nPreferences,
  ThunderIDAPIError,
  ThunderIDRuntimeError,
} from '@thunderid/browser';
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
      <button
        type="button"
        id="choose-validity"
        onClick={(): void =>
          setValues((prev: Record<string, string>) => ({...prev, [CONSENT_VALIDITY_PERIOD_KEY]: '3600'}))
        }
      >
        Choose validity
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

  it('sends the validity period the user chose and removes its form key', async () => {
    const {container, signIn} = await renderRenderPropsOnConsentStep();

    fireEvent.click(container.querySelector('#choose-validity')!);
    fireEvent.click(container.querySelector('#allow')!);
    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(2));

    const inputs: Record<string, string> = submittedInputs(signIn);
    const decisions: ConsentDecisions = JSON.parse(inputs['consent_decisions']) as ConsentDecisions;

    expect(decisions.validityPeriod).toBe(3600);
    expect(Object.keys(inputs)).toEqual(['consent_decisions']);
  });

  it('sends no validity period when the user chose none', async () => {
    const {container, signIn} = await renderRenderPropsOnConsentStep();

    fireEvent.click(container.querySelector('#allow')!);
    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(2));

    const decisions: ConsentDecisions = JSON.parse(submittedInputs(signIn)['consent_decisions']) as ConsentDecisions;

    expect(decisions).not.toHaveProperty('validityPeriod');
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
