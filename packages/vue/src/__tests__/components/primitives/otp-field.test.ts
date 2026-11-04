// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {mount} from '@vue/test-utils';
import {describe, expect, it} from 'vitest';
import OtpField from '../../../components/primitives/OtpField';

describe('OtpField (vue)', () => {
  it('shows a visual separator and removes formatting from pasted device codes', async () => {
    const wrapper = mount(OtpField, {
      props: {length: 8, modelValue: '', numericOnly: false, separatorAfter: 4},
    });

    expect(wrapper.find('[aria-hidden="true"]').text()).toBe('-');
    await wrapper.find('input').trigger('paste', {
      clipboardData: {getData: () => 'abcd-efgh'},
    });

    expect(wrapper.emitted('update:modelValue')).toEqual([['ABCDEFGH']]);
    wrapper.unmount();
  });
});
