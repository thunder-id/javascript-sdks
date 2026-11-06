// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {
  type AccessibleOrganizationUnit,
  OrganizationUnitSwitchErrorCodes,
  ThunderIDAPIError,
  getDefaultI18nBundles,
  substituteTranslationParams,
} from '@thunderid/browser';
import {type DOMWrapper, enableAutoUnmount, flushPromises, mount} from '@vue/test-utils';
import {Mock, afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {h, nextTick, ref} from 'vue';
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

enableAutoUnmount(afterEach);

const mountSwitcher = (
  props: Record<string, unknown> = {},
  switchOrganizationUnit: Mock = vi.fn(),
  slots = {},
  currentOrganizationUnit: {id: string; name?: string} | null = null,
) =>
  mount(OrganizationUnitSwitcher, {
    attachTo: document.body,
    global: {
      provide: {
        [I18N_KEY as symbol]: createI18nContext(),
        [THUNDERID_KEY as symbol]: {
          baseUrl: 'https://localhost:8090',
          currentOrganizationUnit: ref(currentOrganizationUnit),
          instanceId: 0,
          switchOrganizationUnit,
          vendor: 'thunderid',
        } as unknown as ThunderIDContext,
      },
    },
    props,
    slots,
  });

const mountBase = (props: Record<string, unknown>, slots = {}) =>
  mount(BaseOrganizationUnitSwitcher, {
    attachTo: document.body,
    global: {provide: {[I18N_KEY as symbol]: createI18nContext()}},
    props,
    slots,
  });

type Mounted = ReturnType<typeof mountBase>;

const field = (wrapper: Mounted): DOMWrapper<HTMLButtonElement> =>
  wrapper.get<HTMLButtonElement>('button[aria-haspopup="listbox"]');

const options = (wrapper: Mounted): DOMWrapper<Element>[] => wrapper.findAll('[role="option"]');

const openMenu = async (wrapper: Mounted): Promise<void> => {
  await field(wrapper).trigger('click');
};

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

  it('shows the current unit under a small label and lists the units with the scope in a menu', async () => {
    const wrapper: Mounted = mountSwitcher({scope: 'siblings'});
    await flushPromises();

    expect(mockGetUnits).toHaveBeenCalledWith(
      expect.objectContaining({baseUrl: 'https://localhost:8090', limit: 10, offset: 0, scope: 'siblings'}),
    );
    expect(field(wrapper).text()).toBe('OrganizationAcme OU 1');
    expect(field(wrapper).attributes('aria-expanded')).toBe('false');
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);

    await openMenu(wrapper);

    expect(field(wrapper).attributes('aria-expanded')).toBe('true');
    expect(options(wrapper)).toHaveLength(2);
    expect(options(wrapper)[0].attributes('aria-selected')).toBe('true');
    expect(options(wrapper)[1].attributes('aria-selected')).toBe('false');
    expect(options(wrapper)[1].text()).toContain('acme-ou-2');
  });

  it('switches through switchOrganizationUnit, closes the menu and emits switch', async () => {
    const switchOrganizationUnit: Mock = vi.fn().mockResolvedValue({sub: 'u'});
    const wrapper: Mounted = mountSwitcher({}, switchOrganizationUnit);
    await flushPromises();

    await openMenu(wrapper);
    await options(wrapper)[1].trigger('click');
    await flushPromises();

    expect(switchOrganizationUnit).toHaveBeenCalledWith('ou-2');
    expect(wrapper.emitted('switch')?.[0]?.[0]).toEqual(units[1]);
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(field(wrapper).text()).toBe('OrganizationAcme OU 2');
  });

  it('lets onSelect take over the switch', async () => {
    const switchOrganizationUnit: Mock = vi.fn();
    const onSelect: Mock = vi.fn();
    const wrapper: Mounted = mountSwitcher({onSelect}, switchOrganizationUnit);
    await flushPromises();

    await openMenu(wrapper);
    await options(wrapper)[1].trigger('click');

    expect(onSelect).toHaveBeenCalledWith(units[1]);
    expect(switchOrganizationUnit).not.toHaveBeenCalled();
  });

  it('shows a translated message under the field when the unit cannot be used, keeping the current unit', async () => {
    const switchOrganizationUnit: Mock = vi
      .fn()
      .mockRejectedValue(
        new ThunderIDAPIError('unauthorized_client', OrganizationUnitSwitchErrorCodes.UnauthorizedClient, 'browser'),
      );
    const wrapper: Mounted = mountSwitcher({}, switchOrganizationUnit);
    await flushPromises();

    await openMenu(wrapper);
    await options(wrapper)[1].trigger('click');
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toBe('This application cannot be used from Acme OU 2.');
    expect(field(wrapper).text()).toBe('OrganizationAcme OU 1');
  });

  it('shows a translated message when the units cannot be loaded', async () => {
    mockGetUnits.mockRejectedValueOnce(new Error('boom'));
    const wrapper: Mounted = mountSwitcher();
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toBe('The organization units could not be loaded.');
  });

  it('pages through the units from inside the menu', async () => {
    mockGetUnits.mockResolvedValue({
      count: 2,
      current: 'ou-1',
      organizationUnits: units,
      startIndex: 1,
      totalResults: 5,
    });
    const wrapper: Mounted = mountSwitcher({limit: 2});
    await flushPromises();

    await openMenu(wrapper);
    const next: DOMWrapper<Element> | undefined = wrapper
      .findAll('button')
      .find((button: DOMWrapper<Element>) => button.text() === 'Next');
    await next!.trigger('click');
    await flushPromises();

    expect(mockGetUnits).toHaveBeenLastCalledWith(expect.objectContaining({limit: 2, offset: 2}));
    expect(wrapper.find('[role="listbox"]').exists()).toBe(true);
  });

  it('shows the current unit from the session when the list does not include it', async () => {
    mockGetUnits.mockResolvedValue({
      count: 2,
      current: 'ou-9',
      organizationUnits: units,
      startIndex: 1,
      totalResults: 2,
    });
    const wrapper: Mounted = mountSwitcher({}, vi.fn(), {}, {id: 'ou-9', name: 'Initech'});
    await flushPromises();

    expect(field(wrapper).text()).toBe('OrganizationInitech');
  });

  it('hands everything to a custom render through the default slot', async () => {
    const switchOrganizationUnit: Mock = vi.fn().mockResolvedValue({sub: 'u'});
    let received: OrganizationUnitSwitcherRenderProps | undefined;
    const wrapper: Mounted = mountSwitcher({}, switchOrganizationUnit, {
      default: (props: OrganizationUnitSwitcherRenderProps) => {
        received = props;
        return props.organizationUnits.map((unit: AccessibleOrganizationUnit) =>
          h('a', {class: 'custom', onClick: () => props.onSwitch(unit)}, unit.name),
        );
      },
    });
    await flushPromises();

    expect(wrapper.find('button[aria-haspopup="listbox"]').exists()).toBe(false);
    expect(received).toMatchObject({
      current: 'ou-1',
      currentName: 'Acme OU 1',
      isLoading: false,
      limit: 10,
      offset: 0,
      totalResults: 2,
    });
    await wrapper.findAll('a.custom')[1].trigger('click');
    await flushPromises();
    expect(switchOrganizationUnit).toHaveBeenCalledWith('ou-2');
  });
});

