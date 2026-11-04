// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/typedef, @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-function-return-type */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {effectScope, nextTick, ref} from 'vue';

const switchOrganizationUnit = vi.fn();
const fetchMock = vi.fn();

vi.mock('@thunderid/browser', () => ({
  withVendorCSSClassPrefix: (name: string) => `thunderid-${name}`,
}));

vi.mock('@thunderid/vue', () => ({
  BaseOrganizationUnitSwitcher: {name: 'BaseOrganizationUnitSwitcher'},
  useI18n: () => ({t: (key: string, params?: Record<string, string>) => (params ? `${key}:${params['name']}` : key)}),
}));

vi.mock('#imports', () => ({
  useThunderID: () => ({currentOrganizationUnit: ref({id: 'ou-1'}), switchOrganizationUnit}),
}));

const {default: OrganizationUnitSwitcher} = await import(
  '../../src/runtime/components/account/OrganizationUnitSwitcher'
);

const units = [
  {handle: 'a', id: 'ou-1', name: 'A'},
  {handle: 'b', id: 'ou-2', name: 'B'},
];

const flush = async () => {
  await nextTick();
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
};

const setup = (props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) => {
  const emit = vi.fn();
  const scope = effectScope();
  const render = scope.run(() =>
    (OrganizationUnitSwitcher as any).setup(
      {
        className: '',
        limit: 10,
        onSelect: undefined,
        preferences: undefined,
        scope: undefined,
        title: undefined,
        ...props,
      },
      {attrs: {}, emit, slots} as any,
    ),
  );

  return {emit, render, scope};
};

describe('OrganizationUnitSwitcher (Nuxt)', () => {
  beforeEach(() => {
    vi.stubGlobal('$fetch', fetchMock);
    fetchMock.mockResolvedValue({count: 2, current: 'ou-1', organizationUnits: units, startIndex: 1, totalResults: 2});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('lists the units through the server route and switches through the context', async () => {
    const {emit, render, scope} = setup({scope: 'siblings'});
    (render().props as any).onPageChange(0);
    await flush();

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/user/organization-units', {
      query: {limit: 10, offset: 0, scope: 'siblings'},
    });
    expect(render().props).toMatchObject({current: 'ou-1', organizationUnits: units, totalResults: 2});

    await (render().props as any).onSwitch(units[1]);
    expect(switchOrganizationUnit).toHaveBeenCalledWith('ou-2');
    expect(emit).toHaveBeenCalledWith('switch', units[1]);

    scope.stop();
  });

  it('lets onSelect take over and shows a translated load error', async () => {
    const onSelect = vi.fn();
    fetchMock.mockRejectedValue(new Error('boom'));
    const {render, scope} = setup({onSelect});
    (render().props as any).onPageChange(0);
    await flush();

    expect(render().props.error).toBe('organization_unit.switcher.error.load');
    await (render().props as any).onSwitch(units[1]);
    expect(onSelect).toHaveBeenCalledWith(units[1]);
    expect(switchOrganizationUnit).not.toHaveBeenCalled();

    scope.stop();
  });

  it('passes a custom render through to the base component', () => {
    const slot = vi.fn();
    const {render, scope} = setup({}, {default: slot});

    expect(render().children).toMatchObject({default: slot});

    scope.stop();
  });
});
