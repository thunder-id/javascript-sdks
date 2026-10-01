// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {getDefaultI18nBundles, substituteTranslationParams} from '@thunderid/browser';
import type {FetchUsers, PagedSelectPage} from '@thunderid/browser';
import {mount} from '@vue/test-utils';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ref} from 'vue';
import BaseUserSelect from '../../components/primitives/UserSelect/BaseUserSelect';
import {I18N_KEY} from '../../keys';
import type {I18nContextValue} from '../../models/contexts';

/** Resolves keys through the real en-US bundle so assertions read actual user-facing copy. */
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

// Mounted into the document (not a detached node) so focus, blur, and click-outside behave as
// they do in an app; every wrapper is unmounted after its test.
const mounted: {unmount: () => void}[] = [];
const mountUserSelect = (props: Record<string, unknown> = {}) => {
  const wrapper = mount(BaseUserSelect, {
    attachTo: document.body,
    global: {provide: {[I18N_KEY as symbol]: createI18nContext()}},
    props,
  });
  mounted.push(wrapper);
  return wrapper;
};
type UserSelectWrapper = ReturnType<typeof mountUserSelect>;

const TRIGGER = '.thunderid-paged-select__trigger';
const OPTION = '.thunderid-paged-select__option';
const PANEL = '.thunderid-paged-select__panel';

const users = (...names: string[]): {display: string; id: string}[] =>
  names.map((name: string, index: number) => ({display: name, id: `user-${index + 1}`}));

const page = (items: {display: string; id: string}[], nextOffset: number | null = null): PagedSelectPage => ({
  items,
  nextOffset,
  totalResults: items.length,
});

const open = async (wrapper: UserSelectWrapper, expectedOptions: number): Promise<void> => {
  await wrapper.find(TRIGGER).trigger('click');
  await vi.waitFor(() => expect(wrapper.findAll(OPTION)).toHaveLength(expectedOptions));
};

