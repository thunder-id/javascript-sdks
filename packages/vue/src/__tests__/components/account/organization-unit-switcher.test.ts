// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  type AccessibleOrganizationUnit,
  OrganizationUnitSwitchErrorCodes,
  ThunderIDAPIError,
  getDefaultI18nBundles,
  substituteTranslationParams,
} from '@thunderid/browser';
import {flushPromises, mount} from '@vue/test-utils';
import {Mock, beforeEach, describe, expect, it, vi} from 'vitest';
import {h, ref} from 'vue';
import BaseOrganizationUnitSwitcher, {
  type OrganizationUnitSwitcherRenderProps,
} from '../../../components/account/organization-unit-switcher/BaseOrganizationUnitSwitcher';
import OrganizationUnitSwitcher from '../../../components/account/organization-unit-switcher/OrganizationUnitSwitcher';
import {I18N_KEY, THUNDERID_KEY} from '../../../keys';
import type {I18nContextValue, ThunderIDContext} from '../../../models/contexts';

const mockGetUnits = vi.fn() as Mock;

vi.mock('../../../api/account/getAccessibleOrganizationUnits', () => ({
  default: (...args: unknown[]): unknown => mockGetUnits(...args) as unknown,
}));

const units: AccessibleOrganizationUnit[] = [
  {handle: 'acme-ou-1', id: 'ou-1', name: 'Acme OU 1'},
  {handle: 'acme-ou-2', id: 'ou-2', name: 'Acme OU 2'},
];

const createI18nContext = (): I18nContextValue =>
  ({
    bundles: ref({}),
    currentLanguage: ref('en-US'),
    fallbackLanguage: 'en-US',
    injectBundles: vi.fn(),
    setLanguage: vi.fn(),
    t: (key: string, params?: Record<string, string | number>): string => {
      const translations = getDefaultI18nBundles()['en-US']?.translations as Record<string, string>;
      const value: string = translations?.[key] ?? key;

      return params ? substituteTranslationParams(value, params) : value;
    },
  }) as unknown as I18nContextValue;

const mountSwitcher = (props: Record<string, unknown> = {}, switchOrganizationUnit: Mock = vi.fn(), slots = {}) =>
  mount(OrganizationUnitSwitcher, {
    global: {
      provide: {
        [I18N_KEY as symbol]: createI18nContext(),
        [THUNDERID_KEY as symbol]: {
          baseUrl: 'https://localhost:8090',
          currentOrganizationUnit: ref(null),
          instanceId: 0,
          switchOrganizationUnit,
          vendor: 'thunderid',
        } as unknown as ThunderIDContext,
      },
    },
    props,
    slots,
  });

