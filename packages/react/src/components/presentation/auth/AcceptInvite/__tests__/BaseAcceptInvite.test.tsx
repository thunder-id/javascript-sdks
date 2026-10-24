// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, fireEvent, render, waitFor} from '@testing-library/react';
import {type ConsentDecisions} from '@thunderid/browser';
import {afterEach, describe, expect, it, vi} from 'vitest';
import I18nProvider from '../../../../../contexts/I18n/I18nProvider';
import ThemeProvider from '../../../../../contexts/Theme/ThemeProvider';
import ThunderIDContext, {ThunderIDContextProps} from '../../../../../contexts/ThunderID/ThunderIDContext';
import Consent from '../../../../adapters/Consent';
import BaseAcceptInvite, {type BaseAcceptInviteRenderProps} from '../BaseAcceptInvite';

const consentPrompt = [
  {
    essential: [],
    optional: [
      {
        detailType: 'payment_initiation',
        name: 'd-1',
        rows: [{as: 'number', label: 'Amount', modification: 'decrease', path: 'instructedAmount.amount', value: 35}],
        summary: 'Pay 35 EUR',
      },
    ],
    purposeId: 'authorization_details:app1',
    purposeName: 'authorization_details:app1',
    type: 'authorization_details',
  },
];

const allow = {eventType: 'SUBMIT', id: 'allow', type: 'ACTION', variant: 'PRIMARY'};
const deny = {eventType: 'SUBMIT', id: 'deny', type: 'ACTION', variant: 'SECONDARY'};

const consentStep = {
  data: {
    additionalData: {consentPrompt: JSON.stringify(consentPrompt)},
    meta: {components: [{id: 'consent', type: 'CONSENT'}, allow, deny]},
  },
  executionId: 'exec-1',
  flowStatus: 'INCOMPLETE',
  type: 'VIEW',
};

const thunderIDContext: ThunderIDContextProps = {
  getStorageManager: vi.fn(() => Promise.resolve(undefined)),
  isInitialized: true,
  meta: null,
  vendor: 'thunderid',
} as unknown as ThunderIDContextProps;

/**
 * Renders the accept invite flow on its consent step, with the SDK consent UI and an allow and a deny button
 * that submit through the container.
 */
const renderOnConsentStep = async (): Promise<{container: HTMLElement; onSubmit: ReturnType<typeof vi.fn>}> => {
  const onSubmit = vi.fn().mockResolvedValueOnce(consentStep).mockResolvedValueOnce(consentStep);
  const {container} = render(
    <ThunderIDContext.Provider value={thunderIDContext}>
      <I18nProvider>
        <ThemeProvider>
          <BaseAcceptInvite executionId="exec-1" inviteToken="token-1" onSubmit={onSubmit}>
            {({additionalData, handleInputChange, handleSubmit, values}: BaseAcceptInviteRenderProps) => (
              <>
                <Consent
                  consentData={additionalData['consentPrompt'] as string}
                  formValues={values}
                  onInputChange={handleInputChange}
                />
                <button type="button" id="allow" onClick={(): void => void handleSubmit(allow)}>
                  Allow
                </button>
                <button type="button" id="deny" onClick={(): void => void handleSubmit(deny)}>
                  Deny
                </button>
              </>
            )}
          </BaseAcceptInvite>
        </ThemeProvider>
      </I18nProvider>
    </ThunderIDContext.Provider>,
  );
  await waitFor(() =>
    expect(
      container.querySelector('#consent_modify_authorization_details\\:app1_d-1_instructedAmount\\.amount'),
    ).not.toBeNull(),
  );

  return {container, onSubmit};
};

const submittedInputs = (onSubmit: ReturnType<typeof vi.fn>): Record<string, string> =>
  (onSubmit.mock.calls[1][0] as {inputs: Record<string, string>}).inputs;

describe('BaseAcceptInvite consent decisions', () => {
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  it('sends the values the user modified on an approved authorization detail', async () => {
    const {container, onSubmit} = await renderOnConsentStep();

    fireEvent.change(
      container.querySelector('#consent_modify_authorization_details\\:app1_d-1_instructedAmount\\.amount')!,
      {
        target: {value: '20'},
      },
    );
    fireEvent.click(container.querySelector('#allow')!);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));

    const inputs: Record<string, string> = submittedInputs(onSubmit);
    const decisions: ConsentDecisions = JSON.parse(inputs['consent_decisions']) as ConsentDecisions;

    expect(decisions.approved).toBe(true);
    expect(decisions.purposes[0].elements).toEqual([
      {approved: true, modified: {'instructedAmount.amount': 20}, name: 'd-1'},
    ]);
    expect(Object.keys(inputs).filter((key: string) => key.startsWith('__consent_'))).toEqual([]);
  });

  it('denies the detail without its modified values on the deny action', async () => {
    const {container, onSubmit} = await renderOnConsentStep();

    fireEvent.change(
      container.querySelector('#consent_modify_authorization_details\\:app1_d-1_instructedAmount\\.amount')!,
      {
        target: {value: '20'},
      },
    );
    fireEvent.click(container.querySelector('#deny')!);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2));

    const decisions: ConsentDecisions = JSON.parse(submittedInputs(onSubmit)['consent_decisions']) as ConsentDecisions;

    expect(decisions).toMatchObject({approved: false, reason: 'user_denied'});
    expect(decisions.purposes[0].elements).toEqual([{approved: false, name: 'd-1'}]);
  });
});
