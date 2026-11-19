// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {VueWrapper, flushPromises, mount} from '@vue/test-utils';
import {Mock, describe, expect, it, vi} from 'vitest';
import {ref} from 'vue';
import BaseInviteUser from '../../../components/auth/invite-user/BaseInviteUser';
import {FLOW_META_KEY, I18N_KEY} from '../../../keys';

const providers = (): Record<symbol, unknown> => ({
  [FLOW_META_KEY as symbol]: {meta: ref(null)},
  [I18N_KEY as symbol]: {currentLanguage: ref('en-US'), t: (key: string): string => key},
});

const settle = async (): Promise<void> => {
  await flushPromises();
  await new Promise((resolve: (value: unknown) => void) => {
    setTimeout(resolve, 0);
  });
  await flushPromises();
};

// The onboarding flow's details step, as the server returns it: the execution is named by executionId.
const detailsStep = {
  challengeToken: 'challenge-1',
  data: {
    components: [
      {
        components: [
          {id: 'input_email', label: 'Email', ref: 'email', required: true, type: 'EMAIL_INPUT'},
          {eventType: 'SUBMIT', id: 'action_invite', label: 'Invite', type: 'ACTION', variant: 'PRIMARY'},
        ],
        id: 'block',
        type: 'BLOCK',
      },
    ],
  },
  executionId: 'exec-1',
  flowStatus: 'INCOMPLETE',
};

describe('BaseInviteUser continuation (vue)', () => {
  it('continues the execution the server started, with the challenge token it issued', async () => {
    const onSubmit: Mock = vi.fn().mockResolvedValue({...detailsStep, challengeToken: 'challenge-2'});
    const wrapper: VueWrapper = mount(BaseInviteUser, {
      global: {provide: providers()},
      props: {onInitialize: vi.fn().mockResolvedValue(detailsStep), onSubmit},
    }) as VueWrapper;
    await settle();

    await wrapper.get('input').setValue('new.user@example.com');
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Invite')!
      .trigger('click');
    await settle();

    expect(onSubmit).toHaveBeenCalledWith({
      action: 'action_invite',
      challengeToken: 'challenge-1',
      executionId: 'exec-1',
      inputs: {email: 'new.user@example.com'},
      verbose: true,
    });
  });
});
