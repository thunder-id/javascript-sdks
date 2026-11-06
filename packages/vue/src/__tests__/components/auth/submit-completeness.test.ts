// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {EmbeddedFlowComponent} from '@thunderid/browser';
import {mount, VueWrapper} from '@vue/test-utils';
import {describe, expect, it} from 'vitest';
import {defineComponent, h, type VNode} from 'vue';
import {renderSignInComponents} from '../../../components/auth/flow/AuthOptionFactory';

const action = (overrides: Partial<EmbeddedFlowComponent> = {}): EmbeddedFlowComponent =>
  ({eventType: 'SUBMIT', id: 'action_submit', label: 'Verify', type: 'ACTION', ...overrides}) as EmbeddedFlowComponent;

const mountAction = (component: EmbeddedFlowComponent, isFormComplete?: boolean): VueWrapper => {
  const elements: VNode[] = renderSignInComponents(
    [component],
    {},
    {},
    {},
    false,
    true,
    () => undefined,
    () => undefined,
    {isFormComplete},
  );
  return mount(defineComponent({render: (): VNode => h('div', elements)}));
};

describe('AuthOptionFactory submit completeness', () => {
  it('disables a SUBMIT action while the form is incomplete', () => {
    expect(mountAction(action(), false).find('button').attributes('disabled')).toBeDefined();
    expect(mountAction(action(), true).find('button').attributes('disabled')).toBeUndefined();
  });

  it('never disables when the host reports no completeness', () => {
    expect(mountAction(action()).find('button').attributes('disabled')).toBeUndefined();
  });

  it('ignores completeness for actions that skip validation', () => {
    expect(
      mountAction(action({eventType: 'TRIGGER'}), false)
        .find('button')
        .attributes('disabled'),
    ).toBeUndefined();
  });
});
