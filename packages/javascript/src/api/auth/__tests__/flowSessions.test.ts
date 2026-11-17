// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {FlowSessionStore} from '../../../models/embedded-flow';
import {collectFlowSessions, createCallFlowSessionStore, takeFlowSessions} from '../flowSessions';

describe('flowSessions', (): void => {
  let store: FlowSessionStore;

  beforeEach((): void => {
    vi.useFakeTimers();
    store = createCallFlowSessionStore();
  });

  afterEach((): void => {
    vi.useRealTimers();
  });

  it('posts the time a session has left', async (): Promise<void> => {
    await collectFlowSessions(store, 'time-left', {
      sessionData: [{expiresIn: 600, flowIdentifier: 'flow-a', sessionHandle: 'handle-a'}],
    });
    vi.advanceTimersByTime(100_000);

    expect(await takeFlowSessions(store, 'time-left')).toEqual([
      {expiresIn: 500, flowIdentifier: 'flow-a', sessionHandle: 'handle-a'},
    ]);
  });

  it('posts a session that did not say when it ends without a time left', async (): Promise<void> => {
    await collectFlowSessions(store, 'no-end', {sessionData: [{flowIdentifier: 'flow-a', sessionHandle: 'handle-a'}]});

    expect(await takeFlowSessions(store, 'no-end')).toEqual([{flowIdentifier: 'flow-a', sessionHandle: 'handle-a'}]);
  });

  it('does not post a session that has ended', async (): Promise<void> => {
    await collectFlowSessions(store, 'ended', {
      sessionData: [
        {expiresIn: 10, flowIdentifier: 'flow-a', sessionHandle: 'handle-a'},
        {expiresIn: 600, flowIdentifier: 'flow-b', sessionHandle: 'handle-b'},
      ],
    });
    vi.advanceTimersByTime(10_000);

    expect(await takeFlowSessions(store, 'ended')).toEqual([
      {expiresIn: 590, flowIdentifier: 'flow-b', sessionHandle: 'handle-b'},
    ]);
  });

  it('posts what the latest response said for a flow', async (): Promise<void> => {
    await collectFlowSessions(store, 'latest', {
      sessionData: [{expiresIn: 600, flowIdentifier: 'flow-a', sessionHandle: 'handle-old'}],
    });
    await collectFlowSessions(store, 'latest', {
      sessionData: [{expiresIn: 1200, flowIdentifier: 'flow-a', sessionHandle: 'handle-new'}],
    });

    expect(await takeFlowSessions(store, 'latest')).toEqual([
      {expiresIn: 1200, flowIdentifier: 'flow-a', sessionHandle: 'handle-new'},
    ]);
  });

  it('keeps each flow in an entry of its own and forgets it once taken', async (): Promise<void> => {
    await collectFlowSessions(store, 'flow-1', {sessionData: [{flowIdentifier: 'flow-a', sessionHandle: 'handle-1'}]});
    await collectFlowSessions(store, 'flow-2', {sessionData: [{flowIdentifier: 'flow-a', sessionHandle: 'handle-2'}]});

    expect(await takeFlowSessions(store, 'flow-1')).toEqual([{flowIdentifier: 'flow-a', sessionHandle: 'handle-1'}]);
    expect(await takeFlowSessions(store, 'flow-1')).toEqual([]);
    expect(await store.getFlowSessions('flow-2')).toEqual([{flowIdentifier: 'flow-a', sessionHandle: 'handle-2'}]);
  });

  it('drops the entry of a flow whose sessions were all cleared', async (): Promise<void> => {
    await collectFlowSessions(store, 'cleared', {sessionData: [{flowIdentifier: 'flow-a', sessionHandle: 'handle-a'}]});
    await collectFlowSessions(store, 'cleared', {clearedSessions: ['flow-a']});
    const removeFlowSessions = vi.spyOn(store, 'removeFlowSessions');

    expect(await takeFlowSessions(store, 'cleared')).toEqual([]);
    expect(removeFlowSessions).toHaveBeenCalledWith('cleared');
  });

  it('holds nothing between stores, so each call store lasts only its call', async (): Promise<void> => {
    await collectFlowSessions(store, 'call', {sessionData: [{flowIdentifier: 'flow-a', sessionHandle: 'handle-a'}]});

    expect(await takeFlowSessions(createCallFlowSessionStore(), 'call')).toEqual([]);
  });

  it('goes on without the sessions when the store fails', async (): Promise<void> => {
    const failing: FlowSessionStore = {
      getFlowSessions: vi.fn().mockRejectedValue(new Error('storage unavailable')),
      removeFlowSessions: vi.fn().mockRejectedValue(new Error('storage unavailable')),
      setFlowSessions: vi.fn().mockRejectedValue(new Error('storage unavailable')),
    };

    await expect(
      collectFlowSessions(failing, 'failing', {sessionData: [{flowIdentifier: 'flow-a', sessionHandle: 'handle-a'}]}),
    ).resolves.toBeUndefined();
    expect(await takeFlowSessions(failing, 'failing')).toEqual([]);
  });
});
