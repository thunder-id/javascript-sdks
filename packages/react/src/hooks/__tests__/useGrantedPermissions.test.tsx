// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, renderHook, waitFor} from '@testing-library/react';
import {ReactElement, ReactNode} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import ThunderIDContext, {ThunderIDContextProps} from '../../contexts/ThunderID/ThunderIDContext';
import useGrantedPermissions from '../useGrantedPermissions';

const tokenWithScope = (scope: string): string => {
  const encode = (value: unknown): string =>
    btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  return `${encode({alg: 'none'})}.${encode({scope})}.signature`;
};

const wrapperWith = (value: Partial<ThunderIDContextProps>): ((props: {children: ReactNode}) => ReactElement) =>
  function Wrapper({children}: {children: ReactNode}): ReactElement {
    return (
      <ThunderIDContext.Provider value={value as unknown as ThunderIDContextProps}>
        {children}
      </ThunderIDContext.Provider>
    );
  };

afterEach(() => {
  cleanup();
});

describe('useGrantedPermissions', () => {
  it('reads the permissions the access token grants', async () => {
    const getAccessToken = vi.fn().mockResolvedValue(tokenWithScope('openid system:group'));

    const {result} = renderHook(() => useGrantedPermissions(), {
      wrapper: wrapperWith({getAccessToken, isSignedIn: true}),
    });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.permissions).toEqual(['openid', 'system:group']);
    expect(result.current.can('system:group:view')).toBe(true);
    expect(result.current.can('system:user:view')).toBe(false);
  });

  it('grants nothing when signed out, without asking for a token', () => {
    const getAccessToken = vi.fn();

    const {result} = renderHook(() => useGrantedPermissions(), {
      wrapper: wrapperWith({getAccessToken, isSignedIn: false}),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.permissions).toEqual([]);
    expect(getAccessToken).not.toHaveBeenCalled();
  });

  it('grants nothing when the token cannot be read', async () => {
    const getAccessToken = vi.fn().mockRejectedValue(new Error('no session'));

    const {result} = renderHook(() => useGrantedPermissions(), {
      wrapper: wrapperWith({getAccessToken, isSignedIn: true}),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.can('system:user:view')).toBe(false);
  });
});
