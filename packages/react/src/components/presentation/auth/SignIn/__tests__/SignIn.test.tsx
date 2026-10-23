// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {type ConsentDecisions, ThunderIDRuntimeError} from '@thunderid/browser';
import {afterEach, beforeEach, describe, expect, it, vi, Mock} from 'vitest';
import I18nProvider from '../../../../../contexts/I18n/I18nProvider';
import ThemeProvider from '../../../../../contexts/Theme/ThemeProvider';
import ThunderIDContext, {ThunderIDContextProps} from '../../../../../contexts/ThunderID/ThunderIDContext';
import SignIn from '../SignIn';

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
