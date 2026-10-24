// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {type ConsentPurposeData, getConsentInvalidKey} from '@thunderid/browser';
import {describe, expect, it} from 'vitest';
import {getConsentOptionalKey} from '../../components/adapters/ConsentCheckboxList';
import isConsentApprovalBlocked from '../isConsentApprovalBlocked';

const PURPOSE_ID = 'authorization_details:app1';
const AMOUNT_INVALID_KEY = `__consent_invalid__${PURPOSE_ID}__d-1__amount`;

describe('isConsentApprovalBlocked', (): void => {
  const purposes: ConsentPurposeData[] = [
    {
      essential: [],
      optional: [
        {
          detailType: 'payment_initiation',
          name: 'd-1',
          rows: [{as: 'number', label: 'Amount', modification: 'decrease', path: 'amount', value: 35}],
        },
      ],
      purposeId: PURPOSE_ID,
      type: 'authorization_details',
    },
  ];
  const approvedKey: string = getConsentOptionalKey(PURPOSE_ID, 'd-1');

  it('should block approval while an approved detail has an invalid field', (): void => {
    expect(isConsentApprovalBlocked(purposes, {[AMOUNT_INVALID_KEY]: 'true', [approvedKey]: 'true'})).toBe(true);
    expect(isConsentApprovalBlocked(purposes, {[AMOUNT_INVALID_KEY]: 'true'})).toBe(true);
  });

  it('should allow approval once the field is valid or its detail is declined', (): void => {
    expect(isConsentApprovalBlocked(purposes, {[AMOUNT_INVALID_KEY]: '', [approvedKey]: 'true'})).toBe(false);
    expect(isConsentApprovalBlocked(purposes, {[AMOUNT_INVALID_KEY]: 'true', [approvedKey]: 'false'})).toBe(false);
  });

  describe('for one authorization detail element', (): void => {
    const detailPurposes: ConsentPurposeData[] = [
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
          },
          {name: 'email'},
        ],
        purposeId: 'p1',
        type: 'authorization_details',
      },
    ];

    it('should block on a modifiable field marked invalid', (): void => {
      expect(
        isConsentApprovalBlocked(detailPurposes, {
          [getConsentInvalidKey('p1', 'd-1', 'instructedAmount.amount')]: 'true',
        }),
      ).toBe(true);
    });

    it('should not block on a field whose marker was cleared, or a field of another detail or purpose', (): void => {
      expect(
        isConsentApprovalBlocked(detailPurposes, {
          [getConsentInvalidKey('p1', 'd-1', 'instructedAmount.amount')]: '',
        }),
      ).toBe(false);
      expect(
        isConsentApprovalBlocked(detailPurposes, {
          [getConsentInvalidKey('p1', 'd-2', 'instructedAmount.amount')]: 'true',
        }),
      ).toBe(false);
      expect(
        isConsentApprovalBlocked(detailPurposes, {
          [getConsentInvalidKey('p2', 'd-1', 'instructedAmount.amount')]: 'true',
        }),
      ).toBe(false);
    });

    it('should ignore a read-only field and an element without fields', (): void => {
      expect(
        isConsentApprovalBlocked(detailPurposes, {[getConsentInvalidKey('p1', 'd-1', 'creditorName')]: 'true'}),
      ).toBe(false);
      expect(isConsentApprovalBlocked(detailPurposes, {[getConsentInvalidKey('p1', 'email', 'email')]: 'true'})).toBe(
        false,
      );
    });
  });
});
