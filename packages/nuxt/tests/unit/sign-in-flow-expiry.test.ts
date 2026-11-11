// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/typedef, @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-function-return-type */

import {describe, expect, it, vi} from 'vitest';
import {effectScope, nextTick, ref} from 'vue';

const signIn = vi.fn();
const expireFlow = vi.fn();
const clearFlowRestarted = vi.fn();

vi.mock('@thunderid/browser', () => ({
  ConsentConstants: {},
  EmbeddedFlowType: {Authentication: 'AUTHENTICATION'},
  EmbeddedSignInFlowStatus: {Complete: 'COMPLETE', Error: 'ERROR'},
  EmbeddedSignInFlowType: {Redirection: 'REDIRECTION'},
  ThunderIDRuntimeError: class ThunderIDRuntimeError extends Error {},
  isFlowExpiredError: (error: any) => error?.serverError?.code === 'FES-1004',
}));

vi.mock('@thunderid/vue', () => ({
  BaseSignIn: {name: 'BaseSignIn'},
  extractErrorMessage: vi.fn(() => 'error'),
  handlePasskeyAuthentication: vi.fn(),
  handlePasskeyRegistration: vi.fn(),
  initiateOAuthRedirect: vi.fn(),
  normalizeFlowResponse: vi.fn((response: any) => ({
    additionalData: {},
    components: [],
    executionId: response.executionId,
  })),
  useFlowExpiryHandling: () => ({
    clearFlowRestarted,
    expireFlow,
    flowExpiryRedirect: ref(null),
    isFlowExpired: ref(false),
    isFlowRestarted: ref(false),
    restartFlow: vi.fn(),
    restartsInPlace: ref(true),
  }),
  useFlowMeta: () => ({meta: ref(null)}),
  useI18n: () => ({t: (key: string) => key}),
  useOAuthCallback: vi.fn(),
}));

vi.mock('#imports', () => ({
  useThunderID: () => ({
    afterSignInUrl: '/',
    applicationId: 'app-1',
    getStorageManager: undefined,
    isInitialized: ref(true),
    isLoading: ref(false),
    scopes: undefined,
    signIn,
    vendor: 'thunderid',
  }),
}));

const {default: SignIn} = await import('../../src/runtime/components/auth/SignIn');

describe('SignIn flow expiry', () => {
  it('expires the flow, rather than showing an error, when the server refuses a step as expired', async () => {
    signIn
      .mockResolvedValueOnce({executionId: 'e-1', flowStatus: 'INCOMPLETE'})
      .mockRejectedValueOnce(Object.assign(new Error('Invalid request'), {serverError: {code: 'FES-1004'}}));
    const emit = vi.fn();
    const scope = effectScope();
    const render = scope.run(() =>
      (SignIn as any).setup({className: '', size: 'medium', variant: 'outlined'}, {attrs: {}, emit, slots: {}} as any),
    );
    await nextTick();
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    await render().props.onSubmit({executionId: 'e-1', inputs: {}});

    expect(clearFlowRestarted).toHaveBeenCalled();
    expect(expireFlow).toHaveBeenCalledTimes(1);
    expect(emit).not.toHaveBeenCalledWith('error', expect.anything());
    expect(render().props.error).toBeNull();
    expect(render().props).toMatchObject({isFlowExpired: false, isFlowRestarted: false});

    scope.stop();
  });
});
