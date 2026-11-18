// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/typedef, @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-function-return-type */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {effectScope, nextTick, ref, shallowRef} from 'vue';

const signIn = vi.fn();
const flowMocks = vi.hoisted(() => ({
  expireFlow: vi.fn(),
  expiryOptions: undefined as any,
  replaceLocation: vi.fn(),
  returnTarget: undefined as any,
}));

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
  replaceLocation: flowMocks.replaceLocation,
}));

vi.mock('@thunderid/vue', () => ({
  BaseSignIn: {name: 'BaseSignIn'},
  extractErrorMessage: vi.fn(() => 'error'),
  handlePasskeyAuthentication: vi.fn(),
  handlePasskeyRegistration: vi.fn(),
  initiateOAuthRedirect: vi.fn(),
  normalizeFlowResponse: vi.fn(() => ({})),
  useFlowExpiryHandling: (options: any) => {
    flowMocks.expiryOptions = options;
    return {
      clearFlowRestarted: vi.fn(),
      expireFlow: flowMocks.expireFlow,
      flowExpiryRedirect: ref(null),
      isFlowExpired: ref(false),
      isFlowRestarted: ref(false),
      restartFlow: vi.fn(),
      restartsInPlace: ref(true),
      returnTarget: flowMocks.returnTarget,
    };
  },
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
  flowMocks.expireFlow.mockClear();
  flowMocks.replaceLocation.mockClear();
  // The lookup found nowhere to go back to, unless a test says otherwise.
  flowMocks.returnTarget = shallowRef({});
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

  const setUp = (props: Record<string, unknown> = {}) => {
    const emit = vi.fn();
    const scope = effectScope();
    scope.run(() =>
      (SignIn as any).setup({className: '', size: 'medium', variant: 'outlined', ...props}, {
        attrs: {},
        emit,
        slots: {},
      } as any),
    );
    return {emit, scope};
  };

  const settle = async () => {
    await nextTick();
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  };

  it('goes straight back instead of reporting an error when the page has no flow and a return URL is known', async () => {
    flowMocks.returnTarget = shallowRef({url: 'https://home.example.com'});
    const {emit, scope} = setUp();

    await settle();

    expect(flowMocks.replaceLocation).toHaveBeenCalledWith('https://home.example.com');
    expect(flowMocks.expireFlow).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalledWith('error', expect.anything());
    expect(signIn).not.toHaveBeenCalled();

    scope.stop();
  });

  it('goes straight to afterFlowExpiredUrl when the page has no flow', async () => {
    flowMocks.returnTarget = shallowRef(undefined);
    const {emit, scope} = setUp({afterFlowExpiredUrl: 'https://app.example.com'});

    await settle();

    expect(flowMocks.replaceLocation).toHaveBeenCalledWith('https://app.example.com');
    expect(emit).not.toHaveBeenCalledWith('error', expect.anything());

    scope.stop();
  });

  it('looks the ref from the page URL up through the same-origin meta route', async () => {
    const $fetch = vi.fn().mockResolvedValue({application: {url: 'https://acme.example.com'}});
    vi.stubGlobal('$fetch', $fetch);
    vi.stubGlobal('window', {location: {href: 'https://idp.example.com/gate/signin?ref=r1', search: '?ref=r1'}});
    const {scope} = setUp();

    const lookup = flowMocks.expiryOptions.returnUrlLookup;
    expect(lookup.ref).toBe('r1');
    await expect(lookup.fetchMeta({id: 'r1', type: 'REF'})).resolves.toEqual({
      application: {url: 'https://acme.example.com'},
    });
    expect($fetch).toHaveBeenCalledWith('/api/auth/meta', {query: {id: 'r1', type: 'REF'}});

    scope.stop();
    vi.unstubAllGlobals();
  });
});
