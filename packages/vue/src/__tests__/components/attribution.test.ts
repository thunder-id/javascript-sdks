// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {mount} from '@vue/test-utils';
import {describe, expect, it} from 'vitest';
import Attribution from '../../components/presentation/attribution/Attribution';
import {createManagementContext} from '../helpers/managementContext';

const mountAttribution = (props: Record<string, unknown> = {}) =>
  mount(Attribution as never, {global: {provide: createManagementContext().provide}, props});

describe('Attribution', () => {
  it('credits ThunderID with a label and an accessible wordmark', () => {
    const wrapper = mountAttribution();

    expect(wrapper.find('[role="img"]').attributes('aria-label')).toBe('ThunderID');
    expect(wrapper.find('.thunderid-attribution__label').exists()).toBe(true);
    expect(wrapper.find('a').exists()).toBe(false);
  });

  it('hangs a ribbon off the edge of a card', () => {
    const wrapper = mountAttribution({appearance: 'ribbon', variant: 'powered'});

    expect(wrapper.classes()).toContain('thunderid-attribution--ribbon');
    expect(wrapper.find('.thunderid-attribution__ribbon-label').exists()).toBe(true);
  });

  it('opens a link in a new tab when given one', () => {
    const link = mountAttribution({href: 'https://example.com/security'}).find('a');

    expect(link.attributes('href')).toBe('https://example.com/security');
    expect(link.attributes('target')).toBe('_blank');
    expect(link.attributes('rel')).toBe('noopener noreferrer');
  });
});
