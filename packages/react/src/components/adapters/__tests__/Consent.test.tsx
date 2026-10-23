// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {render} from '@testing-library/react';
import {createTheme} from '@thunderid/browser';
import {describe, expect, it, vi} from 'vitest';
import ThemeContext, {type ThemeContextValue} from '../../../contexts/Theme/ThemeContext';
import Consent from '../Consent';

const themeContextValue: ThemeContextValue = {
  colorScheme: 'light',
  direction: 'ltr',
  theme: createTheme(),
  toggleTheme: vi.fn(),
};

const iban = 'DE89370400440532013000DE89370400440532013000DE89370400440532013000';

const renderConsent = (summary: string, rows: object[]): HTMLElement =>
  render(
    <ThemeContext.Provider value={themeContextValue}>
      <div style={{width: '280px'}}>
        <Consent
          consentData={[
            {
              essential: [],
              optional: [{detailType: 'payment_initiation', name: 'd-1', rows, summary}],
              purposeId: 'authorization_details:app-1',
              purposeName: 'authorization_details:app-1',
              type: 'authorization_details',
            } as never,
          ]}
          formValues={{}}
          onInputChange={vi.fn()}
        />
      </div>
    </ThemeContext.Provider>,
  ).container;

describe('Consent authorization details', () => {
  it('clamps a long summary behind a toggle that controls it', () => {
    const summary = `Pay ${'a very long description '.repeat(10)}`.trim();
    const container: HTMLElement = renderConsent(summary, []);
    const toggle: HTMLButtonElement = container.querySelector('button[aria-expanded]')!;

    expect(
      container.querySelector('#consent_authz_detail_authorization_details\\:app-1_d-1_summary')!.textContent,
    ).toBe(summary);
    expect(toggle.getAttribute('aria-controls')).toBe('consent_authz_detail_authorization_details:app-1_d-1_summary');
    expect(toggle.textContent).toBe('Show more');
  });

  it('keeps long content inside a narrow screen and stacks a long field below its label', () => {
    const container: HTMLElement = renderConsent(`Pay to ${iban}`, [
      {label: 'Pay to', path: 'creditorName', value: 'Merchant A'},
      {label: 'Account', path: 'account', value: `${iban}X`},
      {label: 'Accounts', modification: 'removeItems', path: 'accounts', value: [iban, 'x']},
      {label: 'Schedule', path: 'schedule', value: [{date: '2026-11-01', memo: iban}]},
    ]);
    const root = container.firstElementChild as HTMLElement;
    const top = (text: string): number =>
      Array.from(container.querySelectorAll('p, h6, span, div'))
        .find((element: Element) => element.textContent === text && element.children.length === 0)!
        .getBoundingClientRect().top;

    expect(root.scrollWidth).toBeLessThanOrEqual(280);
    expect(top('Merchant A')).toBe(top('Pay to'));
    expect(top(`${iban}X`)).toBeGreaterThan(top('Account'));
  });

  it('tells a render-prop child when approval is blocked by an invalid field', () => {
    const purposes = [
      {
        essential: [],
        optional: [
          {
            detailType: 'payment_initiation',
            name: 'd-1',
            rows: [{label: 'Amount', modification: 'decrease', path: 'amount', value: 35}],
          },
        ],
        purposeId: 'authorization_details:app-1',
        purposeName: 'authorization_details:app-1',
        type: 'authorization_details',
      } as never,
    ];
    const seen: boolean[] = [];
    const renderWith = (formValues: Record<string, string>): void => {
      render(
        <Consent consentData={purposes} formValues={formValues} onInputChange={vi.fn()}>
          {({isApprovalBlocked}) => {
            seen.push(isApprovalBlocked);
            return null;
          }}
        </Consent>,
      );
    };

    renderWith({'__consent_invalid__authorization_details:app-1__d-1__amount': 'true'});
    renderWith({'__consent_invalid__authorization_details:app-1__d-1__amount': ''});

    expect(seen).toEqual([true, false]);
  });

  it('reads the prompt from the JSON text the server sends', () => {
    const onInputChange = vi.fn();
    render(
      <ThemeContext.Provider value={themeContextValue}>
        <Consent
          consentData={JSON.stringify([
            {
              essential: [],
              optional: [{detailType: 'payment_initiation', name: 'd-1', rows: [], summary: 'Pay'}],
              purposeId: 'authorization_details:app-1',
              purposeName: 'authorization_details:app-1',
              type: 'authorization_details',
            },
          ])}
          formValues={{}}
          onInputChange={onInputChange}
        />
      </ThemeContext.Provider>,
    );

    expect(onInputChange).toHaveBeenCalledWith('__consent_opt__authorization_details:app-1__d-1', 'true');
  });
});
