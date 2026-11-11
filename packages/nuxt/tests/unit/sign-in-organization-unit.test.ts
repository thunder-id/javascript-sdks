// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/typedef, @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-function-return-type */

import {describe, expect, it, vi} from 'vitest';
import {effectScope, nextTick, ref} from 'vue';

const signIn = vi.fn().mockResolvedValue({executionId: 'exec-1', flowStatus: 'INCOMPLETE'});

vi.mock('@thunderid/browser', () => ({
  ConsentConstants: {},
  EmbeddedFlowType: {Authentication: 'AUTHENTICATION'},
  EmbeddedSignInFlowStatus: {Complete: 'COMPLETE', Error: 'ERROR'},
  EmbeddedSignInFlowType: {Redirection: 'REDIRECTION'},
  ThunderIDRuntimeError: class ThunderIDRuntimeError extends Error {},
}));

vi.mock('@thunderid/vue', () => ({
  BaseSignIn: {name: 'BaseSignIn'},
  extractErrorMessage: vi.fn(() => 'error'),
  handlePasskeyAuthentication: vi.fn(),
  handlePasskeyRegistration: vi.fn(),
  initiateOAuthRedirect: vi.fn(),
  normalizeFlowResponse: vi.fn(() => ({components: [], executionId: 'exec-1'})),
  useFlowExpiryHandling: () => ({
    clearFlowRestarted: vi.fn(),
    expireFlow: vi.fn(),
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

describe('SignIn (Nuxt) organizationUnitId', () => {
  it('sends ouId on the request that starts the flow', async () => {
    const scope = effectScope();
    scope.run(() =>
      (SignIn as any).setup({className: '', organizationUnitId: 'ou-1', size: 'medium', variant: 'outlined'}, {
        attrs: {},
        emit: vi.fn(),
        slots: {},
      } as any),
    );

    await nextTick();
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(signIn).toHaveBeenCalledWith(
      expect.objectContaining({applicationId: 'app-1', flowType: 'AUTHENTICATION', ouId: 'ou-1'}),
    );

    scope.stop();
  });
});
