// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/typedef, @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-function-return-type */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {effectScope, nextTick, ref} from 'vue';

const signIn = vi.fn();

vi.mock('@thunderid/browser', () => ({
  ConsentConstants: {},
  EmbeddedFlowType: {Authentication: 'AUTHENTICATION'},
  EmbeddedSignInFlowStatus: {Complete: 'COMPLETE', Error: 'ERROR'},
  EmbeddedSignInFlowType: {Redirection: 'REDIRECTION'},
  ThunderIDRuntimeError: class ThunderIDRuntimeError extends Error {
    constructor(
      message: string,
      public code: string,
      public origin: string,
    ) {
      super(message);
    }
  },
}));

vi.mock('@thunderid/vue', () => ({
  BaseSignIn: {name: 'BaseSignIn'},
  extractErrorMessage: vi.fn(() => 'error'),
  handlePasskeyAuthentication: vi.fn(),
  handlePasskeyRegistration: vi.fn(),
  initiateOAuthRedirect: vi.fn(),
  normalizeFlowResponse: vi.fn(() => ({})),
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
    applicationId: undefined,
    getStorageManager: undefined,
    isInitialized: ref(true),
    isLoading: ref(false),
    scopes: undefined,
    signIn,
    vendor: 'thunderid',
  }),
}));

const {default: SignIn} = await import('../../src/runtime/components/auth/SignIn');

const unhandled: unknown[] = [];
const onUnhandledRejection = (reason: unknown) => {
  unhandled.push(reason);
};

beforeEach(() => {
  unhandled.length = 0;
  process.on('unhandledRejection', onUnhandledRejection);
});

afterEach(() => {
  process.off('unhandledRejection', onUnhandledRejection);
});

describe('SignIn', () => {
  it('reports a missing application ID as an error without an unhandled rejection', async () => {
    const emit = vi.fn();
    const scope = effectScope();
    const render = scope.run(() =>
      (SignIn as any).setup({className: '', size: 'medium', variant: 'outlined'}, {attrs: {}, emit, slots: {}} as any),
    );

    await nextTick();
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(unhandled).toEqual([]);
    expect(signIn).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith(
      'error',
      expect.objectContaining({message: 'Either executionId or applicationId is required for authentication'}),
    );
    expect(render().props.error).toEqual(
      expect.objectContaining({message: 'Either executionId or applicationId is required for authentication'}),
    );

    scope.stop();
  });
});
