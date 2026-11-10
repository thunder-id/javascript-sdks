// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {mount} from '@vue/test-utils';
import {describe, expect, it, vi} from 'vitest';
import {ref} from 'vue';
import {getConsentOptionalKey, default as Consent} from '../../../components/auth/flow/Consent';
import {I18N_KEY} from '../../../keys';

describe('Consent', () => {
  it('renders the optional-consent master switch and individual switches', async () => {
    const onInputChange = vi.fn();
    const wrapper = mount(Consent, {
      props: {
        consentData: {
          purposes: [
            {
              essential: [],
              optional: [{name: 'booking:read'}, {name: 'booking:write'}],
              purposeId: 'permissions',
              purposeName: 'Permissions',
              type: 'permissions',
            },
          ],
        },
        formValues: {},
        onInputChange,
        t: (key: string): string => key,
      },
    });

    expect(wrapper.text()).toContain('Optional Permissions');
    expect(wrapper.findAll('[role="switch"]')).toHaveLength(3);

    await wrapper.findAll('[role="switch"]')[0].setValue(true);
    expect(onInputChange).toHaveBeenCalledWith(getConsentOptionalKey('permissions', 'booking:read'), 'true');
    expect(onInputChange).toHaveBeenCalledWith(getConsentOptionalKey('permissions', 'booking:write'), 'true');
  });

  it('normalizes malformed prompt payloads to an empty render', () => {
    const wrapper = mount(Consent, {
      props: {consentData: '{not json}', formValues: {}, onInputChange: vi.fn()},
    });

    expect(wrapper.find('.thunderid-consent').exists()).toBe(false);
  });
});

