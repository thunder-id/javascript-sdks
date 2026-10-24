// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {fireEvent, render} from '@testing-library/react';
import {type ConsentDetailRow, createTheme} from '@thunderid/browser';
import {type ReactElement, useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import ThemeContext, {type ThemeContextValue} from '../../../contexts/Theme/ThemeContext';
import {type UseConsentDetailFieldResult} from '../../../hooks/useConsentDetailField';
import ConsentDetailField from '../ConsentDetailField';

const themeContextValue: ThemeContextValue = {
  colorScheme: 'light',
  direction: 'ltr',
  theme: createTheme(),
  toggleTheme: vi.fn(),
};

const renderField = (
  row: ConsentDetailRow,
  formValues: Record<string, string> = {},
  t?: (key: string, params?: Record<string, string | number>) => string,
): {container: HTMLElement; onInputChange: ReturnType<typeof vi.fn>} => {
  const onInputChange = vi.fn();
  const {container} = render(
    <ThemeContext.Provider value={themeContextValue}>
      <ConsentDetailField
        detailId="d-1"
        purposeId="p1"
        row={row}
        formValues={formValues}
        onInputChange={onInputChange}
        t={t}
      />
    </ThemeContext.Provider>,
  );

  return {container, onInputChange};
};

/**
 * Renders a field whose form values live in state, as they do in a sign-in form, and records every change.
 */
const renderStatefulField = (
  row: ConsentDetailRow,
): {container: HTMLElement; input: HTMLInputElement; values: () => Record<string, string>} => {
  const latest: Record<string, string> = {};
  const Harness = (): ReactElement => {
    const [formValues, setFormValues] = useState<Record<string, string>>({});
    return (
      <ConsentDetailField
        detailId="d-1"
        purposeId="p1"
        row={row}
        formValues={formValues}
        onInputChange={(name: string, value: string): void => {
          latest[name] = value;
          setFormValues((prev: Record<string, string>) => ({...prev, [name]: value}));
        }}
      />
    );
  };
  const {container} = render(
    <ThemeContext.Provider value={themeContextValue}>
      <Harness />
    </ThemeContext.Provider>,
  );

  return {container, input: container.querySelector('input')!, values: (): Record<string, string> => latest};
};

const AMOUNT_KEY = '__consent_modified__p1__d-1__amount';
const AMOUNT_INVALID_KEY = '__consent_invalid__p1__d-1__amount';

describe('ConsentDetailField', () => {
  const amount: ConsentDetailRow = {as: 'number', label: 'Amount', modification: 'decrease', path: 'amount', value: 35};
  const actions: ConsentDetailRow = {
    label: 'Actions',
    modification: 'removeItems',
    path: 'actions',
    value: ['initiate', 'status'],
  };

  it('shows a field the user may not modify as text', () => {
    const {container} = renderField({label: 'Pay to', path: 'creditorName', value: 'Merchant A'});

    expect(container.querySelector('input')).toBeNull();
    expect(container.textContent).toBe('Merchant A');
  });

  it('reports a lower number and marks the field valid', () => {
    const {container, onInputChange} = renderField(amount);
    const input = container.querySelector('input')!;

    fireEvent.change(input, {target: {value: '20'}});

    expect(input.getAttribute('max')).toBe('35');
    expect(onInputChange.mock.calls).toEqual([
      [AMOUNT_INVALID_KEY, ''],
      [AMOUNT_KEY, '20'],
    ]);
  });

  describe('a number the user may decrease', () => {
    it('does not submit a partial value when the typed number goes past the bound', () => {
      const {container, input, values} = renderStatefulField(amount);

      fireEvent.change(input, {target: {value: '5'}});
      expect(values()[AMOUNT_KEY]).toBe('5');

      fireEvent.change(input, {target: {value: '50'}});

      expect(input.value).toBe('50');
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(container.textContent).toContain('Enter 35 or less.');
      expect(values()[AMOUNT_KEY]).toBe('');
      expect(values()[AMOUNT_INVALID_KEY]).toBe('true');
    });

    it('submits a typed number within the bound', () => {
      const {container, input, values} = renderStatefulField(amount);

      fireEvent.change(input, {target: {value: '2'}});
      fireEvent.change(input, {target: {value: '20'}});

      expect(input.value).toBe('20');
      expect(input.getAttribute('aria-invalid')).toBe('false');
      expect(container.textContent).toBe('');
      expect(values()[AMOUNT_KEY]).toBe('20');
      expect(values()[AMOUNT_INVALID_KEY]).toBe('');
    });

    it('shows an error for a pasted number past the bound and does not submit it', () => {
      const {container, input, values} = renderStatefulField(amount);

      fireEvent.change(input, {target: {value: '50'}});

      expect(input.value).toBe('50');
      expect(container.textContent).toContain('Enter 35 or less.');
      expect(values()[AMOUNT_KEY]).toBe('');
      expect(values()[AMOUNT_INVALID_KEY]).toBe('true');
    });

    it('keeps a cleared field empty with an error, and returns it to the shown value on blur', () => {
      const {container, input, values} = renderStatefulField(amount);

      fireEvent.change(input, {target: {value: '20'}});
      fireEvent.change(input, {target: {value: ''}});

      expect(input.value).toBe('');
      expect(container.textContent).toContain('Enter a number.');
      expect(values()[AMOUNT_KEY]).toBe('');
      expect(values()[AMOUNT_INVALID_KEY]).toBe('true');

      fireEvent.blur(input);

      expect(input.value).toBe('35');
      expect(container.textContent).toBe('');
      expect(values()[AMOUNT_KEY]).toBe('');
      expect(values()[AMOUNT_INVALID_KEY]).toBe('');
    });

    it('keeps an out-of-bound value and its error on blur', () => {
      const {container, input, values} = renderStatefulField(amount);

      fireEvent.change(input, {target: {value: '50'}});
      fireEvent.blur(input);

      expect(input.value).toBe('50');
      expect(container.textContent).toContain('Enter 35 or less.');
      expect(values()[AMOUNT_INVALID_KEY]).toBe('true');
    });

    it('clears the error once the user corrects the value', () => {
      const {container, input, values} = renderStatefulField(amount);

      fireEvent.change(input, {target: {value: '50'}});
      fireEvent.change(input, {target: {value: '30'}});
      fireEvent.blur(input);

      expect(input.value).toBe('30');
      expect(container.textContent).toBe('');
      expect(values()[AMOUNT_KEY]).toBe('30');
      expect(values()[AMOUNT_INVALID_KEY]).toBe('');
    });

    it('translates the error', () => {
      const t = vi.fn((key: string, params?: Record<string, string | number>): string =>
        key === 'consent.authorization_details.number_max' ? `max ${params?.['value']}` : key,
      );
      const {container} = renderField(amount, {}, t);

      fireEvent.change(container.querySelector('input')!, {target: {value: '50'}});

      expect(container.textContent).toContain('max 35');
    });
  });

  it('bounds a number the user may increase from below', () => {
    const {container, input, values} = renderStatefulField({...amount, modification: 'increase'});

    fireEvent.change(input, {target: {value: '30'}});

    expect(input.getAttribute('min')).toBe('35');
    expect(container.textContent).toContain('Enter 35 or more.');
    expect(values()[AMOUNT_KEY]).toBe('');
    expect(values()[AMOUNT_INVALID_KEY]).toBe('true');
  });

  it('shows the value the user already chose', () => {
    const {container} = renderField(amount, {'__consent_modified__p1__d-1__amount': '20'});

    expect(container.querySelector('input')!.value).toBe('20');
  });

  it('hands the headless field state to a render-prop child', () => {
    const {container} = render(
      <ThemeContext.Provider value={themeContextValue}>
        <ConsentDetailField detailId="d-1" purposeId="p1" row={amount} formValues={{}} onInputChange={vi.fn()}>
          {(field: UseConsentDetailFieldResult) => (
            <output id="custom" data-kind={field.kind}>
              {field.text}
            </output>
          )}
        </ConsentDetailField>
      </ThemeContext.Provider>,
    );
    const output = container.querySelector<HTMLOutputElement>('#custom')!;

    expect(output.dataset['kind']).toBe('number');
    expect(output.textContent).toBe('35');
  });

  it('removes an item, adds it back, and keeps the last one', () => {
    const {container, onInputChange} = renderField(actions);
    const chips = container.querySelectorAll<HTMLButtonElement>('button');

    fireEvent.click(chips[1]);
    expect(onInputChange).toHaveBeenCalledWith('__consent_modified__p1__d-1__actions', '["initiate"]');

    const single = renderField(actions, {'__consent_modified__p1__d-1__actions': '["initiate"]'});
    const remaining = single.container.querySelectorAll<HTMLButtonElement>('button');

    expect(remaining[0].disabled).toBe(true);
    expect(remaining[1].getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(remaining[1]);
    expect(single.onInputChange).toHaveBeenCalledWith('__consent_modified__p1__d-1__actions', '["initiate","status"]');
  });

  it('labels list chips and the typed-item input from the default bundle', () => {
    const removable = renderField(actions, {'__consent_modified__p1__d-1__actions': '["initiate"]'});
    const offered = renderField({
      label: 'Excluded',
      modification: 'addItems',
      options: ['crypto'],
      path: 'excluded',
      value: ['gambling'],
    });
    const typed = renderField({label: 'Blocked', modification: 'addItems', path: 'blocked', value: ['x']});

    expect(removable.container.querySelector('#consent_modify_p1_d-1_actions_0')!.getAttribute('aria-label')).toBe(
      'initiate, remove',
    );
    expect(removable.container.querySelector('#consent_modify_p1_d-1_actions_1')!.getAttribute('aria-label')).toBe(
      'status, add back',
    );
    expect(
      offered.container.querySelector('#consent_modify_p1_d-1_excluded_offered_crypto')!.getAttribute('aria-label'),
    ).toBe('crypto, add');
    expect(typed.container.querySelector('#consent_modify_p1_d-1_blocked_new')!.getAttribute('aria-label')).toBe(
      'Blocked, add',
    );
  });

  it('labels list chips through the given translator', () => {
    const t = vi.fn((key: string, params?: Record<string, string | number>): string => `${key}:${params?.['item']}`);
    const {container} = renderField(actions, {}, t);

    expect(container.querySelector('#consent_modify_p1_d-1_actions_0')!.getAttribute('aria-label')).toBe(
      'consent.authorization_details.remove_item:initiate',
    );
  });

  it('marks the field and its chips with vendor classes', () => {
    const {container} = renderField(actions, {'__consent_modified__p1__d-1__actions': '["initiate"]'});

    expect(
      container.querySelector('.thunderid-consent-detail-field.thunderid-consent-detail-field__chips'),
    ).not.toBeNull();
    expect(container.querySelectorAll('.thunderid-consent-detail-field__chip--kept')).toHaveLength(1);
    expect(container.querySelectorAll('.thunderid-consent-detail-field__chip--removed')).toHaveLength(1);
  });

  it('bounds a date by the value that was shown', () => {
    const {container, onInputChange} = renderField({
      as: 'date',
      label: 'To',
      modification: 'decrease',
      path: 'toDate',
      value: '2026-09-30',
    });
    const input = container.querySelector('input')!;

    fireEvent.change(input, {target: {value: '2026-08-31'}});

    expect(input.getAttribute('max')).toBe('2026-09-30');
    expect(onInputChange.mock.calls).toEqual([
      ['__consent_invalid__p1__d-1__toDate', ''],
      ['__consent_modified__p1__d-1__toDate', '"2026-08-31"'],
    ]);
  });

  it('shows an error for a date past the bound and does not submit it', () => {
    const {container, input, values} = renderStatefulField({
      as: 'date',
      label: 'To',
      modification: 'decrease',
      path: 'toDate',
      value: '2026-09-30',
    });

    fireEvent.change(input, {target: {value: '2026-08-31'}});
    fireEvent.change(input, {target: {value: '2026-10-15'}});

    expect(input.value).toBe('2026-10-15');
    expect(container.textContent).toContain('Choose 2026-09-30 or earlier.');
    expect(values()['__consent_modified__p1__d-1__toDate']).toBe('');
    expect(values()['__consent_invalid__p1__d-1__toDate']).toBe('true');
  });

  it('offers the allowed values to add, keeps the shown items, and takes an added item out again', () => {
    const excluded: ConsentDetailRow = {
      label: 'Excluded',
      modification: 'addItems',
      options: ['gambling', 'crypto', 'travel'],
      path: 'excluded',
      value: ['gambling'],
    };
    const {container, onInputChange} = renderField(excluded);

    expect(container.querySelector('#consent_modify_p1_d-1_excluded_0')!.tagName).toBe('SPAN');
    expect(container.querySelector('#consent_modify_p1_d-1_excluded_offered_gambling')).toBeNull();
    fireEvent.click(container.querySelector('#consent_modify_p1_d-1_excluded_offered_crypto')!);
    expect(onInputChange).toHaveBeenCalledWith('__consent_modified__p1__d-1__excluded', '["gambling","crypto"]');

    const withAdded = renderField(excluded, {'__consent_modified__p1__d-1__excluded': '["gambling","crypto"]'});
    expect(withAdded.container.querySelector('#consent_modify_p1_d-1_excluded_offered_crypto')).toBeNull();
    fireEvent.click(withAdded.container.querySelector('#consent_modify_p1_d-1_excluded_added_crypto')!);
    expect(withAdded.onInputChange).toHaveBeenCalledWith('__consent_modified__p1__d-1__excluded', '["gambling"]');
  });

  it('adds a typed value when the list allows any value', () => {
    const {container, onInputChange} = renderField({
      label: 'Blocked',
      modification: 'addItems',
      path: 'blocked',
      value: ['x'],
    });
    const input = container.querySelector<HTMLInputElement>('#consent_modify_p1_d-1_blocked_new')!;

    fireEvent.change(input, {target: {value: ' y '}});
    fireEvent.keyDown(input, {key: 'Enter'});
    fireEvent.change(input, {target: {value: 'x'}});
    fireEvent.keyDown(input, {key: 'Enter'});

    expect(onInputChange).toHaveBeenCalledTimes(1);
    expect(onInputChange).toHaveBeenCalledWith('__consent_modified__p1__d-1__blocked', '["x","y"]');
  });

  describe('large content', () => {
    const items = (count: number): string[] =>
      Array.from({length: count}, (_: unknown, index: number) => `item-${index}`);
    const toggleOf = (container: HTMLElement): HTMLButtonElement =>
      container.querySelector<HTMLButtonElement>('button[aria-expanded]')!;

    it('clamps a long value behind a toggle labelled from the default bundle', () => {
      const note: string = 'word '.repeat(60).trim();
      const {container} = renderField({label: 'Note', path: 'note', value: note});

      expect(container.textContent).toContain(note);
      expect(toggleOf(container).textContent).toBe('Show more');
      expect(toggleOf(container).getAttribute('aria-expanded')).toBe('false');

      fireEvent.click(toggleOf(container));
      expect(toggleOf(container).textContent).toBe('Show less');
      expect(toggleOf(container).getAttribute('aria-expanded')).toBe('true');
    });

    it('labels the toggle through the given translator', () => {
      const t = vi.fn(
        (key: string, params?: Record<string, string | number>): string => `${key}:${params?.['count'] ?? ''}`,
      );
      const {container} = renderField({label: 'Regions', path: 'regions', value: items(10)}, {}, t);

      expect(toggleOf(container).textContent).toBe('consent.authorization_details.more_items:2');
    });

    it('shows the first items of a long read-only list and the rest on request', () => {
      const {container} = renderField({label: 'Regions', path: 'regions', value: items(20)});

      expect(container.textContent).toContain(items(8).join(', '));
      expect(container.textContent).not.toContain('item-8');
      expect(toggleOf(container).textContent).toBe('+12 more');

      fireEvent.click(toggleOf(container));
      expect(container.textContent).toContain(items(20).join(', '));
    });

    it('collapses a long list of removable chips and keeps the hidden ones reachable', () => {
      const {container, onInputChange} = renderField({
        label: 'Stores',
        modification: 'removeItems',
        path: 'stores',
        value: items(12),
      });

      expect(container.querySelector('#consent_modify_p1_d-1_stores_7')).not.toBeNull();
      expect(container.querySelector('#consent_modify_p1_d-1_stores_8')).toBeNull();

      fireEvent.click(toggleOf(container));
      fireEvent.click(container.querySelector('#consent_modify_p1_d-1_stores_11')!);
      expect(onInputChange).toHaveBeenCalledWith('__consent_modified__p1__d-1__stores', JSON.stringify(items(11)));
    });

    it('cuts a long chip short and keeps its full value as a tooltip', () => {
      const iban = 'DE89370400440532013000DE89370400440532013000DE89370400440532013000';
      const {container} = render(
        <ThemeContext.Provider value={themeContextValue}>
          <div style={{width: '200px'}}>
            <ConsentDetailField
              align="start"
              detailId="d-1"
              purposeId="p1"
              row={{label: 'Accounts', modification: 'removeItems', path: 'accounts', value: [iban, 'x']}}
              formValues={{}}
              onInputChange={vi.fn()}
            />
          </div>
        </ThemeContext.Provider>,
      );
      const chip = container.querySelector<HTMLButtonElement>('#consent_modify_p1_d-1_accounts_0')!;

      expect(chip.getAttribute('title')).toBe(iban);
      expect(chip.getBoundingClientRect().width).toBeLessThanOrEqual(200);
    });

    it('shows structured JSON as an indented block', () => {
      const {container} = renderField({label: 'Account', path: 'account', value: {iban: 'DE02'}});

      expect(container.textContent).toBe('{\n  "iban": "DE02"\n}');
    });
  });
});
