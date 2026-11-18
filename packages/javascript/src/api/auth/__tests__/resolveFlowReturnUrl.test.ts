// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {describe, expect, it, vi} from 'vitest';
import {FlowMetadataResponse, FlowMetaType} from '../../../models/flow-meta';
import resolveFlowReturnUrl from '../resolveFlowReturnUrl';

const PAGE = 'https://idp.example.com/gate/signin?ref=abc';
const metaWith = (overrides: Partial<FlowMetadataResponse>): FlowMetadataResponse =>
  ({design: {}, i18n: {}, isRegistrationFlowEnabled: false, ...overrides}) as FlowMetadataResponse;

describe('resolveFlowReturnUrl', () => {
  it('uses the application URL from the loaded metadata without fetching', async () => {
    const fetchMeta = vi.fn();

    const target = await resolveFlowReturnUrl({
      currentUrl: PAGE,
      fetchMeta,
      meta: metaWith({application: {id: 'a1', name: 'Acme', url: 'https://acme.example.com'} as never}),
      ref: 'abc',
    });

    expect(target).toEqual({applicationName: 'Acme', url: 'https://acme.example.com'});
    expect(fetchMeta).not.toHaveBeenCalled();
  });

  it('looks the application up by ref', async () => {
    const fetchMeta = vi
      .fn()
      .mockResolvedValue(metaWith({application: {id: 'a1', name: 'Acme', url: 'https://acme.example.com'} as never}));

    const target = await resolveFlowReturnUrl({currentUrl: PAGE, fetchMeta, ref: 'abc'});

    expect(fetchMeta).toHaveBeenCalledWith({id: 'abc', type: FlowMetaType.Ref});
    expect(target.url).toBe('https://acme.example.com');
  });

  it('falls back to the default return URL when the ref names no application', async () => {
    const fetchMeta = vi
      .fn()
      .mockRejectedValueOnce(new Error('not found'))
      .mockResolvedValueOnce(metaWith({defaultReturnUrl: 'https://home.example.com'}));

    const target = await resolveFlowReturnUrl({currentUrl: PAGE, fetchMeta, ref: 'bad'});

    expect(fetchMeta).toHaveBeenLastCalledWith({});
    expect(target).toEqual({applicationName: undefined, url: 'https://home.example.com'});
  });

  it('uses the default return URL from the loaded metadata without fetching', async () => {
    const fetchMeta = vi.fn();

    const target = await resolveFlowReturnUrl({
      currentUrl: PAGE,
      fetchMeta,
      meta: metaWith({defaultReturnUrl: 'https://home.example.com'}),
    });

    expect(target.url).toBe('https://home.example.com');
    expect(fetchMeta).not.toHaveBeenCalled();
  });

  it('drops a return URL that points back to the sign-in page', async () => {
    const fetchMeta = vi.fn().mockResolvedValue(metaWith({defaultReturnUrl: '/gate/signin'}));

    const target = await resolveFlowReturnUrl({currentUrl: PAGE, fetchMeta});

    expect(target.url).toBeUndefined();
  });

  it('does not fetch when the loaded metadata has neither URL', async () => {
    const fetchMeta = vi.fn();

    const target = await resolveFlowReturnUrl({
      currentUrl: PAGE,
      fetchMeta,
      meta: metaWith({application: {id: 'a1', name: 'Acme'} as never}),
    });

    expect(target).toEqual({applicationName: 'Acme', url: undefined});
    expect(fetchMeta).not.toHaveBeenCalled();
  });

  it('falls back to the default when the application URL points back to the sign-in page', async () => {
    const target = await resolveFlowReturnUrl({
      currentUrl: PAGE,
      fetchMeta: vi.fn(),
      meta: metaWith({
        application: {id: 'a1', name: 'Acme', url: 'https://idp.example.com/gate/signin'} as never,
        defaultReturnUrl: 'https://home.example.com',
      }),
    });

    expect(target.url).toBe('https://home.example.com');
  });

  it('drops a return URL that is not http or https', async () => {
    const target = await resolveFlowReturnUrl({
      currentUrl: PAGE,
      fetchMeta: vi.fn(),
      meta: metaWith({application: {id: 'a1', name: 'Acme', url: 'javascript:alert(1)'} as never}),
    });

    expect(target.url).toBeUndefined();
  });

  it('resolves to no URL when every lookup fails', async () => {
    const fetchMeta = vi.fn().mockRejectedValue(new Error('down'));

    await expect(resolveFlowReturnUrl({currentUrl: PAGE, fetchMeta, ref: 'abc'})).resolves.toEqual({
      applicationName: undefined,
      url: undefined,
    });
  });
});
