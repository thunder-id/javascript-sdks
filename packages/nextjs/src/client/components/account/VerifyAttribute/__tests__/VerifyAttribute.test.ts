// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {ReactElement} from 'react';
import {describe, expect, it, Mock, vi} from 'vitest';

const BaseVerifyAttribute: () => null = () => null;
const revalidateProfile: Mock = vi.fn().mockResolvedValue(undefined);

vi.mock('react', async (importOriginal: () => Promise<Record<string, unknown>>) => ({
  ...(await importOriginal()),
  // Lets the component run outside a renderer; it only memoises callbacks.
  useCallback: <T>(callback: T): T => callback,
}));

vi.mock('@thunderid/react', () => ({
  BaseVerifyAttribute,
  useUser: () => ({revalidateProfile, userSchema: {email: {type: 'email'}}}),
}));

vi.mock('../../../../contexts/ThunderID/useThunderID', () => ({
  default: () => ({isLoading: false}),
}));

const executeSelfServiceFlowAction: Mock = vi.fn();

vi.mock('../../../../../server/actions/auth/executeSelfServiceFlowAction', () => ({
  default: (...args: unknown[]): unknown => executeSelfServiceFlowAction(...args) as unknown,
}));

const {default: VerifyAttribute} = await import('../VerifyAttribute');

describe('VerifyAttribute', () => {
  it('refuses an attribute the schema does not mark verifiable without calling the server', async () => {
    const element: ReactElement<Record<string, (...args: unknown[]) => Promise<unknown>>> = VerifyAttribute({
      attribute: 'given_name',
    }) as ReactElement<Record<string, (...args: unknown[]) => Promise<unknown>>>;

    await expect(element.props['onInitialize']()).rejects.toMatchObject({
      code: 'VerifyAttribute-handleInitialize-RuntimeError-001',
    });
    expect(executeSelfServiceFlowAction).not.toHaveBeenCalled();
  });
});

describe('VerifyAttribute custom render', () => {
  it('hands its children render function to BaseVerifyAttribute and keeps the profile re-read on completion', async () => {
    const custom: Mock = vi.fn();
    const onComplete: Mock = vi.fn();
    const element: ReactElement<Record<string, (...args: unknown[]) => unknown>> = VerifyAttribute({
      attribute: 'email',
      children: custom,
      onComplete,
    }) as ReactElement<Record<string, (...args: unknown[]) => unknown>>;

    expect(element.type).toBe(BaseVerifyAttribute);
    expect(element.props['children']).toBe(custom);

    element.props['onComplete']({executionId: 'exec-1', flowStatus: 'COMPLETE'});
    await Promise.resolve();

    expect(revalidateProfile).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith({executionId: 'exec-1', flowStatus: 'COMPLETE'});
  });
});
