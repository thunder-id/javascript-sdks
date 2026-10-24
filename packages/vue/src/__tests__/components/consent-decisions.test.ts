// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  type ConsentDecisions,
  type EmbeddedFlowComponent,
  EmbeddedFlowComponentType,
  EmbeddedFlowEventType,
} from '@thunderid/browser';
import {flushPromises, mount, VueWrapper} from '@vue/test-utils';
import {describe, expect, it, vi, type Mock} from 'vitest';
import {defineComponent, h, ref, type VNode} from 'vue';
import {renderSignInComponents} from '../../components/auth/sign-in/AuthOptionFactory';
import SignIn from '../../components/auth/sign-in/SignIn';
import {FLOW_META_KEY, I18N_KEY, THUNDERID_KEY} from '../../keys';

const PURPOSE_ID = 'authorization_details:app1';
const MODIFIED_KEY = `__consent_modified__${PURPOSE_ID}__d-1__instructedAmount.amount`;
const INVALID_KEY = `__consent_invalid__${PURPOSE_ID}__d-1__instructedAmount.amount`;
const APPROVED_KEY = `__consent_opt__${PURPOSE_ID}__d-1`;

const consentAction = (variant: string): EmbeddedFlowComponent =>
  ({
    eventType: EmbeddedFlowEventType.Submit,
    id: `action_${variant}`,
    label: variant,
    type: EmbeddedFlowComponentType.Action,
    variant,
  }) as unknown as EmbeddedFlowComponent;

const detailPurpose: Record<string, unknown> = {
  essential: [],
  optional: [
    {
      detailType: 'payment_initiation',
      name: 'd-1',
      rows: [{as: 'number', label: 'Amount', modification: 'decrease', path: 'instructedAmount.amount', value: 35}],
    },
  ],
  purposeId: PURPOSE_ID,
  purposeName: PURPOSE_ID,
  type: 'authorization_details',
};

const attributePurpose: Record<string, unknown> = {
  essential: [{name: 'email'}],
  optional: [{name: 'phone'}],
  purposeId: 'p1',
  purposeName: 'Profile',
  type: 'attributes',
};

describe('AuthOptionFactory consent decisions', () => {
  const submit = (variant: string, formValues: Record<string, string>): Record<string, string> => {
    const onSubmit: Mock = vi.fn();
    const elements: VNode[] = renderSignInComponents(
      [consentAction(variant)],
      formValues,
      {},
      {},
      false,
      true,
      () => undefined,
      () => undefined,
      {additionalData: {consentPrompt: {purposes: [detailPurpose]}}, onSubmit},
    );
    const wrapper: VueWrapper = mount(defineComponent({render: (): VNode => h('div', elements)}));
    (wrapper.find('button').element as HTMLButtonElement).click();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    return onSubmit.mock.calls[0][1] as Record<string, string>;
  };

  it('carries the modified values of an approved authorization detail', () => {
    const submitted: Record<string, string> = submit('PRIMARY', {
      [`consent_${PURPOSE_ID}_d-1`]: 'true',
      [MODIFIED_KEY]: '20',
    });
    const decisions: ConsentDecisions = JSON.parse(submitted['consent_decisions']) as ConsentDecisions;

    expect(decisions.purposes[0].elements).toEqual([
      {approved: true, modified: {'instructedAmount.amount': 20}, name: 'd-1'},
    ]);
  });

  it('leaves an authorization detail unapproved, without modified values, when the form holds no approval', () => {
    const submitted: Record<string, string> = submit('PRIMARY', {[MODIFIED_KEY]: '20'});
    const decisions: ConsentDecisions = JSON.parse(submitted['consent_decisions']) as ConsentDecisions;

    expect(decisions.purposes[0].elements).toEqual([{approved: false, name: 'd-1'}]);
  });
});

describe('SignIn consent decisions', () => {
  const consentStep: Record<string, unknown> = {
    data: {
      additionalData: {consentPrompt: JSON.stringify([attributePurpose, detailPurpose])},
      meta: {
        components: [
          {eventType: 'SUBMIT', id: 'allow', label: 'Allow', type: 'ACTION', variant: 'PRIMARY'},
          {eventType: 'SUBMIT', id: 'deny', label: 'Deny', type: 'ACTION', variant: 'SECONDARY'},
        ],
      },
    },
    executionId: 'exec-1',
    flowStatus: 'INCOMPLETE',
    type: 'VIEW',
  };

  const submit = async (action: string, inputs: Record<string, string>): Promise<Record<string, string>> => {
    const signIn: Mock = vi.fn().mockResolvedValue(consentStep);
    const isInitialized = ref(false);
    let onSubmit: ((payload: Record<string, unknown>) => Promise<void>) | undefined;

    mount(SignIn, {
      global: {
        provide: {
          [THUNDERID_KEY as symbol]: {
            applicationId: 'app1',
            getStorageManager: () => null,
            isInitialized,
            isLoading: ref(false),
            signIn,
            vendor: 'thunderid',
          },
          [FLOW_META_KEY as symbol]: {meta: ref(null)},
          [I18N_KEY as symbol]: {currentLanguage: ref('en-US'), t: (key: string): string => key},
        },
      },
      slots: {
        default: (props: {onSubmit: (payload: Record<string, unknown>) => Promise<void>}): VNode[] => {
          onSubmit = props.onSubmit;
          return [];
        },
      },
    });
    isInitialized.value = true;
    await flushPromises();
    await onSubmit!({action, inputs});
    await flushPromises();

    expect(signIn).toHaveBeenCalledTimes(2);
    return (signIn.mock.calls[1][0] as {inputs: Record<string, string>}).inputs;
  };

  it('sends the values the user modified on an approved authorization detail, and no consent form keys', async () => {
    const inputs: Record<string, string> = await submit('allow', {
      [APPROVED_KEY]: 'true',
      [INVALID_KEY]: '',
      [MODIFIED_KEY]: '20',
      __consent_opt__p1__phone: 'true',
    });
    const decisions: ConsentDecisions = JSON.parse(inputs['consent_decisions']) as ConsentDecisions;

    expect(decisions.purposes[0].elements).toEqual([
      {approved: true, name: 'email'},
      {approved: true, name: 'phone'},
    ]);
    expect(decisions.purposes[1].elements).toEqual([
      {approved: true, modified: {'instructedAmount.amount': 20}, name: 'd-1'},
    ]);
    expect(Object.keys(inputs)).toEqual(['consent_decisions']);
  });

  it('does not approve an authorization detail the form holds no approval for', async () => {
    const inputs: Record<string, string> = await submit('allow', {[MODIFIED_KEY]: '20'});
    const decisions: ConsentDecisions = JSON.parse(inputs['consent_decisions']) as ConsentDecisions;

    expect(decisions.purposes[1].elements).toEqual([{approved: false, name: 'd-1'}]);
  });

  it('denies every element and sends no modified values on the deny action', async () => {
    const inputs: Record<string, string> = await submit('deny', {[APPROVED_KEY]: 'true', [MODIFIED_KEY]: '20'});
    const decisions: ConsentDecisions = JSON.parse(inputs['consent_decisions']) as ConsentDecisions;

    expect(decisions.approved).toBe(false);
    expect(decisions.reason).toBe('user_denied');
    expect(decisions.purposes[1].elements).toEqual([{approved: false, name: 'd-1'}]);
    expect(Object.keys(inputs)).toEqual(['consent_decisions']);
  });
});
