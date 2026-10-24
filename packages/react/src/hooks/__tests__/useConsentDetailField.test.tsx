// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {act, renderHook} from '@testing-library/react';
import {type ConsentDetailRow} from '@thunderid/browser';
import {useState} from 'react';
import {describe, expect, it} from 'vitest';
import isConsentApprovalBlocked from '../../utils/isConsentApprovalBlocked';
import useConsentDetailField, {type UseConsentDetailFieldResult} from '../useConsentDetailField';

const amount: ConsentDetailRow = {as: 'number', label: 'Amount', modification: 'decrease', path: 'amount', value: 35};
const toDate: ConsentDetailRow = {as: 'date', label: 'To', modification: 'decrease', path: 'to', value: '2026-09-30'};
const actions: ConsentDetailRow = {
  label: 'Actions',
  modification: 'removeItems',
  path: 'actions',
  value: ['initiate', 'status'],
};
const excluded: ConsentDetailRow = {
  label: 'Excluded',
  modification: 'addItems',
  options: ['gambling', 'crypto'],
  path: 'excluded',
  value: ['gambling'],
};

const limit: ConsentDetailRow = {as: 'number', label: 'Limit', modification: 'increase', path: 'limit', value: 10};
const fromDate: ConsentDetailRow = {
  as: 'date',
  label: 'From',
  modification: 'increase',
  path: 'from',
  value: '2026-09-01',
};
const blocked: ConsentDetailRow = {label: 'Blocked', modification: 'addItems', path: 'blocked', value: ['x']};

const AMOUNT_KEY = '__consent_modified__authorization_details:app1__d-1__amount';
const AMOUNT_INVALID_KEY = '__consent_invalid__authorization_details:app1__d-1__amount';

/**
 * Runs the hook against form values kept in state, as a sign-in form keeps them.
 */
const renderField = (
  row: ConsentDetailRow,
  initialFormValues: Record<string, string> = {},
): {current: () => UseConsentDetailFieldResult & {formValues: Record<string, string>}} => {
  const {result} = renderHook(() => {
    const [formValues, setFormValues] = useState<Record<string, string>>(initialFormValues);
    const field: UseConsentDetailFieldResult = useConsentDetailField({
      detailId: 'd-1',
      formValues,
      onInputChange: (name: string, value: string): void =>
        setFormValues((prev: Record<string, string>) => ({...prev, [name]: value})),
      purposeId: 'authorization_details:app1',
      row,
    });
    return {...field, formValues};
  });

  return {current: () => result.current};
};