describe('BaseOrganizationUnitSwitcher', () => {
  it('calls onSwitch for another unit and closes the menu', async () => {
    const onSwitch: Mock = vi.fn();
    const wrapper: Mounted = mountBase({current: 'ou-2', onSwitch, organizationUnits: units, totalResults: 2});

    expect(field(wrapper).text()).toBe('OrganizationAcme OU 2');
    await openMenu(wrapper);
    await options(wrapper)[0].trigger('click');

    expect(onSwitch).toHaveBeenCalledWith(units[0]);
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
  });

  it('closes without a switch when the current unit is picked', async () => {
    const onSwitch: Mock = vi.fn();
    const wrapper: Mounted = mountBase({current: 'ou-1', onSwitch, organizationUnits: units, totalResults: 2});

    await openMenu(wrapper);
    await options(wrapper)[0].trigger('click');

    expect(onSwitch).not.toHaveBeenCalled();
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
  });

  it('moves through the units with the keyboard and closes on Escape', async () => {
    const onSwitch: Mock = vi.fn();
    const wrapper: Mounted = mountBase({current: 'ou-1', onSwitch, organizationUnits: units, totalResults: 2});

    // An arrow on the closed field opens the menu on the current unit.
    await field(wrapper).trigger('keydown', {key: 'ArrowDown'});
    await nextTick();
    expect(document.activeElement).toBe(options(wrapper)[0].element);

    await options(wrapper)[0].trigger('keydown', {key: 'ArrowDown'});
    expect(document.activeElement).toBe(options(wrapper)[1].element);
    await options(wrapper)[1].trigger('keydown', {key: 'ArrowDown'});
    expect(document.activeElement).toBe(options(wrapper)[0].element);

    await options(wrapper)[0].trigger('keydown', {key: 'Escape'});

    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(document.activeElement).toBe(field(wrapper).element);
    expect(onSwitch).not.toHaveBeenCalled();
  });

  it('closes when the user clicks outside', async () => {
    const wrapper: Mounted = mountBase({current: 'ou-1', organizationUnits: units, totalResults: 2});

    await openMenu(wrapper);
    document.body.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
    await nextTick();

    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
  });

  it('shows the unit being switched to and disables the field', () => {
    const wrapper: Mounted = mountBase({
      current: 'ou-1',
      organizationUnits: units,
      switchingId: 'ou-2',
      totalResults: 2,
    });

    expect(field(wrapper).text()).toBe('OrganizationSwitching to Acme OU 2…');
    expect(field(wrapper).element.disabled).toBe(true);
  });

  it('uses the given label, or none', () => {
    expect(field(mountBase({current: 'ou-1', organizationUnits: units, title: 'Workspace'})).text()).toBe(
      'WorkspaceAcme OU 1',
    );
    expect(field(mountBase({current: 'ou-1', organizationUnits: units, title: ''})).text()).toBe('Acme OU 1');
  });

  it('shows a placeholder, then the loading and empty states in the menu', async () => {
    const empty: Mounted = mountBase({organizationUnits: []});

    expect(field(empty).text()).toBe('OrganizationSelect an organization');
    await openMenu(empty);
    expect(empty.text()).toContain('No organization units are available.');
    expect(empty.find('[role="listbox"]').exists()).toBe(false);

    const loading: Mounted = mountBase({isLoading: true});

    expect(field(loading).text()).toBe('OrganizationLoading organization units…');
    await openMenu(loading);
    expect(loading.get('[role="status"]').text()).toBe('Loading organization units…');
  });

  it('supports a custom render through the default slot', () => {
    const wrapper: Mounted = mountBase(
      {current: 'ou-1', organizationUnits: units, switchingId: 'ou-2', totalResults: 2},
      {
        default: (props: OrganizationUnitSwitcherRenderProps) =>
          h('p', {class: 'custom'}, `${props.organizationUnits.length}:${props.current}:${props.switchingId}`),
      },
    );

    expect(wrapper.get('p.custom').text()).toBe('2:ou-1:ou-2');
  });
});
