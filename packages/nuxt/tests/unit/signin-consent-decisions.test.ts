// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/typedef, @typescript-eslint/no-explicit-any */

import {describe, it, expect, vi, beforeEach} from 'vitest';
import {nextTick, ref} from 'vue';

// ── Module mocks ──────────────────────────────────────────────────────────────

const signIn = vi.fn();
const consentPrompt = {
  purposes: [
    {
      essential: [{name: 'email'}],
      optional: [{name: 'phone'}],
      purposeId: 'p1',
      purposeName: 'Profile',
      type: 'attributes',
    },
    {
      essential: [],
      optional: [
        {
          detailType: 'payment_initiation',
          name: 'd-1',
          rows: [{as: 'number', label: 'Amount', modification: 'decrease', path: 'instructedAmount.amount', value: 35}],
        },
        {detailType: 'payment_initiation', name: 'd-2', rows: []},
      ],
      purposeId: 'authorization_details:app1',
      purposeName: 'authorization_details:app1',
      type: 'authorization_details',
    },
  ],
};
const components = [
  {eventType: 'SUBMIT', id: 'allow', type: 'ACTION', variant: 'PRIMARY'},
  {eventType: 'SUBMIT', id: 'deny', type: 'ACTION', variant: 'SECONDARY'},
];

// The Vue layer is stubbed; the consent helpers come from @thunderid/browser, so the test runs the helpers SignIn
// really uses.
vi.mock('@thunderid/vue', () => ({
  BaseSignIn: {name: 'BaseSignIn'},
  extractErrorMessage: vi.fn((error: unknown) => String(error)),
  handlePasskeyAuthentication: vi.fn(),
  handlePasskeyRegistration: vi.fn(),
  initiateOAuthRedirect: vi.fn(),
  normalizeFlowResponse: vi.fn(() => ({additionalData: {consentPrompt}, components, executionId: 'exec-1'})),
  useFlowMeta: vi.fn(() => ({meta: ref(null)})),
  useI18n: vi.fn(() => ({t: (key: string) => key})),
  useOAuthCallback: vi.fn(),
}));

vi.mock('#imports', () => ({
  useThunderID: vi.fn(() => ({
    afterSignInUrl: undefined,
    applicationId: 'app1',
    getStorageManager: () => undefined,
    isInitialized: ref(true),
    isLoading: ref(false),
    scopes: undefined,
    signIn,
    vendor: 'thunderid',
  })),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import SignIn, {type SignInRenderProps} from '../../src/runtime/components/auth/SignIn';

/**
 * Sets the SignIn container up on the consent step and returns its render props.
 */
const setUpOnConsentStep = async (): Promise<SignInRenderProps> => {
  let renderProps: SignInRenderProps | undefined;
  const render = (SignIn as any).setup(
    {className: '', size: 'medium', variant: 'outlined'},
    {
      attrs: {},
      emit: vi.fn(),
      slots: {
        default: (props: SignInRenderProps) => {
          renderProps = props;
          return [];
        },
      },
    },
  );
  await nextTick();
  await Promise.resolve();
  render();

  return renderProps!;
};

const submittedInputs = (): Record<string, string> => signIn.mock.calls[1][0].inputs as Record<string, string>;
const submittedDecisions = (): any => JSON.parse(submittedInputs()['consent_decisions']);

describe('SignIn consent decisions', () => {
  beforeEach(() => {
    signIn.mockReset();
    signIn.mockResolvedValueOnce({executionId: 'exec-1', flowStatus: 'INCOMPLETE'});
    signIn.mockResolvedValueOnce({executionId: 'exec-1', flowStatus: 'INCOMPLETE'});
  });

  it('approves only the authorization details the user approved and sends their modified values', async () => {
    const {onSubmit} = await setUpOnConsentStep();

    await onSubmit({
      action: 'allow',
      inputs: {
        '__consent_invalid__authorization_details:app1__d-1__instructedAmount.amount': '',
        '__consent_modified__authorization_details:app1__d-1__instructedAmount.amount': '20',
        '__consent_opt__authorization_details:app1__d-1': 'true',
        __consent_opt__p1__phone: 'true',
      },
    });

    expect(Object.keys(submittedInputs())).toEqual(['consent_decisions']);
    expect(submittedDecisions()).toEqual({
      approved: true,
      purposes: [
        {
          approved: true,
          elements: [
            {approved: true, name: 'email'},
            {approved: true, name: 'phone'},
          ],
          purposeName: 'Profile',
        },
        {
          approved: true,
          elements: [
            {approved: true, modified: {'instructedAmount.amount': 20}, name: 'd-1'},
            {approved: false, name: 'd-2'},
          ],
          purposeName: 'authorization_details:app1',
        },
      ],
    });
  });

  it('does not approve an authorization detail by default', async () => {
    const {onSubmit} = await setUpOnConsentStep();

    await onSubmit({
      action: 'allow',
      inputs: {'__consent_modified__authorization_details:app1__d-1__instructedAmount.amount': '20'},
    });

    expect(submittedDecisions().purposes[1].elements).toEqual([
      {approved: false, name: 'd-1'},
      {approved: false, name: 'd-2'},
    ]);
  });

  it('denies everything on the deny action', async () => {
    const {onSubmit} = await setUpOnConsentStep();

    await onSubmit({action: 'deny', inputs: {'__consent_opt__authorization_details:app1__d-1': 'true'}});

    expect(submittedDecisions().approved).toBe(false);
    expect(submittedDecisions().reason).toBe('user_denied');
    expect(submittedDecisions().purposes[1].elements).toEqual([
      {approved: false, name: 'd-1'},
      {approved: false, name: 'd-2'},
    ]);
    expect(Object.keys(submittedInputs())).toEqual(['consent_decisions']);
  });
});