describe('useConsentDetailField', () => {
  it('does not keep a partial value once the typed number goes past the bound', () => {
    const field = renderField(amount);

    act(() => field.current().handleChange('5'));
    expect(field.current().formValues[AMOUNT_KEY]).toBe('5');
    act(() => field.current().handleChange('50'));

    expect(field.current().text).toBe('50');
    expect(field.current().isValid).toBe(false);
    expect(field.current().error).toEqual({
      key: 'consent.authorization_details.number_max',
      message: 'Enter 35 or less.',
      params: {value: '35'},
    });
    expect(field.current().formValues[AMOUNT_KEY]).toBe('');
    expect(field.current().formValues[AMOUNT_INVALID_KEY]).toBe('true');
  });

  it('writes a typed number within the bound', () => {
    const field = renderField(amount);

    act(() => field.current().handleChange('20'));

    expect(field.current().isValid).toBe(true);
    expect(field.current().error).toBeUndefined();
    expect(field.current().formValues[AMOUNT_KEY]).toBe('20');
    expect(field.current().formValues[AMOUNT_INVALID_KEY]).toBe('');
    expect(field.current().max).toBe('35');
  });

  it('marks a pasted out-of-range number invalid and blocks approval', () => {
    const field = renderField(amount);
    const purposes = [
      {
        essential: [],
        optional: [{detailType: 'payment_initiation', name: 'd-1', rows: [amount]}],
        purposeId: 'authorization_details:app1',
        type: 'authorization_details' as const,
      },
    ];

    act(() => field.current().handleChange('50'));
    expect(isConsentApprovalBlocked(purposes, field.current().formValues)).toBe(true);

    act(() => field.current().handleChange('30'));
    expect(isConsentApprovalBlocked(purposes, field.current().formValues)).toBe(false);
  });

  it('returns a cleared field to the shown value on blur', () => {
    const field = renderField(amount);

    act(() => field.current().handleChange('20'));
    act(() => field.current().handleChange(''));
    expect(field.current().isValid).toBe(false);
    act(() => field.current().handleBlur());

    expect(field.current().text).toBe('35');
    expect(field.current().isValid).toBe(true);
    expect(field.current().formValues[AMOUNT_KEY]).toBe('');
    expect(field.current().formValues[AMOUNT_INVALID_KEY]).toBe('');
  });

  it('bounds a date by the value that was shown', () => {
    const field = renderField(toDate);

    act(() => field.current().handleChange('2026-10-15'));
    expect(field.current().error?.message).toBe('Choose 2026-09-30 or earlier.');
    expect(field.current().formValues['__consent_modified__authorization_details:app1__d-1__to']).toBe('');

    act(() => field.current().handleChange('2026-08-31'));
    expect(field.current().isValid).toBe(true);
    expect(field.current().formValues['__consent_modified__authorization_details:app1__d-1__to']).toBe('"2026-08-31"');
  });

  it('toggles list items within what the rule allows', () => {
    const field = renderField(actions);

    expect(field.current().kind).toBe('removeItems');
    act(() => field.current().handleToggle('status'));
    expect(field.current().isSelected('status')).toBe(false);
    expect(field.current().isToggleable('initiate')).toBe(false);
    act(() => field.current().handleToggle('initiate'));
    expect(field.current().formValues['__consent_modified__authorization_details:app1__d-1__actions']).toBe(
      '["initiate"]',
    );
    act(() => field.current().handleToggle('status'));
    expect(field.current().isSelected('status')).toBe(true);
  });

  it('adds an offered item and takes it out again, keeping the shown items', () => {
    const field = renderField(excluded);

    expect(field.current().isToggleable('gambling')).toBe(false);
    act(() => field.current().handleToggle('crypto'));
    expect(field.current().isSelected('crypto')).toBe(true);
    expect(field.current().formValues['__consent_modified__authorization_details:app1__d-1__excluded']).toBe(
      '["gambling","crypto"]',
    );
    act(() => field.current().handleToggle('crypto'));
    expect(field.current().formValues['__consent_modified__authorization_details:app1__d-1__excluded']).toBe(
      '["gambling"]',
    );
  });

  it('tells how much of a long list to show and expands it on request', () => {
    const regions = renderField({
      label: 'Regions',
      path: 'regions',
      value: Array.from({length: 10}, (_: unknown, index: number) => `region-${index}`),
    });

    expect(regions.current().isPlainList).toBe(true);
    expect(regions.current().listDisplay).toEqual({hiddenCount: 2, isCollapsible: true, visibleCount: 8});
    act(() => regions.current().handleListToggle(true));
    expect(regions.current().isListExpanded).toBe(true);
    expect(regions.current().listDisplay).toEqual({hiddenCount: 0, isCollapsible: true, visibleCount: 10});
  });

  it('hides nothing of a short list or a field that is not a list', () => {
    expect(renderField(excluded).current().listDisplay).toEqual({
      hiddenCount: 0,
      isCollapsible: false,
      visibleCount: 2,
    });
    expect(renderField(amount).current().isPlainList).toBe(false);
    expect(renderField(amount).current().listDisplay.isCollapsible).toBe(false);
  });

  it('tells the input each modifiable field takes', () => {
    expect(renderField(amount).current().kind).toBe('number');
    expect(renderField(toDate).current().kind).toBe('date');
    expect(renderField(actions).current().kind).toBe('removeItems');
    expect(renderField(excluded).current().kind).toBe('addItems');
  });

  it('leaves a read-only field, a date and time, and a one-item removable list without input', () => {
    expect(renderField({label: 'Pay to', path: 'creditor', value: 'Merchant A'}).current().kind).toBeUndefined();
    expect(
      renderField({
        as: 'dateTime',
        label: 'At',
        modification: 'decrease',
        path: 'at',
        value: '2026-09-30T10:00:00Z',
      }).current().kind,
    ).toBeUndefined();
    expect(renderField({...actions, value: ['initiate']}).current().kind).toBeUndefined();
  });

  it('shows the chosen value, or the shown value when there is none', () => {
    expect(renderField(amount, {[AMOUNT_KEY]: '20'}).current().text).toBe('20');
    expect(renderField(amount, {[AMOUNT_KEY]: ''}).current().text).toBe('35');
    expect(renderField(amount, {[AMOUNT_KEY]: 'not json'}).current().text).toBe('35');
    expect(
      renderField(toDate, {'__consent_modified__authorization_details:app1__d-1__to': '"2026-08-31"'}).current().text,
    ).toBe('2026-08-31');
  });

  it('accepts a number within the bound, the shown value included', () => {
    const decreasable = renderField(amount);
    ['20', '35', '20.5'].forEach((text: string) => {
      act(() => decreasable.current().handleChange(text));
      expect(decreasable.current().error).toBeUndefined();
    });

    const increasable = renderField(limit);
    act(() => increasable.current().handleChange('11'));
    expect(increasable.current().error).toBeUndefined();
  });

  it('rejects a number past the bound in the direction the field may not move', () => {
    const decreasable = renderField(amount);
    act(() => decreasable.current().handleChange('50'));
    expect(decreasable.current().error?.key).toBe('consent.authorization_details.number_max');

    const increasable = renderField(limit);
    act(() => increasable.current().handleChange('9'));
    expect(increasable.current().error?.key).toBe('consent.authorization_details.number_min');
  });

  it('rejects text that is not a number', () => {
    const field = renderField(amount);
    ['', '  ', 'abc', 'Infinity'].forEach((text: string) => {
      act(() => field.current().handleChange(text));
      expect(field.current().error?.key).toBe('consent.authorization_details.invalid_number');
    });
  });

  it('accepts a date within the bound and rejects one past it', () => {
    const decreasable = renderField(toDate);
    act(() => decreasable.current().handleChange('2026-08-31'));
    expect(decreasable.current().error).toBeUndefined();
    act(() => decreasable.current().handleChange('2026-10-01'));
    expect(decreasable.current().error?.key).toBe('consent.authorization_details.date_max');
    expect(decreasable.current().error?.params).toEqual({value: '2026-09-30'});

    const increasable = renderField(fromDate);
    act(() => increasable.current().handleChange('2026-09-15'));
    expect(increasable.current().error).toBeUndefined();
    act(() => increasable.current().handleChange('2026-08-31'));
    expect(increasable.current().error?.key).toBe('consent.authorization_details.date_min');
  });

  it('rejects text that is not a date', () => {
    const field = renderField(toDate);
    ['', '2026-9-1', '2026-13-45'].forEach((text: string) => {
      act(() => field.current().handleChange(text));
      expect(field.current().error?.key).toBe('consent.authorization_details.invalid_date');
    });
  });

  it('removes an item, adds it back, and keeps the last one', () => {
    const field = renderField(actions);
    const actionsKey = '__consent_modified__authorization_details:app1__d-1__actions';

    act(() => field.current().handleToggle('status'));
    expect(field.current().formValues[actionsKey]).toBe('["initiate"]');
    expect(field.current().items).toEqual([
      {origin: 'shown', selected: true, toggleable: false, value: 'initiate'},
      {origin: 'shown', selected: false, toggleable: true, value: 'status'},
    ]);
    act(() => field.current().handleToggle('initiate'));
    expect(field.current().formValues[actionsKey]).toBe('["initiate"]');
    act(() => field.current().handleToggle('status'));
    expect(field.current().formValues[actionsKey]).toBe('["initiate","status"]');
  });

  it('keeps shown items, adds an offered one, and lists it as added', () => {
    const field = renderField(excluded);
    const excludedKey = '__consent_modified__authorization_details:app1__d-1__excluded';

    act(() => field.current().handleToggle('gambling'));
    expect(field.current().formValues[excludedKey]).toBeUndefined();
    act(() => field.current().handleToggle('crypto'));
    expect(field.current().items).toEqual([
      {origin: 'shown', selected: true, toggleable: false, value: 'gambling'},
      {origin: 'added', selected: true, toggleable: true, value: 'crypto'},
    ]);
  });

  it('adds a typed value once, as a number when the list holds numbers', () => {
    const typed = renderField(blocked);
    let added = false;
    act(() => {
      added = typed.current().handleAdd(' y ');
    });
    expect(added).toBe(true);
    expect(typed.current().formValues['__consent_modified__authorization_details:app1__d-1__blocked']).toBe(
      '["x","y"]',
    );
    expect(renderField(blocked).current().handleAdd('x')).toBe(false);
    expect(renderField(blocked).current().handleAdd('  ')).toBe(false);
    expect(renderField(excluded).current().handleAdd('travel')).toBe(false);

    const codes = renderField({label: 'Codes', modification: 'addItems', path: 'codes', value: [1]});
    expect(codes.current().handleAdd('two')).toBe(false);
    act(() => {
      added = codes.current().handleAdd('2');
    });
    expect(added).toBe(true);
    expect(codes.current().formValues['__consent_modified__authorization_details:app1__d-1__codes']).toBe('[1,2]');
  });
});
