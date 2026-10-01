// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {act, render, waitFor} from '@testing-library/react';
import {createTheme, EmbeddedFlowComponentType, FetchUsers} from '@thunderid/browser';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import BaseInviteUser from '../BaseInviteUser';

const mocks = vi.hoisted(() => ({
  renderInviteUserComponents: vi.fn(),
}));

vi.mock('../../AuthOptionFactory', async (importOriginal: () => Promise<Record<string, unknown>>) => ({
  ...(await importOriginal()),
  renderInviteUserComponents: mocks.renderInviteUserComponents,
}));
vi.mock('../../../../../contexts/Theme/useTheme', () => ({default: () => ({theme: createTheme()})}));
vi.mock('../../../../../contexts/ThunderID/useThunderID', () => ({
  default: () => ({getStorageManager: vi.fn(), isInitialized: true, meta: null}),
}));
vi.mock('../../../../../hooks/useTranslation', () => ({
  default: () => ({t: (key: string): string => key}),
}));

const ownerInput = {id: 'owner_input', ref: 'owner', type: EmbeddedFlowComponentType.UserSelect};

describe('BaseInviteUser USER_SELECT data source', () => {
  beforeEach(() => {
    mocks.renderInviteUserComponents.mockReset().mockReturnValue([]);
  });

  it('gives the flow renderer the data source it was supplied', async () => {
    const fetchUsers: FetchUsers = vi.fn();
    const onInitialize = vi.fn().mockResolvedValue({
      data: {components: [ownerInput]},
      executionId: 'exec-1',
      flowStatus: 'INCOMPLETE',
    });

    render(<BaseInviteUser fetchUsers={fetchUsers} onInitialize={onInitialize} onSubmit={vi.fn()} />);

    await waitFor(() => expect(mocks.renderInviteUserComponents).toHaveBeenCalled());
    const options = mocks.renderInviteUserComponents.mock.calls.at(-1)![8] as {fetchUsers?: FetchUsers};
    expect(options.fetchUsers).toBe(fetchUsers);
  });
});

describe('BaseInviteUser USER_SELECT required-field validation', () => {
  interface RenderOptions {
    onSubmit: (component: unknown) => Promise<void>;
  }

  const mountWithRequiredOwner = async (required: boolean) => {
    const onSubmit = vi.fn().mockResolvedValue({data: {components: []}, flowStatus: 'INCOMPLETE'});
    const onInitialize = vi.fn().mockResolvedValue({
      data: {
        components: [
          {...ownerInput, label: 'Owner', required},
          {id: 'invite_action', type: 'ACTION'},
        ],
      },
      executionId: 'exec-1',
      flowStatus: 'INCOMPLETE',
    });

    render(<BaseInviteUser fetchUsers={vi.fn()} onInitialize={onInitialize} onSubmit={onSubmit} />);
    await waitFor(() => expect(mocks.renderInviteUserComponents).toHaveBeenCalled());

    const lastCall = (): unknown[] => mocks.renderInviteUserComponents.mock.calls.at(-1)!;
    const submit = (): Promise<void> =>
      act(async () => {
        await (lastCall()[8] as RenderOptions).onSubmit({id: 'invite_action'});
      });

    return {lastCall, onSubmit, submit};
  };

  beforeEach(() => {
    mocks.renderInviteUserComponents.mockReset().mockReturnValue([]);
  });

  it('blocks submission and surfaces a field error when a required picker is empty', async () => {
    const {lastCall, onSubmit, submit} = await mountWithRequiredOwner(true);

    await submit();

    expect(onSubmit).not.toHaveBeenCalled();
    await waitFor(() => expect(lastCall()[3]).toHaveProperty('owner'));
  });

  it('lets an optional picker stay empty', async () => {
    const {onSubmit, submit} = await mountWithRequiredOwner(false);

    await submit();

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('lets a required picker through once a user has been chosen', async () => {
    const {lastCall, onSubmit, submit} = await mountWithRequiredOwner(true);

    act(() => {
      (lastCall()[7] as (name: string, value: string) => void)('owner', 'user-1');
    });
    await submit();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const expectedInputs: unknown = expect.objectContaining({owner: 'user-1'});
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({inputs: expectedInputs}));
  });
});