describe('Consent validity period', () => {
  const consentData = {
    purposes: [
      {essential: [], optional: [{name: 'email'}], purposeId: 'p1', purposeName: 'Profile', type: 'attributes'},
    ],
  };

  // Keeps the form values the way the sign-in form does, so a change shows in what the field renders.
  const mountValidity = async (props: Record<string, unknown> = {}, formValues: Record<string, string> = {}) => {
    let values: Record<string, string> = {...formValues};
    const mounted: {wrapper?: ReturnType<typeof mount>} = {};
    const onInputChange = vi.fn((name: string, value: string): void => {
      values = {...values, [name]: value};
      void mounted.wrapper?.setProps({formValues: values});
    });
    const wrapper = mount(Consent, {
      props: {consentData, formValues: values, onInputChange, t: (key: string): string => key, ...props},
    });
    mounted.wrapper = wrapper;
    await wrapper.setProps({formValues: values});

    return {onInputChange, wrapper};
  };
  type Wrapper = Awaited<ReturnType<typeof mountValidity>>['wrapper'];
  const field = (wrapper: Wrapper) => wrapper.find<HTMLSelectElement>('#consent_validity_period');
  const remember = (wrapper: Wrapper) => wrapper.find<HTMLInputElement>('#consent_validity_remember');
  const custom = (wrapper: Wrapper) => wrapper.find<HTMLInputElement>('#consent_validity_custom');
  const unit = (wrapper: Wrapper) => wrapper.find<HTMLSelectElement>('#consent_validity_unit');
  const optionLabels = (wrapper: Wrapper): string[] =>
    field(wrapper)
      .findAll('option')
      .map((option) => option.text());
  const optionValues = (wrapper: Wrapper): (string | undefined)[] =>
    field(wrapper)
      .findAll('option')
      .map((option) => option.attributes('value'));

  it('shows nothing unless the server asks for it', async () => {
    const {onInputChange, wrapper} = await mountValidity();

    expect(remember(wrapper).exists()).toBe(false);
    expect(field(wrapper).exists()).toBe(false);
    expect(custom(wrapper).exists()).toBe(false);
    expect(onInputChange).not.toHaveBeenCalled();
  });

  it('starts with the decision remembered, and lists the periods that fit the limit and a custom one', async () => {
    const {wrapper} = await mountValidity({maxValidityPeriod: 86400, validityInput: true});

    expect(wrapper.find('label[for="consent_validity_remember"]').text()).toBe('Remember my decision');
    expect(remember(wrapper).element.checked).toBe(true);
    expect(wrapper.find('label[for="consent_validity_period"]').exists()).toBe(false);
    expect(field(wrapper).attributes('aria-label')).toBe('Ask me again');
    expect(optionValues(wrapper)).toEqual(['60', '1800', '3600', '43200', '86400', 'custom']);
    expect(optionLabels(wrapper)).toHaveLength(6);
    expect(wrapper.text()).toContain('Your consent expires in 1 minute.');
    expect(wrapper.text()).not.toContain('recommended');
  });

  it('selects the shortest period, and puts it in the form so that what is shown is what is submitted', async () => {
    const {onInputChange, wrapper} = await mountValidity({maxValidityPeriod: 86400, validityInput: true});

    expect(field(wrapper).element.value).toBe('60');
    expect(onInputChange).toHaveBeenCalledTimes(1);
    expect(onInputChange).toHaveBeenCalledWith('__consent_validity_period__', '60');
  });

  it('keeps a value the form already holds', async () => {
    const {onInputChange, wrapper} = await mountValidity(
      {maxValidityPeriod: 86400, validityInput: true},
      {__consent_validity_period__: '3600'},
    );

    expect(field(wrapper).element.value).toBe('3600');
    expect(onInputChange).not.toHaveBeenCalled();
  });

  it('adds the limit to the list when fewer than three periods fit', async () => {
    const {wrapper} = await mountValidity({maxValidityPeriod: 200, validityInput: true});

    expect(optionValues(wrapper)).toEqual(['60', '180', 'custom']);
    expect(field(wrapper).element.value).toBe('60');
  });

  it('does not list the limit when it is not a standard period and enough periods fit', async () => {
    const {wrapper} = await mountValidity({maxValidityPeriod: 10000, validityInput: true});

    expect(optionValues(wrapper)).toEqual(['60', '300', '1800', '3600', 'custom']);
  });

  it('lists no more than five periods, the shortest and the longest that fit and three spread between them', async () => {
    const {wrapper} = await mountValidity({maxValidityPeriod: 2592000, validityInput: true});

    expect(optionValues(wrapper)).toEqual(['60', '1800', '21600', '86400', '2592000', 'custom']);
  });

  it('ends the list with no expiry when there is no limit', async () => {
    const {onInputChange, wrapper} = await mountValidity({validityInput: true});

    expect(optionValues(wrapper)).toEqual(['60', '3600', '43200', '2592000', '2147483647', 'custom']);
    expect(optionLabels(wrapper)).toContain('No expiry');

    await field(wrapper).setValue('2147483647');

    expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '2147483647');
    expect(wrapper.text()).toContain('You will not be asked again unless this application asks for more access.');
  });

  it('reports the short value when the box is unticked', async () => {
    const {onInputChange, wrapper} = await mountValidity({maxValidityPeriod: 86400, validityInput: true});

    await remember(wrapper).setValue(false);

    expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '1');
  });

  it('shows the note and no list when the decision is not remembered', async () => {
    const {wrapper} = await mountValidity(
      {maxValidityPeriod: 86400, validityInput: true},
      {__consent_validity_period__: '1'},
    );

    expect(remember(wrapper).element.checked).toBe(false);
    expect(field(wrapper).exists()).toBe(false);
    expect(custom(wrapper).exists()).toBe(false);
    expect(wrapper.text()).toContain('You will be asked again the next time you sign in.');
  });

  it('reports the shortest period when the box is ticked again', async () => {
    const {onInputChange, wrapper} = await mountValidity(
      {maxValidityPeriod: 86400, validityInput: true},
      {__consent_validity_period__: '1'},
    );

    await remember(wrapper).setValue(true);

    expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '60');
    expect(field(wrapper).element.value).toBe('60');
  });

  it('reports the seconds of the period chosen under the validity period key', async () => {
    const {onInputChange, wrapper} = await mountValidity({maxValidityPeriod: 86400, validityInput: true});

    await field(wrapper).setValue('3600');

    expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '3600');
    expect(field(wrapper).element.value).toBe('3600');
    expect(wrapper.text()).toContain('Your consent expires in 1 hour.');
    expect(wrapper.text()).not.toContain('asked again on');
  });

  describe('custom period', () => {
    const unitValues = (wrapper: Wrapper): (string | undefined)[] =>
      unit(wrapper)
        .findAll('option')
        .map((option) => option.attributes('value'));
    const openCustom = async (wrapper: Wrapper): Promise<void> => {
      await field(wrapper).setValue('custom');
    };

    it('shows a number field and a unit below the list once the custom choice is picked, holding the period selected', async () => {
      const {onInputChange, wrapper} = await mountValidity(
        {maxValidityPeriod: 86400, validityInput: true},
        {__consent_validity_period__: '3600'},
      );

      expect(custom(wrapper).exists()).toBe(false);
      expect(unit(wrapper).exists()).toBe(false);

      await openCustom(wrapper);

      expect(field(wrapper).element.value).toBe('custom');
      expect(custom(wrapper).element.value).toBe('1');
      expect(unit(wrapper).element.value).toBe('hour');
      expect(custom(wrapper).attributes('aria-label')).toBe('Custom validity');
      expect(unit(wrapper).attributes('aria-label')).toBe('Unit');
      expect(wrapper.text()).toContain('Enter a whole number, up to 24.');
      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '3600');
    });

    it('offers only the units that fit the limit', async () => {
      const {wrapper} = await mountValidity({maxValidityPeriod: 10000, validityInput: true});

      await openCustom(wrapper);

      expect(unitValues(wrapper)).toEqual(['second', 'minute', 'hour']);
      expect(
        unit(wrapper)
          .findAll('option')
          .map((option) => option.text()),
      ).toEqual(['seconds', 'minutes', 'hours']);
    });

    it('offers every unit, and no maximum, when there is no limit', async () => {
      const {wrapper} = await mountValidity({validityInput: true});

      await openCustom(wrapper);

      expect(unitValues(wrapper)).toEqual(['second', 'minute', 'hour', 'day']);
      expect(wrapper.text()).toContain('Enter a whole number.');
      expect(wrapper.text()).not.toContain('up to');
    });

    it('leaves the number empty, in minutes, and keeps the shortest period when no period was selected', async () => {
      const {onInputChange, wrapper} = await mountValidity({validityInput: true});

      await field(wrapper).setValue('2147483647');
      await openCustom(wrapper);

      expect(custom(wrapper).element.value).toBe('');
      expect(unit(wrapper).element.value).toBe('minute');
      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '60');
    });

    it('reports the number typed as seconds in the chosen unit', async () => {
      const {onInputChange, wrapper} = await mountValidity({maxValidityPeriod: 86400, validityInput: true});

      await openCustom(wrapper);
      await custom(wrapper).setValue('90');

      expect(custom(wrapper).element.value).toBe('90');
      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '5400');
      expect(field(wrapper).element.value).toBe('custom');
    });

    it('works the seconds out again when the unit changes, keeping the number', async () => {
      const {onInputChange, wrapper} = await mountValidity({maxValidityPeriod: 86400 * 10, validityInput: true});

      await openCustom(wrapper);
      await custom(wrapper).setValue('3');
      await unit(wrapper).setValue('hour');

      expect(custom(wrapper).element.value).toBe('3');
      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '10800');

      await unit(wrapper).setValue('day');

      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '259200');
    });

    it('holds what is typed at the limit, and shows the most the unit allows', async () => {
      const {onInputChange, wrapper} = await mountValidity({maxValidityPeriod: 86400, validityInput: true});

      await openCustom(wrapper);
      await custom(wrapper).setValue('999999');

      expect(custom(wrapper).element.value).toBe('1440');
      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '86400');
    });

    it('holds the number at the limit again when the unit grows', async () => {
      const {onInputChange, wrapper} = await mountValidity({maxValidityPeriod: 86400, validityInput: true});

      await openCustom(wrapper);
      await custom(wrapper).setValue('600');
      await unit(wrapper).setValue('hour');

      expect(custom(wrapper).element.value).toBe('24');
      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '86400');
    });

    it('reports the shortest period when the number is cleared', async () => {
      const {onInputChange, wrapper} = await mountValidity({maxValidityPeriod: 86400, validityInput: true});

      await openCustom(wrapper);
      await custom(wrapper).setValue('90');
      await custom(wrapper).setValue('');

      expect(custom(wrapper).element.value).toBe('');
      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '60');
    });

    it('keeps the decision remembered while a number in seconds passes through the value for one that is not', async () => {
      const {onInputChange, wrapper} = await mountValidity({maxValidityPeriod: 86400, validityInput: true});

      await openCustom(wrapper);
      await unit(wrapper).setValue('second');
      await custom(wrapper).setValue('1');

      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '1');
      expect(remember(wrapper).element.checked).toBe(true);
      expect(custom(wrapper).element.value).toBe('1');

      await custom(wrapper).setValue('15');

      expect(custom(wrapper).element.value).toBe('15');
      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '15');
    });

    it('takes digits only', async () => {
      const {onInputChange, wrapper} = await mountValidity({maxValidityPeriod: 86400, validityInput: true});

      await openCustom(wrapper);
      await custom(wrapper).setValue('1a2.5e');

      expect(custom(wrapper).element.value).toBe('125');
      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '7500');

      await custom(wrapper).setValue('abc');

      expect(custom(wrapper).element.value).toBe('');
      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '60');
    });

    it('goes back to the list when a period is chosen from it', async () => {
      const {onInputChange, wrapper} = await mountValidity({maxValidityPeriod: 86400, validityInput: true});

      await openCustom(wrapper);
      await custom(wrapper).setValue('90');
      await field(wrapper).setValue('1800');

      expect(custom(wrapper).exists()).toBe(false);
      expect(unit(wrapper).exists()).toBe(false);
      expect(field(wrapper).element.value).toBe('1800');
      expect(onInputChange).toHaveBeenLastCalledWith('__consent_validity_period__', '1800');
    });

    it('selects the custom choice, showing the period in its largest whole unit, when the form holds one that is not listed', async () => {
      const {wrapper} = await mountValidity(
        {maxValidityPeriod: 86400, validityInput: true},
        {__consent_validity_period__: '12345'},
      );

      expect(remember(wrapper).element.checked).toBe(true);
      expect(field(wrapper).element.value).toBe('custom');
      expect(custom(wrapper).element.value).toBe('12345');
      expect(unit(wrapper).element.value).toBe('second');
    });

    it('shows a period that is not listed in minutes when it is a whole number of them', async () => {
      const {wrapper} = await mountValidity(
        {maxValidityPeriod: 86400, validityInput: true},
        {__consent_validity_period__: '420'},
      );

      expect(custom(wrapper).element.value).toBe('7');
      expect(unit(wrapper).element.value).toBe('minute');
    });

    it("stays on the input when a period of the user's own is typed over to match a listed one", async () => {
      const {wrapper} = await mountValidity(
        {maxValidityPeriod: 86400, validityInput: true},
        {__consent_validity_period__: '12345'},
      );

      await custom(wrapper).setValue('3600');

      expect(custom(wrapper).element.value).toBe('3600');
      expect(field(wrapper).element.value).toBe('custom');
    });

    it('hides the input when the decision is not remembered', async () => {
      const {wrapper} = await mountValidity({maxValidityPeriod: 86400, validityInput: true});

      await openCustom(wrapper);
      await remember(wrapper).setValue(false);

      expect(custom(wrapper).exists()).toBe(false);
      expect(unit(wrapper).exists()).toBe(false);

      await remember(wrapper).setValue(true);

      expect(custom(wrapper).exists()).toBe(false);
      expect(field(wrapper).element.value).toBe('60');
    });
  });

  it('shows nothing when the limit leaves no room for the short value', async () => {
    const {wrapper} = await mountValidity({maxValidityPeriod: 1, validityInput: true});

    expect(remember(wrapper).exists()).toBe(false);
    expect(field(wrapper).exists()).toBe(false);
  });

  it('takes the texts from the translator when it has an entry', async () => {
    const entries: Record<string, string> = {
      'consent.validity_period.custom_label': 'Own amount',
      'consent.validity_period.custom_unit_label': 'Own unit',
      'consent.validity_period.label': 'How long',
      'consent.validity_period.option_custom': 'My own',
      'consent.validity_period.remember': 'Keep this',
    };
    const t = (key: string): string => entries[key] ?? key;
    const {wrapper} = await mountValidity({maxValidityPeriod: 86400, t, validityInput: true});

    expect(wrapper.find('label[for="consent_validity_remember"]').text()).toBe('Keep this');
    expect(field(wrapper).attributes('aria-label')).toBe('How long');
    expect(optionLabels(wrapper).at(-1)).toBe('My own');

    await field(wrapper).setValue('custom');

    expect(custom(wrapper).attributes('aria-label')).toBe('Own amount');
    expect(unit(wrapper).attributes('aria-label')).toBe('Own unit');
  });

  it('falls back to English when the translator has no entry', async () => {
    const {wrapper} = await mountValidity({maxValidityPeriod: 86400, t: undefined, validityInput: true});

    expect(optionLabels(wrapper).at(-1)).toBe('Custom');
    expect(optionLabels(wrapper)[0]).toBe('1 minute');
  });

  it('writes durations in the language of the i18n context', () => {
    const wrapper = mount(Consent, {
      global: {provide: {[I18N_KEY as symbol]: {currentLanguage: ref('fr-FR')}}},
      props: {
        consentData,
        formValues: {},
        maxValidityPeriod: 604800,
        onInputChange: vi.fn(),
        t: (key: string): string => key,
        validityInput: true,
      },
    });

    expect(
      field(wrapper)
        .findAll('option')
        .map((option) => option.text())
        .join(' '),
    ).toMatch(/6\sheures/);
  });

  it('passes the flag and the limit to the default slot', () => {
    const slot = vi.fn(() => []);
    const wrapper = mount(Consent, {
      props: {consentData, formValues: {}, maxValidityPeriod: 3600, onInputChange: vi.fn(), validityInput: true},
      slots: {default: slot},
    });

    expect(slot).toHaveBeenCalledWith(expect.objectContaining({maxValidityPeriod: 3600, validityInput: true}));
    expect(wrapper.find('#consent_validity_period').exists()).toBe(false);
  });
});
