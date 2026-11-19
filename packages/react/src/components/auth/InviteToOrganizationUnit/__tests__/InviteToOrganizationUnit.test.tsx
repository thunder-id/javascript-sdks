// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, render, waitFor} from '@testing-library/react';
import {createTheme} from '@thunderid/browser';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import InviteToOrganizationUnit from '../InviteToOrganizationUnit';

const mocks = vi.hoisted(() => ({
  thunderID: {
    baseUrl: 'https://thunder.example',
    endpoints: undefined as {flowExecute?: string} | undefined,
    getStorageManager: vi.fn(),
    http: {request: vi.fn()},
    isInitialized: true,
    meta: null,
  },
}));

vi.mock('../../../../contexts/Theme/useTheme', () => ({default: () => ({colorScheme: 'light', theme: createTheme()})}));
vi.mock('../../../../contexts/ThunderID/useThunderID', () => ({default: () => mocks.thunderID}));
vi.mock('../../../../hooks/useTranslation', () => ({
  default: () => ({t: (key: string): string => key}),
}));

describe('InviteToOrganizationUnit', () => {
  beforeEach(() => {
    mocks.thunderID.endpoints = undefined;
    mocks.thunderID.http.request.mockReset().mockResolvedValue({
      data: {data: {components: []}, executionId: 'exec-1', flowStatus: 'INCOMPLETE'},
    });
  });
  afterEach(cleanup);

  it('starts the flow by ID with the signed-in user’s requests to the flow execution endpoint', async () => {
    render(<InviteToOrganizationUnit flowId="flow-1" />);

    await waitFor(() => expect(mocks.thunderID.http.request).toHaveBeenCalledTimes(1));
    expect(mocks.thunderID.http.request).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {flowId: 'flow-1', verbose: true},
        method: 'POST',
        url: 'https://thunder.example/flow/execute',
      }),
    );
  });

  it('honours the flowExecute endpoint override', async () => {
    mocks.thunderID.endpoints = {flowExecute: 'https://resources.example/flow/execute'};

    render(<InviteToOrganizationUnit flowId="flow-1" />);

    await waitFor(() =>
      expect(mocks.thunderID.http.request).toHaveBeenCalledWith(
        expect.objectContaining({url: 'https://resources.example/flow/execute'}),
      ),
    );
  });
});
