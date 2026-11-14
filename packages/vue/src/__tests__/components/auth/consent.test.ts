// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {mount} from '@vue/test-utils';
import {describe, expect, it, vi} from 'vitest';
import {getConsentOptionalKey, default as Consent} from '../../../components/auth/flow/Consent';

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

  it('decides a hierarchical permission branch with one switch and lists what it covers', async () => {
    const onInputChange = vi.fn();
    const wrapper = mount(Consent, {
      props: {
        consentData: [
          {
            displayElements: [
              {name: 'reservations'},
              {name: 'reservations:create', parent: 'reservations'},
              {name: 'reservations:online', parent: 'reservations'},
              {name: 'reservations:online:view', parent: 'reservations:online'},
            ],
            essential: [],
            optional: [{name: 'reservations'}, {name: 'reservations:create', parent: 'reservations'}],
            permissionDelimiter: ':',
            purposeId: 'permissions',
            purposeName: 'Permissions',
            type: 'permissions',
          },
        ],
        formValues: {},
        onInputChange,
      },
    });

    expect(wrapper.findAll('[role="switch"]')).toHaveLength(2);
    expect(wrapper.text()).toContain('reservations:online:view');
    expect(wrapper.text()).toContain(
      'Approving a permission also approves the permissions beneath it, including any added later.',
    );

    await wrapper.find('#consent_opt_permissions_reservations').setValue(true);
    expect(onInputChange).toHaveBeenCalledWith(getConsentOptionalKey('permissions', 'reservations'), 'true');
    expect(onInputChange).toHaveBeenCalledWith(getConsentOptionalKey('permissions', 'reservations:create'), 'true');
    expect(onInputChange).not.toHaveBeenCalledWith(
      getConsentOptionalKey('permissions', 'reservations:online:view'),
      expect.anything(),
    );
  });

  it('normalizes malformed prompt payloads to an empty render', () => {
    const wrapper = mount(Consent, {
      props: {consentData: '{not json}', formValues: {}, onInputChange: vi.fn()},
    });

    expect(wrapper.find('.thunderid-consent').exists()).toBe(false);
  });
});
