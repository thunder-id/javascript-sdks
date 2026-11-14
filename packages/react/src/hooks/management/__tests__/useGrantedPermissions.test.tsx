// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, renderHook, waitFor} from '@testing-library/react';
import {ReactElement, ReactNode} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import ThunderIDContext, {ThunderIDContextProps} from '../../../contexts/ThunderID/ThunderIDContext';
import useGrantedPermissions from '../useGrantedPermissions';

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
  it('reads the granted permissions from the client', async () => {
    const getGrantedPermissions = vi.fn().mockResolvedValue(['openid', 'system:group']);

    const {result} = renderHook(() => useGrantedPermissions(), {
      wrapper: wrapperWith({getGrantedPermissions, isSignedIn: true}),
    });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.permissions).toEqual(['openid', 'system:group']);
    expect(result.current.can('system:group:view')).toBe(true);
    expect(result.current.can('system:user:view')).toBe(false);
  });

  it('matches by the resource server passed to can', async () => {
    const getGrantedPermissions = vi.fn().mockResolvedValue(['orders']);

    const {result} = renderHook(() => useGrantedPermissions(), {
      wrapper: wrapperWith({getGrantedPermissions, isSignedIn: true}),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.can('orders:create')).toBe(true);
    expect(result.current.can('orders:create', {hierarchical: false})).toBe(false);
    expect(result.current.can('orders.create', {delimiter: '.'})).toBe(true);
  });

  it('grants nothing when signed out, without asking the client', () => {
    const getGrantedPermissions = vi.fn();

    const {result} = renderHook(() => useGrantedPermissions(), {
      wrapper: wrapperWith({getGrantedPermissions, isSignedIn: false}),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.permissions).toEqual([]);
    expect(getGrantedPermissions).not.toHaveBeenCalled();
  });

  it('grants nothing when the permissions cannot be read', async () => {
    const getGrantedPermissions = vi.fn().mockRejectedValue(new Error('no session'));

    const {result} = renderHook(() => useGrantedPermissions(), {
      wrapper: wrapperWith({getGrantedPermissions, isSignedIn: true}),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.can('system:user:view')).toBe(false);
  });
});