describe('BaseUserSelect (vue)', () => {
  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount());
  });

  it('shows the placeholder and makes no request while closed', () => {
    const fetchUsers: FetchUsers = vi.fn();
    const wrapper = mountUserSelect({fetchUsers, placeholder: 'Select a user'});

    expect(fetchUsers).not.toHaveBeenCalled();
    expect(wrapper.find('.thunderid-paged-select__trigger-label').text()).toBe('Select a user');
    expect(wrapper.find(PANEL).exists()).toBe(false);
  });

  it('is disabled when the disabled prop is set, and never opens', async () => {
    const fetchUsers: FetchUsers = vi.fn();
    const wrapper = mountUserSelect({disabled: true, fetchUsers});

    expect((wrapper.find(TRIGGER).element as HTMLButtonElement).disabled).toBe(true);
    await wrapper.find(TRIGGER).trigger('click');
    expect(wrapper.find(PANEL).exists()).toBe(false);
    expect(fetchUsers).not.toHaveBeenCalled();
  });

  it('opens on click, requests exactly one first page, and lists the returned users', async () => {
    const fetchUsers: FetchUsers = vi.fn().mockResolvedValue(page(users('Jane Doe', 'John Roe')));
    const wrapper = mountUserSelect({fetchUsers});

    await open(wrapper, 2);

    expect(fetchUsers).toHaveBeenCalledTimes(1);
    expect(fetchUsers).toHaveBeenCalledWith(expect.objectContaining({limit: 30, offset: 0}));
    expect(wrapper.text()).toContain('Jane Doe');
    expect(wrapper.text()).toContain('John Roe');
  });

  it("selecting an option emits the user's id, not the label, and closes the panel", async () => {
    const fetchUsers: FetchUsers = vi.fn().mockResolvedValue(page(users('Jane Doe')));
    const wrapper = mountUserSelect({fetchUsers});

    await open(wrapper, 1);
    await wrapper.find(OPTION).trigger('click');

    expect(wrapper.emitted('update:modelValue')).toEqual([['user-1']]);
    expect(wrapper.find(PANEL).exists()).toBe(false);
  });

  it('shows the selected user by name once its option is loaded, and by id before that', async () => {
    const fetchUsers: FetchUsers = vi.fn().mockResolvedValue(page(users('Jane Doe')));
    const wrapper = mountUserSelect({fetchUsers, modelValue: 'user-1'});

    expect(wrapper.find('.thunderid-paged-select__trigger-label').text()).toBe('user-1');

    await open(wrapper, 1);
    await wrapper.find(TRIGGER).trigger('click'); // close, so the label is read from the trigger

    expect(wrapper.find('.thunderid-paged-select__trigger-label').text()).toBe('Jane Doe');
  });

  it('a disabled option cannot be selected', async () => {
    const fetchUsers: FetchUsers = vi
      .fn()
      .mockResolvedValue({nextOffset: null, options: [{disabled: true, label: 'Suspended', value: 'user-1'}]});
    const wrapper = mountUserSelect({fetchUsers});

    await open(wrapper, 1);
    await wrapper.find(OPTION).trigger('click');

    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('shows an error with a working retry after a failed load', async () => {
    const fetchUsers: FetchUsers = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(page(users('Jane Doe')));
    const wrapper = mountUserSelect({fetchUsers});

    await wrapper.find(TRIGGER).trigger('click');
    await vi.waitFor(() => expect(wrapper.text()).toContain('Failed to load options.'));
    expect(wrapper.text()).not.toContain('boom');

    await wrapper.find('.thunderid-paged-select__retry').trigger('click');
    await vi.waitFor(() => expect(wrapper.findAll(OPTION)).toHaveLength(1));
    expect(fetchUsers).toHaveBeenCalledTimes(2);
  });

  it('loads the next page when the panel is scrolled near the bottom', async () => {
    const fetchUsers: FetchUsers = vi
      .fn()
      .mockResolvedValueOnce(page(users('User 1', 'User 2'), 2))
      .mockResolvedValueOnce(page([{display: 'User 3', id: 'user-3'}]));
    const wrapper = mountUserSelect({fetchUsers, pageSize: 2});

    await open(wrapper, 2);
    const panel: HTMLElement = wrapper.find(PANEL).element as HTMLElement;
    Object.defineProperty(panel, 'scrollHeight', {configurable: true, value: 1000});
    Object.defineProperty(panel, 'clientHeight', {configurable: true, value: 300});
    Object.defineProperty(panel, 'scrollTop', {configurable: true, value: 700});
    await wrapper.find(PANEL).trigger('scroll');

    await vi.waitFor(() => expect(wrapper.findAll(OPTION)).toHaveLength(3));
    expect(fetchUsers).toHaveBeenNthCalledWith(2, expect.objectContaining({limit: 2, offset: 2}));
  });

  it('still offers Load more when a page maps to no options but more pages remain', async () => {
    const fetchUsers: FetchUsers = vi
      .fn()
      .mockResolvedValueOnce({nextOffset: 30, options: []})
      .mockResolvedValueOnce(page(users('Jane Doe')));
    const wrapper = mountUserSelect({fetchUsers});

    await wrapper.find(TRIGGER).trigger('click');
    await vi.waitFor(() => expect(wrapper.find('.thunderid-paged-select__load-more').exists()).toBe(true));
    expect(wrapper.text()).not.toContain('No users found');

    await wrapper.find('.thunderid-paged-select__load-more').trigger('click');
    await vi.waitFor(() => expect(wrapper.findAll(OPTION)).toHaveLength(1));
    expect(fetchUsers).toHaveBeenNthCalledWith(2, expect.objectContaining({offset: 30}));
  });

  it('shows the empty message only once the list is genuinely exhausted', async () => {
    const fetchUsers: FetchUsers = vi.fn().mockResolvedValue({nextOffset: null, options: []});
    const wrapper = mountUserSelect({fetchUsers});

    await wrapper.find(TRIGGER).trigger('click');

    await vi.waitFor(() => expect(wrapper.text()).toContain('No users found.'));
    expect(wrapper.find('.thunderid-paged-select__load-more').exists()).toBe(false);
  });

  describe('keyboard', () => {
    it('Escape closes an open panel', async () => {
      const fetchUsers: FetchUsers = vi.fn().mockResolvedValue(page(users('Jane Doe')));
      const wrapper = mountUserSelect({fetchUsers});

      await open(wrapper, 1);
      await wrapper.find(TRIGGER).trigger('keydown', {key: 'Escape'});

      expect(wrapper.find(PANEL).exists()).toBe(false);
    });

    it('ArrowDown on the trigger opens the panel, then arrows move focus between options', async () => {
      const fetchUsers: FetchUsers = vi.fn().mockResolvedValue(page(users('User 1', 'User 2', 'User 3')));
      const wrapper = mountUserSelect({fetchUsers});

      await wrapper.find(TRIGGER).trigger('keydown', {key: 'ArrowDown'});
      await vi.waitFor(() => expect(wrapper.findAll(OPTION)).toHaveLength(3));

      await wrapper.find(TRIGGER).trigger('keydown', {key: 'ArrowDown'});
      await vi.waitFor(() => expect(document.activeElement).toBe(wrapper.findAll(OPTION)[0].element));

      await wrapper.find(PANEL).trigger('keydown', {key: 'ArrowDown'});
      await vi.waitFor(() => expect(document.activeElement).toBe(wrapper.findAll(OPTION)[1].element));

      await wrapper.find(PANEL).trigger('keydown', {key: 'ArrowUp'});
      await vi.waitFor(() => expect(document.activeElement).toBe(wrapper.findAll(OPTION)[0].element));
    });

    it('skips a disabled option and selects the focused one with Enter', async () => {
      const fetchUsers: FetchUsers = vi.fn().mockResolvedValue({
        nextOffset: null,
        options: [
          {label: 'User 1', value: 'user-1'},
          {disabled: true, label: 'Suspended', value: 'user-2'},
          {label: 'User 3', value: 'user-3'},
        ],
      });
      const wrapper = mountUserSelect({fetchUsers});

      await open(wrapper, 3);
      await wrapper.find(PANEL).trigger('keydown', {key: 'ArrowDown'});
      await wrapper.find(PANEL).trigger('keydown', {key: 'ArrowDown'});
      await vi.waitFor(() => expect(document.activeElement).toBe(wrapper.findAll(OPTION)[2].element));

      await wrapper.find(PANEL).trigger('keydown', {key: 'Enter'});

      expect(wrapper.emitted('update:modelValue')).toEqual([['user-3']]);
    });
  });

  it('closes when the user clicks outside it', async () => {
    const fetchUsers: FetchUsers = vi.fn().mockResolvedValue(page(users('Jane Doe')));
    const wrapper = mountUserSelect({fetchUsers});

    await open(wrapper, 1);
    document.body.click();

    await vi.waitFor(() => expect(wrapper.find(PANEL).exists()).toBe(false));
  });
});
