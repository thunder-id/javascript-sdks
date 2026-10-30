// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {cleanup, render, screen, waitFor} from '@testing-library/react';
import {ReactElement} from 'react';
import {Mock, afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import ThunderIDProvider from '../ThunderIDProvider';
import useThunderID from '../useThunderID';

type Noop = Mock<() => void>;
type SignInHookHandler = () => Promise<void>;
type UserProfileResponse = Record<string, string>;

/**
 * Minimal stand-in for {@link ThunderIDReactClient}, covering only what {@link ThunderIDProvider}
 * calls during mount and session sync.
 */
interface MockClient {
  clearSession: Noop;
  exchangeToken: Noop;
  getAccessToken: Noop;
  getConfiguration: Mock<() => Promise<{afterSignInUrl: string; baseUrl: string}>>;
  getDecodedIdToken: Mock<() => Promise<Record<string, string>>>;
  getDiscoveryResponse: Mock<() => Promise<null>>;
  getIdToken: Noop;
  getStorageManager: Noop;
  /** Callbacks registered through `client.on(...)`, keyed by event name. */
  handlers: Record<string, SignInHookHandler>;
  initialize: Mock<() => Promise<boolean>>;
  isInitialized: Mock<() => Promise<boolean>>;
  isLoading: Mock<() => boolean>;
  isSignedIn: Mock<() => Promise<boolean>>;
  on: Mock<(event: string, callback: SignInHookHandler) => Promise<void>>;
  reInitialize: Noop;
  recover: Noop;
  request: Noop;
  requestAll: Noop;
  signIn: Mock<() => Promise<Record<string, string>>>;
  signInSilently: Noop;
  signOut: Noop;
  signUp: Noop;
  /** Mutable sign-in state the mocked `isSignedIn()` reports. */
  signedIn: boolean;
  startAutoRefreshToken: Mock<() => Promise<void>>;
}

interface Mocks {
  client: MockClient;
  configureEmotionNonce: Mock<(nonce?: string) => void>;
  getUsersMe: Mock<() => Promise<UserProfileResponse>>;
}

const mocks: Mocks = vi.hoisted(() => ({}) as Mocks);

vi.mock('../../../ThunderIDReactClient', () => ({
  default: vi.fn(function MockThunderIDReactClient(): MockClient {
    return mocks.client;
  }),
}));

vi.mock('../../../api/account/getUsersMe', () => ({
  default: (): Promise<UserProfileResponse> => mocks.getUsersMe(),
}));

vi.mock('../../../styles/emotion', () => ({
  configureEmotionNonce: (nonce?: string): void => mocks.configureEmotionNonce(nonce),
}));

interface Deferred {
  promise: Promise<UserProfileResponse>;
  resolve: (value: UserProfileResponse) => void;
}

function createDeferred(): Deferred {
  let resolve!: (value: UserProfileResponse) => void;
  const promise: Promise<UserProfileResponse> = new Promise<UserProfileResponse>(
    (res: (value: UserProfileResponse) => void) => {
      resolve = res;
    },
  );

  return {promise, resolve};
}

function createMockClient(): MockClient {
  const handlers: Record<string, SignInHookHandler> = {};
  const client: MockClient = {
    clearSession: vi.fn(),
    exchangeToken: vi.fn(),
    getAccessToken: vi.fn(),
    getConfiguration: vi.fn(() =>
      Promise.resolve({afterSignInUrl: window.location.origin, baseUrl: 'https://localhost:8090'}),
    ),
    getDecodedIdToken: vi.fn(() => Promise.resolve({sub: 'user-1'})),
    getDiscoveryResponse: vi.fn(() => Promise.resolve(null)),
    getIdToken: vi.fn(),
    getStorageManager: vi.fn(),
    handlers,
    initialize: vi.fn(() => Promise.resolve(true)),
    isInitialized: vi.fn(() => Promise.resolve(true)),
    isLoading: vi.fn(() => false),
    isSignedIn: vi.fn(() => Promise.resolve(client.signedIn)),
    on: vi.fn((event: string, callback: SignInHookHandler) => {
      handlers[event] = callback;

      return Promise.resolve();
    }),
    reInitialize: vi.fn(),
    recover: vi.fn(),
    request: vi.fn(),
    requestAll: vi.fn(),
    signIn: vi.fn(() => Promise.resolve({sub: 'user-1'})),
    signInSilently: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    signedIn: false,
    startAutoRefreshToken: vi.fn(() => Promise.resolve()),
  };

  return client;
}

function renderProvider(): void {
  render(
    <ThunderIDProvider baseUrl="https://localhost:8090" clientId="test-client" preferences={{resolveFromMeta: false}}>
      <div data-testid="child" />
    </ThunderIDProvider>,
  );
}

const settle = (ms = 250): Promise<void> =>
  new Promise((resolve: () => void) => {
    setTimeout(resolve, ms);
  });

beforeEach(() => {
  mocks.client = createMockClient();
  mocks.getUsersMe = vi.fn(() => Promise.resolve({sub: 'user-1', userName: 'alice'}));
  mocks.configureEmotionNonce = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ThunderIDProvider CSP nonce configuration', () => {
  it('configures the shared Emotion instance with cspNonce synchronously on first render', () => {
    render(
      <ThunderIDProvider
        baseUrl="https://localhost:8090"
        clientId="test-client"
        cspNonce="test-nonce"
        preferences={{resolveFromMeta: false}}
      >
        <div data-testid="child" />
      </ThunderIDProvider>,
    );

    // No `waitFor`/async flush here on purpose: configureEmotionNonce is called as the
    // first statement in the component's render body, so it must already have been
    // invoked with the right value by the time render() returns synchronously.
    expect(mocks.configureEmotionNonce).toHaveBeenCalledWith('test-nonce');
  });

  it('configures the shared Emotion instance with undefined when cspNonce is not provided', () => {
    renderProvider();

    expect(mocks.configureEmotionNonce).toHaveBeenCalledWith(undefined);
  });
});

describe('ThunderIDProvider mount bootstrap', () => {
  it('fetches the user profile exactly once when the user is already signed in', async () => {
    mocks.client.signedIn = true;

    renderProvider();

    await waitFor(() => expect(mocks.getUsersMe).toHaveBeenCalled());
    await settle();

    expect(mocks.getUsersMe).toHaveBeenCalledTimes(1);
  });

  it('schedules the auto refresh timer exactly once per mount', async () => {
    mocks.client.signedIn = true;

    renderProvider();

    await waitFor(() => expect(mocks.client.startAutoRefreshToken).toHaveBeenCalled());
    await settle();

    expect(mocks.client.startAutoRefreshToken).toHaveBeenCalledTimes(1);
  });

  it('attempts the silent refresh before deciding the user is not signed in', () => {
    // The access token expired while the refresh token is still valid: startAutoRefreshToken()
    // refreshes it, and the sign-in check that follows must observe the refreshed state.
    mocks.client.startAutoRefreshToken = vi.fn(() => {
      mocks.client.signedIn = true;

      return Promise.resolve();
    });

    renderProvider();

    return waitFor(() => expect(mocks.getUsersMe).toHaveBeenCalled())
      .then(() => settle())
      .then(() => {
        expect(mocks.client.startAutoRefreshToken).toHaveBeenCalledTimes(1);
        expect(mocks.getUsersMe).toHaveBeenCalledTimes(1);
      });
  });
});

describe('ThunderIDProvider updateSession single-flight', () => {
  it('coalesces concurrent session updates onto a single /users/me request', async () => {
    renderProvider();

    await waitFor(() => expect(mocks.client.handlers['sign-in']).toBeDefined());

    const gate: Deferred = createDeferred();

    mocks.getUsersMe = vi.fn(() => gate.promise);
    mocks.client.signedIn = true;

    const first: Promise<void> = mocks.client.handlers['sign-in']();
    const second: Promise<void> = mocks.client.handlers['sign-in']();

    await settle(50);
    expect(mocks.getUsersMe).toHaveBeenCalledTimes(1);

    gate.resolve({sub: 'user-1', userName: 'alice'});

    await Promise.all([first, second]);

    expect(mocks.getUsersMe).toHaveBeenCalledTimes(1);
  });

  it('re-fetches for a session update issued after the previous one settled', async () => {
    renderProvider();

    await waitFor(() => expect(mocks.client.handlers['sign-in']).toBeDefined());

    mocks.client.signedIn = true;

    await mocks.client.handlers['sign-in']();
    expect(mocks.getUsersMe).toHaveBeenCalledTimes(1);

    await mocks.client.handlers['sign-in']();
    expect(mocks.getUsersMe).toHaveBeenCalledTimes(2);
  });
});

describe('ThunderIDProvider in backend mode', () => {
  it('initializes the client with the backend as baseUrl and builds API requests on its proxy', async () => {
    function ReadBaseUrl(): ReactElement {
      return <div data-testid="base-url">{useThunderID().baseUrl}</div>;
    }

    render(
      <ThunderIDProvider
        baseUrl="https://app.example.com"
        clientId="test-client"
        endpoints={{backend: {proxy: '/gateway/api'}}}
        preferences={{resolveFromMeta: false}}
      >
        <ReadBaseUrl />
      </ThunderIDProvider>,
    );

    await waitFor(() => expect(mocks.client.initialize).toHaveBeenCalled());
    expect(mocks.client.initialize.mock.calls[0][0]).toMatchObject({baseUrl: 'https://app.example.com'});
    expect(screen.getByTestId('base-url').textContent).toBe('https://app.example.com/gateway/api');
  });
});
