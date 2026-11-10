// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {fireEvent, render} from '@testing-library/react';
import {createTheme} from '@thunderid/browser';
import {useState} from 'react';
import {describe, expect, it, vi} from 'vitest';
import I18nContext, {type I18nContextValue} from '../../../../contexts/I18n/I18nContext';
import ThemeContext, {type ThemeContextValue} from '../../../../contexts/Theme/ThemeContext';
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

describe('Consent validity period', () => {
  const attributes = [
    {
      essential: [],
      optional: [{name: 'email'}],
      purposeId: 'p1',
      purposeName: 'Profile',
      type: 'attributes',
    } as never,
  ];

  type ConsentProps = React.ComponentProps<typeof Consent>;

  // Keeps the form values the way the sign-in form does, so a change shows in what the field renders.
  const Controlled = ({
    initialValues,
    onChange,
    ...props
  }: Partial<ConsentProps> & {
    initialValues: Record<string, string>;
    onChange: (name: string, value: string) => void;
  }): React.ReactElement => {
    const [values, setValues] = useState<Record<string, string>>(initialValues);

    return (
      <ThemeContext.Provider value={themeContextValue}>
        <Consent
          consentData={attributes}
          formValues={values}
          onInputChange={(name: string, value: string): void => {
            onChange(name, value);
            setValues((previous: Record<string, string>) => ({...previous, [name]: value}));
          }}
          {...props}
        />
      </ThemeContext.Provider>
    );
  };

  const renderValidity = (
    props: Partial<ConsentProps> = {},
    formValues: Record<string, string> = {},
  ): {container: HTMLElement; onInputChange: ReturnType<typeof vi.fn>} => {
    const onInputChange = vi.fn();
    const {container} = render(<Controlled initialValues={formValues} onChange={onInputChange} {...props} />);

    return {container, onInputChange};
  };

  const field = (container: HTMLElement): HTMLSelectElement | null =>
    container.querySelector<HTMLSelectElement>('#consent_validity_period');
  const remember = (container: HTMLElement): HTMLInputElement | null =>
    container.querySelector<HTMLInputElement>('#consent_validity_remember');
  const custom = (container: HTMLElement): HTMLInputElement | null =>
    container.querySelector<HTMLInputElement>('#consent_validity_custom');

  const optionLabels = (container: HTMLElement): string[] =>
    Array.from(field(container)!.options).map((option: HTMLOptionElement) => option.textContent ?? '');

  it('shows nothing unless the server asks for it', () => {
    const {container, onInputChange} = renderValidity();

    expect(remember(container)).toBeNull();
    expect(field(container)).toBeNull();
    expect(custom(container)).toBeNull();
    expect(onInputChange).not.toHaveBeenCalled();
  });

  it('starts with the decision remembered, and lists the periods that fit the limit and a custom one', () => {
    const {container} = renderValidity({maxValidityPeriod: 86400, validityInput: true});

    expect(container.querySelector('label[for="consent_validity_remember"]')!.textContent).toBe('Remember my decision');
    expect(remember(container)!.checked).toBe(true);
    expect(container.querySelector('label[for="consent_validity_period"]')).toBeNull();
    expect(field(container)!.getAttribute('aria-label')).toBe('Ask me again');
    expect(optionLabels(container)).toEqual(['1 minute', '30 minutes', '1 hour', '12 hours', '1 day', 'Custom']);
    expect(container.textContent).toContain('Your consent expires in 1 minute.');
    expect(container.textContent).not.toContain('recommended');
  });

  it('selects the shortest period, and puts it in the form so that what is shown is what is submitted', () => {
    const {container, onInputChange} = renderValidity({maxValidityPeriod: 86400, validityInput: true});

    expect(field(container)!.value).toBe('60');
    expect(onInputChange).toHaveBeenCalledTimes(1);
    expect(onInputChange).toHaveBeenCalledWith('__consent_validity_period__', '60');
  });

  it('keeps a value the form already holds', () => {
    const {container, onInputChange} = renderValidity(
      {maxValidityPeriod: 86400, validityInput: true},
      {__consent_validity_period__: '3600'},
    );

    expect(field(container)!.value).toBe('3600');
    expect(onInputChange).not.toHaveBeenCalled();
  });

  it('adds the limit to the list when fewer than three periods fit', () => {
    const {container} = renderValidity({maxValidityPeriod: 200, validityInput: true});

    expect(optionLabels(container)).toEqual(['1 minute', '3 minutes', 'Custom']);
    expect(field(container)!.value).toBe('60');
  });

  it('rounds the limit down when it is added to the list, and never lets a typed period go above the limit', () => {
    const {container, onInputChange} = renderValidity({maxValidityPeriod: 252, validityInput: true});

    expect(optionLabels(container)).toEqual(['1 minute', '4 minutes', 'Custom']);

    fireEvent.change(field(container)!, {target: {value: '240'}});

    expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '240');

    fireEvent.change(field(container)!, {target: {value: 'custom'}});
    fireEvent.change(container.querySelector<HTMLInputElement>('#consent_validity_custom')!, {target: {value: '9999'}});

    expect(container.textContent).toContain('Enter a whole number, up to 4.');
    expect(container.querySelector<HTMLInputElement>('#consent_validity_custom')!.value).toBe('4');
    expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '240');
  });

  it('does not list the limit when it is not a standard period and enough periods fit', () => {
    const {container} = renderValidity({maxValidityPeriod: 10000, validityInput: true});

    expect(optionLabels(container)).toEqual(['1 minute', '5 minutes', '30 minutes', '1 hour', 'Custom']);
  });

  it('lists no more than five periods, the shortest and the longest that fit and three spread between them', () => {
    const {container} = renderValidity({maxValidityPeriod: 2592000, validityInput: true});

    expect(optionLabels(container)).toEqual(['1 minute', '30 minutes', '6 hours', '1 day', '30 days', 'Custom']);
  });

  it('ends the list with no expiry when there is no limit', () => {
    const {container, onInputChange} = renderValidity({validityInput: true});

    expect(optionLabels(container)).toEqual(['1 minute', '1 hour', '12 hours', '30 days', 'No expiry', 'Custom']);

    fireEvent.change(field(container)!, {target: {value: '2147483647'}});

    expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '2147483647');
    expect(container.textContent).toContain(
      'You will not be asked again unless this application asks for more access.',
    );
  });

  it('treats a limit of the largest 32-bit integer as no limit', () => {
    const {container} = renderValidity({maxValidityPeriod: 2147483647, validityInput: true});

    expect(optionLabels(container)).toContain('No expiry');
  });

  it('reports the short value when the box is unticked', () => {
    const {container, onInputChange} = renderValidity({maxValidityPeriod: 86400, validityInput: true});

    fireEvent.click(remember(container)!);

    expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '1');
  });

  it('shows the note and no list when the decision is not remembered', () => {
    const {container} = renderValidity(
      {maxValidityPeriod: 86400, validityInput: true},
      {__consent_validity_period__: '1'},
    );

    expect(remember(container)!.checked).toBe(false);
    expect(field(container)).toBeNull();
    expect(custom(container)).toBeNull();
    expect(container.textContent).toContain('You will be asked again the next time you sign in.');
  });

  it('reports the shortest period when the box is ticked again', () => {
    const {container, onInputChange} = renderValidity(
      {maxValidityPeriod: 86400, validityInput: true},
      {__consent_validity_period__: '1'},
    );

    fireEvent.click(remember(container)!);

    expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '60');
    expect(field(container)!.value).toBe('60');
  });

  it('reports the seconds of the period chosen under the validity period key', () => {
    const {container, onInputChange} = renderValidity({maxValidityPeriod: 86400, validityInput: true});

    fireEvent.change(field(container)!, {target: {value: '3600'}});

    expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '3600');
    expect(field(container)!.value).toBe('3600');
    expect(container.textContent).toContain('Your consent expires in 1 hour.');
    expect(container.textContent).not.toContain('asked again on');
  });

  it('reports the seconds of the limit when it is chosen', () => {
    const {container, onInputChange} = renderValidity({maxValidityPeriod: 86400, validityInput: true});

    fireEvent.change(field(container)!, {target: {value: '86400'}});

    expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '86400');
  });

  describe('custom period', () => {
    const unit = (container: HTMLElement): HTMLSelectElement | null =>
      container.querySelector<HTMLSelectElement>('#consent_validity_unit');
    const unitValues = (container: HTMLElement): string[] =>
      Array.from(unit(container)!.options).map((option: HTMLOptionElement) => option.value);
    const openCustom = (container: HTMLElement): void => {
      fireEvent.change(field(container)!, {target: {value: 'custom'}});
    };

    it('shows a number field and a unit below the list once the custom choice is picked, holding the period selected', () => {
      const {container, onInputChange} = renderValidity(
        {maxValidityPeriod: 86400, validityInput: true},
        {__consent_validity_period__: '3600'},
      );

      expect(custom(container)).toBeNull();
      expect(unit(container)).toBeNull();

      openCustom(container);

      expect(field(container)!.value).toBe('custom');
      expect(custom(container)!.value).toBe('1');
      expect(unit(container)!.value).toBe('hour');
      expect(custom(container)!.getAttribute('aria-label')).toBe('Custom validity');
      expect(unit(container)!.getAttribute('aria-label')).toBe('Unit');
      expect(container.textContent).toContain('Enter a whole number, up to 24.');
      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '3600');
    });

    it('offers only the units that fit the limit', () => {
      const {container} = renderValidity({maxValidityPeriod: 10000, validityInput: true});

      openCustom(container);

      expect(unitValues(container)).toEqual(['second', 'minute', 'hour']);
      expect(Array.from(unit(container)!.options).map((option: HTMLOptionElement) => option.textContent)).toEqual([
        'seconds',
        'minutes',
        'hours',
      ]);
    });

    it('offers every unit, and no maximum, when there is no limit', () => {
      const {container} = renderValidity({validityInput: true});

      openCustom(container);

      expect(unitValues(container)).toEqual(['second', 'minute', 'hour', 'day']);
      expect(container.textContent).toContain('Enter a whole number.');
      expect(container.textContent).not.toContain('up to');
    });

    it('leaves the number empty, in minutes, and keeps the shortest period when no period was selected', () => {
      const {container, onInputChange} = renderValidity({validityInput: true});

      fireEvent.change(field(container)!, {target: {value: '2147483647'}});
      openCustom(container);

      expect(custom(container)!.value).toBe('');
      expect(unit(container)!.value).toBe('minute');
      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '60');
    });

    it('reports the number typed as seconds in the chosen unit', () => {
      const {container, onInputChange} = renderValidity({maxValidityPeriod: 86400, validityInput: true});

      openCustom(container);
      fireEvent.change(custom(container)!, {target: {value: '90'}});

      expect(custom(container)!.value).toBe('90');
      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '5400');
      expect(field(container)!.value).toBe('custom');
    });

    it('works the seconds out again when the unit changes, keeping the number', () => {
      const {container, onInputChange} = renderValidity({maxValidityPeriod: 86400 * 10, validityInput: true});

      openCustom(container);
      fireEvent.change(custom(container)!, {target: {value: '3'}});
      fireEvent.change(unit(container)!, {target: {value: 'hour'}});

      expect(custom(container)!.value).toBe('3');
      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '10800');

      fireEvent.change(unit(container)!, {target: {value: 'day'}});

      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '259200');
    });

    it('holds what is typed at the limit, and shows the most the unit allows', () => {
      const {container, onInputChange} = renderValidity({maxValidityPeriod: 86400, validityInput: true});

      openCustom(container);
      fireEvent.change(custom(container)!, {target: {value: '999999'}});

      expect(custom(container)!.value).toBe('1440');
      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '86400');
    });

    it('holds the number at the limit again when the unit grows', () => {
      const {container, onInputChange} = renderValidity({maxValidityPeriod: 86400, validityInput: true});

      openCustom(container);
      fireEvent.change(custom(container)!, {target: {value: '600'}});
      fireEvent.change(unit(container)!, {target: {value: 'hour'}});

      expect(custom(container)!.value).toBe('24');
      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '86400');
    });

    it('reports the shortest period when the number is cleared or holds no number from one', () => {
      const {container, onInputChange} = renderValidity({maxValidityPeriod: 86400, validityInput: true});

      openCustom(container);
      fireEvent.change(custom(container)!, {target: {value: '90'}});
      fireEvent.change(custom(container)!, {target: {value: ''}});

      expect(custom(container)!.value).toBe('');
      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '60');

      fireEvent.change(custom(container)!, {target: {value: '0'}});

      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '60');
    });

    it('keeps the decision remembered while a number in seconds passes through the value for one that is not', () => {
      const {container, onInputChange} = renderValidity({maxValidityPeriod: 86400, validityInput: true});

      openCustom(container);
      fireEvent.change(unit(container)!, {target: {value: 'second'}});
      fireEvent.change(custom(container)!, {target: {value: '1'}});

      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '1');
      expect(remember(container)!.checked).toBe(true);
      expect(custom(container)!.value).toBe('1');

      fireEvent.change(custom(container)!, {target: {value: '15'}});

      expect(custom(container)!.value).toBe('15');
      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '15');
    });

    it('takes digits only', () => {
      const {container, onInputChange} = renderValidity({maxValidityPeriod: 86400, validityInput: true});

      openCustom(container);
      fireEvent.change(custom(container)!, {target: {value: '1a2.5e'}});

      expect(custom(container)!.value).toBe('125');
      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '7500');

      fireEvent.change(custom(container)!, {target: {value: 'abc'}});

      expect(custom(container)!.value).toBe('');
      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '60');
    });

    it('goes back to the list when a period is chosen from it', () => {
      const {container, onInputChange} = renderValidity({maxValidityPeriod: 86400, validityInput: true});

      openCustom(container);
      fireEvent.change(custom(container)!, {target: {value: '90'}});
      fireEvent.change(field(container)!, {target: {value: '1800'}});

      expect(custom(container)).toBeNull();
      expect(unit(container)).toBeNull();
      expect(field(container)!.value).toBe('1800');
      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '1800');
    });

    it('selects the custom choice, showing the period in its largest whole unit, when the form holds one that is not listed', () => {
      const {container} = renderValidity(
        {maxValidityPeriod: 86400, validityInput: true},
        {__consent_validity_period__: '12345'},
      );

      expect(remember(container)!.checked).toBe(true);
      expect(field(container)!.value).toBe('custom');
      expect(custom(container)!.value).toBe('12345');
      expect(unit(container)!.value).toBe('second');
    });

    it('shows a period that is not listed in minutes when it is a whole number of them', () => {
      const {container} = renderValidity(
        {maxValidityPeriod: 86400, validityInput: true},
        {__consent_validity_period__: '420'},
      );

      expect(custom(container)!.value).toBe('7');
      expect(unit(container)!.value).toBe('minute');
    });

    it("stays on the input when a period of the user's own is typed over to match a listed one", () => {
      const {container} = renderValidity(
        {maxValidityPeriod: 86400, validityInput: true},
        {__consent_validity_period__: '12345'},
      );

      fireEvent.change(custom(container)!, {target: {value: '3600'}});

      expect(custom(container)!.value).toBe('3600');
      expect(field(container)!.value).toBe('custom');
    });

    it('hides the input when the decision is not remembered', () => {
      const {container} = renderValidity({maxValidityPeriod: 86400, validityInput: true});

      openCustom(container);
      fireEvent.click(remember(container)!);

      expect(custom(container)).toBeNull();
      expect(unit(container)).toBeNull();

      fireEvent.click(remember(container)!);

      expect(custom(container)).toBeNull();
      expect(field(container)!.value).toBe('60');
    });
  });

  it('shows nothing when the limit leaves no room for the short value', () => {
    const {container} = renderValidity({maxValidityPeriod: 1, validityInput: true});

    expect(remember(container)).toBeNull();
    expect(field(container)).toBeNull();
  });

  it('takes the texts from the translator when it has an entry', () => {
    const entries: Record<string, string> = {
      'consent.validity_period.custom_label': 'Own amount',
      'consent.validity_period.custom_unit_label': 'Own unit',
      'consent.validity_period.label': 'How long',
      'consent.validity_period.option_custom': 'My own',
      'consent.validity_period.remember': 'Keep this',
    };
    const t = (key: string): string => entries[key] ?? key;
    const {container} = renderValidity({maxValidityPeriod: 86400, t, validityInput: true});

    expect(container.querySelector('label[for="consent_validity_remember"]')!.textContent).toBe('Keep this');
    expect(field(container)!.getAttribute('aria-label')).toBe('How long');
    expect(optionLabels(container).at(-1)).toBe('My own');

    fireEvent.change(field(container)!, {target: {value: 'custom'}});

    expect(custom(container)!.getAttribute('aria-label')).toBe('Own amount');
    expect(container.querySelector('#consent_validity_unit')!.getAttribute('aria-label')).toBe('Own unit');
  });

  it('writes durations in the language of the i18n context', () => {
    const i18n: I18nContextValue = {
      bundles: {},
      currentLanguage: 'fr-FR',
      fallbackLanguage: 'en-US',
      injectBundles: vi.fn(),
      setLanguage: vi.fn(),
      t: (key: string): string => key,
    };
    const {container} = render(
      <I18nContext.Provider value={i18n}>
        <ThemeContext.Provider value={themeContextValue}>
          <Consent
            consentData={attributes}
            formValues={{}}
            onInputChange={vi.fn()}
            maxValidityPeriod={604800}
            validityInput
          />
        </ThemeContext.Provider>
      </I18nContext.Provider>,
    );

    expect(optionLabels(container).join(' ')).toMatch(/6\sheures/);
  });

  it('passes the flag and the limit to a custom render', () => {
    const children = vi.fn(() => <div id="custom" />);
    renderValidity({children, maxValidityPeriod: 3600, validityInput: true});

    expect(children).toHaveBeenCalledWith(expect.objectContaining({maxValidityPeriod: 3600, validityInput: true}));
  });

  it('passes the field as off to a custom render when the server did not ask for it', () => {
    const children = vi.fn(() => <div id="custom" />);
    renderValidity({children});

    expect(children).toHaveBeenCalledWith(expect.objectContaining({validityInput: false}));
  });
});
