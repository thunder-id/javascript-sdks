// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {getDefaultI18nBundles, substituteTranslationParams} from '@thunderid/browser';
import {mount} from '@vue/test-utils';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ref} from 'vue';
import UserSelect from '../../components/primitives/UserSelect/UserSelect';
import {I18N_KEY} from '../../keys';

const mocks = vi.hoisted(() => ({
  getUsers: vi.fn(),
  thunderID: {
    baseUrl: 'https://thunder.example',
    endpoints: {users: 'https://rs.example.com/users'} as {users?: string},
  },
}));

vi.mock('../../api/getUsers', () => ({default: mocks.getUsers}));
vi.mock('../../composables/useThunderID', () => ({default: () => mocks.thunderID}));

const i18n = {
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
};

const mounted: {unmount: () => void}[] = [];
const mountUserSelect = () => {
  const wrapper = mount(UserSelect, {
    attachTo: document.body,
    global: {provide: {[I18N_KEY as symbol]: i18n}},
    props: {label: 'Owner'},
  });
  mounted.push(wrapper);
  return wrapper;
};

describe('UserSelect (vue)', () => {
  afterEach(() => {
    mounted.splice(0).forEach((wrapper) => wrapper.unmount());
    mocks.getUsers.mockReset();
  });

  it('makes no request while closed', () => {
    mountUserSelect();

    expect(mocks.getUsers).not.toHaveBeenCalled();
  });

  it('loads the user directory itself and submits the chosen ID', async () => {
    mocks.getUsers.mockResolvedValue({
      count: 2,
      startIndex: 1,
      totalResults: 2,
      users: [
        {display: 'Jane Doe', id: 'user-1'},
        {display: 'John Roe', id: 'user-2'},
      ],
    });
    const wrapper = mountUserSelect();

    await wrapper.find('.thunderid-paged-select__trigger').trigger('click');
    await vi.waitFor(() => expect(wrapper.findAll('.thunderid-paged-select__option')).toHaveLength(2));
    await wrapper.findAll('.thunderid-paged-select__option')[0].trigger('click');

    expect(mocks.getUsers).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'https://thunder.example',
        limit: 30,
        offset: 0,
        url: 'https://rs.example.com/users',
      }),
    );
    expect(wrapper.emitted('update:modelValue')).toEqual([['user-1']]);
  });
});
