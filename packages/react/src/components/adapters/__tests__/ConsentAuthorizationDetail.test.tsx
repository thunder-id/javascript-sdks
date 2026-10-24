// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {fireEvent, render} from '@testing-library/react';
import {createTheme, type PromptElement} from '@thunderid/browser';
import {describe, expect, it, vi} from 'vitest';
import ThemeContext, {type ThemeContextValue} from '../../../contexts/Theme/ThemeContext';
import ConsentAuthorizationDetail, {type ConsentAuthorizationDetailRenderProps} from '../ConsentAuthorizationDetail';

const themeContextValue: ThemeContextValue = {
  colorScheme: 'light',
  direction: 'ltr',
  theme: createTheme(),
  toggleTheme: vi.fn(),
};

const PURPOSE_ID = 'authorization_details:app-1';
const APPROVAL_KEY = '__consent_opt__authorization_details:app-1__d-1';

const payment: PromptElement = {
  detailType: 'payment_initiation',
  name: 'd-1',
  rows: [
    {as: 'number', label: 'Amount', modification: 'decrease', path: 'amount', value: 35},
    {label: 'Pay to', path: 'creditorName', value: 'Merchant A'},
  ],
  summary: 'Pay 35 EUR to Merchant A',
};

const renderDetail = (
  element: PromptElement,
  formValues: Record<string, string>,
  children?: (props: ConsentAuthorizationDetailRenderProps) => null,
): {container: HTMLElement; onInputChange: ReturnType<typeof vi.fn>} => {
  const onInputChange = vi.fn();
  const {container} = render(
    <ThemeContext.Provider value={themeContextValue}>
      <ConsentAuthorizationDetail
        purposeId={PURPOSE_ID}
        element={element}
        formValues={formValues}
        onInputChange={onInputChange}
      >
        {children}
      </ConsentAuthorizationDetail>
    </ThemeContext.Provider>,
  );

  return {container, onInputChange};
};

describe('ConsentAuthorizationDetail', () => {
  it('hands a render-prop child the detail and its approval', () => {
    const child = vi.fn<(props: ConsentAuthorizationDetailRenderProps) => null>(() => null);
    const {onInputChange} = renderDetail(payment, {}, child);
    const props: ConsentAuthorizationDetailRenderProps = child.mock.calls[0][0];

    expect(props).toMatchObject({
      detailType: 'payment_initiation',
      element: payment,
      isApproved: true,
      rows: payment.rows,
      summary: 'Pay 35 EUR to Merchant A',
    });

    props.handleChange(false);
    expect(onInputChange).toHaveBeenCalledWith(APPROVAL_KEY, 'false');
  });

  it('counts a detail as approved until the user declines it', () => {
    const child = vi.fn<(props: ConsentAuthorizationDetailRenderProps) => null>(() => null);
    renderDetail(payment, {[APPROVAL_KEY]: 'false'}, child);

    expect(child.mock.calls[0][0].isApproved).toBe(false);
  });

  it('falls back to the detail type, then the identifier, when there is no summary', () => {
    const child = vi.fn<(props: ConsentAuthorizationDetailRenderProps) => null>(() => null);
    renderDetail({detailType: 'payment_initiation', name: 'd-1'}, {}, child);
    renderDetail({name: 'd-1'}, {}, child);

    expect(child.mock.calls[0][0].summary).toBe('payment_initiation');
    expect(child.mock.calls[1][0].summary).toBe('d-1');
    expect(child.mock.calls[1][0].rows).toEqual([]);
  });

  it('renders the summary, the fields and an approve toggle by default', () => {
    const {container, onInputChange} = renderDetail(payment, {});
    const toggle = document.getElementById(`consent_opt_${PURPOSE_ID}_d-1`) as HTMLInputElement;

    expect(
      container.querySelector('#consent_authz_detail_authorization_details\\:app-1_d-1_summary')!.textContent,
    ).toBe('Pay 35 EUR to Merchant A');
    expect(container.querySelector('#consent_modify_authorization_details\\:app-1_d-1_amount')).not.toBeNull();
    expect(container.textContent).toContain('Merchant A');
    expect(container.textContent).toContain('Approve');
    expect(toggle.checked).toBe(true);

    fireEvent.click(toggle);
    expect(onInputChange).toHaveBeenCalledWith(APPROVAL_KEY, 'false');
  });

  it('marks the detail and its rows with vendor classes', () => {
    const {container} = renderDetail(payment, {});

    expect(container.querySelector('.thunderid-consent-authorization-detail')).not.toBeNull();
    expect(container.querySelector('.thunderid-consent-authorization-detail__summary')).not.toBeNull();
    expect(container.querySelectorAll('.thunderid-consent-authorization-detail__row')).toHaveLength(2);
    expect(container.querySelectorAll('.thunderid-consent-authorization-detail__label')).toHaveLength(2);
  });
});