describe('OrganizationUnitSwitcher', () => {
  beforeEach(() => {
    mockGetUnits.mockReset();
    mockGetUnits.mockResolvedValue({
      count: 2,
      current: 'ou-1',
      organizationUnits: units,
      startIndex: 1,
      totalResults: 2,
    });
  });

  it('lists the accessible units with the scope and marks the current one', async () => {
    const wrapper = mountSwitcher({scope: 'siblings'});
    await flushPromises();

    expect(mockGetUnits).toHaveBeenCalledWith(
      expect.objectContaining({baseUrl: 'https://localhost:8090', limit: 10, offset: 0, scope: 'siblings'}),
    );
    const items = wrapper.findAll('li');
    expect(items).toHaveLength(2);
    expect(items[0].attributes('aria-current')).toBe('true');
    expect(items[0].text()).toContain('Current');
    expect(items[1].find('button').text()).toBe('Switch');
  });

  it('switches through switchOrganizationUnit and emits switch', async () => {
    const switchOrganizationUnit: Mock = vi.fn().mockResolvedValue({sub: 'u'});
    const wrapper = mountSwitcher({}, switchOrganizationUnit);
    await flushPromises();

    await wrapper.findAll('li')[1].find('button').trigger('click');
    await flushPromises();

    expect(switchOrganizationUnit).toHaveBeenCalledWith('ou-2');
    expect(wrapper.emitted('switch')?.[0]?.[0]).toEqual(units[1]);
    expect(wrapper.findAll('li')[1].attributes('aria-current')).toBe('true');
  });

  it('lets onSelect take over the switch', async () => {
    const switchOrganizationUnit: Mock = vi.fn();
    const onSelect: Mock = vi.fn();
    const wrapper = mountSwitcher({onSelect}, switchOrganizationUnit);
    await flushPromises();

    await wrapper.findAll('li')[1].find('button').trigger('click');

    expect(onSelect).toHaveBeenCalledWith(units[1]);
    expect(switchOrganizationUnit).not.toHaveBeenCalled();
  });

  it('shows a translated message when the unit cannot be used, keeping the current unit', async () => {
    const switchOrganizationUnit: Mock = vi
      .fn()
      .mockRejectedValue(
        new ThunderIDAPIError('unauthorized_client', OrganizationUnitSwitchErrorCodes.UnauthorizedClient, 'browser'),
      );
    const wrapper = mountSwitcher({}, switchOrganizationUnit);
    await flushPromises();

    await wrapper.findAll('li')[1].find('button').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('This application cannot be used from Acme OU 2.');
    expect(wrapper.findAll('li')[0].attributes('aria-current')).toBe('true');
  });

  it('shows a translated message when the units cannot be loaded', async () => {
    mockGetUnits.mockRejectedValueOnce(new Error('boom'));
    const wrapper = mountSwitcher();
    await flushPromises();

    expect(wrapper.text()).toContain('The organization units could not be loaded.');
  });

  it('pages through the units', async () => {
    mockGetUnits.mockResolvedValue({
      count: 2,
      current: 'ou-1',
      organizationUnits: units,
      startIndex: 1,
      totalResults: 5,
    });
    const wrapper = mountSwitcher({limit: 2});
    await flushPromises();

    const next = wrapper.findAll('button').find((button) => button.text() === 'Next');
    await next!.trigger('click');
    await flushPromises();

    expect(mockGetUnits).toHaveBeenLastCalledWith(expect.objectContaining({limit: 2, offset: 2}));
  });

  it('hands everything to a custom render through the default slot', async () => {
    const switchOrganizationUnit: Mock = vi.fn().mockResolvedValue({sub: 'u'});
    let received: OrganizationUnitSwitcherRenderProps | undefined;
    const wrapper = mountSwitcher({}, switchOrganizationUnit, {
      default: (props: OrganizationUnitSwitcherRenderProps) => {
        received = props;
        return props.organizationUnits.map((unit: AccessibleOrganizationUnit) =>
          h('a', {class: 'custom', onClick: () => props.onSwitch(unit)}, unit.name),
        );
      },
    });
    await flushPromises();

    expect(wrapper.findAll('li')).toHaveLength(0);
    expect(received).toMatchObject({current: 'ou-1', isLoading: false, limit: 10, offset: 0, totalResults: 2});
    await wrapper.findAll('a.custom')[1].trigger('click');
    await flushPromises();
    expect(switchOrganizationUnit).toHaveBeenCalledWith('ou-2');
  });
});

describe('BaseOrganizationUnitSwitcher', () => {
  const mountBase = (props: Record<string, unknown>, slots = {}) =>
    mount(BaseOrganizationUnitSwitcher, {
      global: {provide: {[I18N_KEY as symbol]: createI18nContext()}},
      props,
      slots,
    });

  it('renders the units and calls onSwitch for another unit only', async () => {
    const onSwitch: Mock = vi.fn();
    const wrapper = mountBase({current: 'ou-2', onSwitch, organizationUnits: units, totalResults: 2});

    expect(wrapper.findAll('li')[1].text()).toContain('Current');
    await wrapper.findAll('li')[0].find('button').trigger('click');
    expect(onSwitch).toHaveBeenCalledWith(units[0]);
  });

  it('shows the empty and loading states', () => {
    expect(mountBase({organizationUnits: []}).text()).toContain('No organization units are available.');
    expect(mountBase({isLoading: true}).text()).toContain('Loading organization units…');
  });

  it('supports a custom render through the default slot', () => {
    const wrapper = mountBase(
      {current: 'ou-1', organizationUnits: units, switchingId: 'ou-2', totalResults: 2},
      {
        default: (props: OrganizationUnitSwitcherRenderProps) =>
          h('p', {class: 'custom'}, `${props.organizationUnits.length}:${props.current}:${props.switchingId}`),
      },
    );

    expect(wrapper.get('p.custom').text()).toBe('2:ou-1:ou-2');
  });
});
