// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {render, waitFor, cleanup} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi, Mock} from 'vitest';
import ThunderIDContext, {ThunderIDContextProps} from '../../../../contexts/ThunderID/ThunderIDContext';
import {TokenCallback} from '../TokenCallback';

const mockSignIn = vi.fn() as Mock;
const mockSignUp = vi.fn() as Mock;
const mockSetTemporaryDataParameter = vi.fn() as Mock;
const mockRemoveTemporaryDataParameter = vi.fn() as Mock;

const mockRemoveFlowAuthId = vi.fn() as Mock;

const thunderIDContext: ThunderIDContextProps = {
  afterSignInUrl: undefined,
  getStorageManager: vi.fn(() =>
    Promise.resolve({
      removeFlowAuthId: mockRemoveFlowAuthId,
      removeTemporaryDataParameter: mockRemoveTemporaryDataParameter,
      setTemporaryDataParameter: mockSetTemporaryDataParameter,
    }),
  ),
  isInitialized: true,
  isLoading: false,
  signIn: mockSignIn,
  signUp: mockSignUp,
  vendor: 'thunderid',
} as unknown as ThunderIDContextProps;

describe('TokenCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('verifies the token as an authentication flow when type=AUTHENTICATION is present', async () => {
    const onNavigate = vi.fn();
    mockSignIn.mockResolvedValue({
      executionId: 'next-exec',
      flowStatus: 'INCOMPLETE',
      type: 'VIEW',
    });
    window.history.replaceState(
      {},
      '',
      '/callback?id=exec-1&applicationId=app-1&token=secret-token&type=AUTHENTICATION',
    );

    render(
      <ThunderIDContext.Provider value={thunderIDContext}>
        <TokenCallback onNavigate={onNavigate} />
      </ThunderIDContext.Provider>,
    );

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        executionId: 'exec-1',
        inputs: {
          token: 'secret-token',
        },
      });
    });

    expect(new URL(window.location.href).searchParams.get('token')).toBeNull();
    expect(new URL(window.location.href).searchParams.get('type')).toBeNull();
    expect(sessionStorage.getItem('thunderid_execution_id')).toBe('next-exec');
    expect(onNavigate).toHaveBeenCalledWith('/signin?executionId=next-exec&applicationId=app-1');
  });

  it('verifies the token as a registration flow when type=REGISTRATION is present', async () => {
    const onNavigate = vi.fn();
    mockSignUp.mockResolvedValue({
      executionId: 'next-exec',
      flowStatus: 'INCOMPLETE',
      type: 'VIEW',
    });
    window.history.replaceState({}, '', '/callback?id=exec-1&applicationId=app-1&token=secret-token&type=REGISTRATION');

    render(
      <ThunderIDContext.Provider value={thunderIDContext}>
        <TokenCallback onNavigate={onNavigate} />
      </ThunderIDContext.Provider>,
    );

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        executionId: 'exec-1',
        inputs: {
          token: 'secret-token',
        },
      });
    });

    expect(new URL(window.location.href).searchParams.get('token')).toBeNull();
    expect(new URL(window.location.href).searchParams.get('type')).toBeNull();
    expect(sessionStorage.getItem('thunderid_execution_id')).toBe('next-exec');
    expect(onNavigate).toHaveBeenCalledWith('/signup?executionId=next-exec&applicationId=app-1');
  });

  it('redirects to sign-in with an error when required parameters are missing', async () => {
    const onError = vi.fn();
    const onNavigate = vi.fn();
    window.history.replaceState({}, '', '/callback?id=exec-1');

    render(
      <ThunderIDContext.Provider value={thunderIDContext}>
        <TokenCallback onError={onError} onNavigate={onNavigate} />
      </ThunderIDContext.Provider>,
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({message: 'Missing executionId or token in callback URL'}),
      );
    });

    expect(mockSignIn).not.toHaveBeenCalled();
    expect(onNavigate).toHaveBeenCalledWith(
      '/signin?error=token_verification_failed&error_description=Missing+executionId+or+token+in+callback+URL',
    );
  });

  it('redirects to sign-in with an error when verification fails', async () => {
    const onError = vi.fn();
    const onNavigate = vi.fn();
    mockSignIn.mockRejectedValue(new Error('Invalid token'));
    window.history.replaceState({}, '', '/callback?id=exec-1&token=secret-token');

    render(
      <ThunderIDContext.Provider value={thunderIDContext}>
        <TokenCallback onError={onError} onNavigate={onNavigate} />
      </ThunderIDContext.Provider>,
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.objectContaining({message: 'Invalid token'}));
    });

    expect(onNavigate).toHaveBeenCalledWith('/signin?error=token_verification_failed&error_description=Invalid+token');
    // Only this link's execution is cleared, so a sign-in running in another tab keeps its authId.
    expect(mockRemoveFlowAuthId).toHaveBeenCalledWith('exec-1');
  });
});
