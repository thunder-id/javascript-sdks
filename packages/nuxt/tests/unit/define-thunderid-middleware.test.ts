// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/typedef, sort-keys, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars, @typescript-eslint/naming-convention */

import {describe, it, expect, vi, beforeEach} from 'vitest';

import {
  defineThunderIDMiddleware,
  ThunderIDMiddlewareOptions,
} from '../../src/runtime/middleware/defineThunderIDMiddleware';

// ── Mock Nuxt's #app module ────────────────────────────────────────────────
// defineThunderIDMiddleware depends on defineNuxtRouteMiddleware, navigateTo,
// and useState from '#app'.  We stub all three so the tests run in pure Node.

let _navigateToTarget: string | undefined;
let _authState = {
  isSignedIn: false,
  user: null as Record<string, unknown> | null,
  isLoading: false,
  organizationId: undefined as string | undefined,
  scopes: undefined as string | undefined,
};

vi.mock('#app', () => {
  const navigateTo = vi.fn(async (url: string) => {
    _navigateToTarget = url;
  });

  const useState = vi.fn((_key: string) => ({
    get value() {
      return _authState;
    },
    set value(v: typeof _authState) {
      _authState = v;
    },
  }));

  // defineNuxtRouteMiddleware just returns the handler unchanged in tests
  const defineNuxtRouteMiddleware = vi.fn((fn: Function) => fn);

  const useRuntimeConfig = vi.fn(() => ({
    public: {thunderid: {vendor: 'thunderid'}},
  }));

  return {navigateTo, useState, defineNuxtRouteMiddleware, useRuntimeConfig};
});

/** Build a fake `to` route object */
const makeTo = (fullPath = '/dashboard') => ({fullPath});

beforeEach(() => {
  _navigateToTarget = undefined;
  _authState = {isSignedIn: false, user: null, isLoading: false, organizationId: undefined, scopes: undefined};
});

describe('defineThunderIDMiddleware', () => {
  describe('unauthenticated user', () => {
    it('redirects to /api/auth/signin by default', async () => {
      const middleware = defineThunderIDMiddleware();
      await (middleware as Function)(makeTo('/dashboard'), makeTo('/'));
      expect(_navigateToTarget).toContain('/api/auth/signin');
    });

    it('includes a returnTo query param encoding the original path', async () => {
      const middleware = defineThunderIDMiddleware();
      await (middleware as Function)(makeTo('/dashboard'), makeTo('/'));
      expect(_navigateToTarget).toContain('returnTo=');
      expect(_navigateToTarget).toContain(encodeURIComponent('/dashboard'));
    });

    it('honours a custom redirectTo', async () => {
      const middleware = defineThunderIDMiddleware({redirectTo: '/login'});
      await (middleware as Function)(makeTo('/secret'), makeTo('/'));
      expect(_navigateToTarget).toContain('/login');
    });
  });

  describe('authenticated user', () => {
    beforeEach(() => {
      _authState = {
        isSignedIn: true,
        user: {sub: 'user1'},
        isLoading: false,
        organizationId: 'org1',
        scopes: 'openid profile',
      };
    });

    it('allows access when signed in', async () => {
      const middleware = defineThunderIDMiddleware();
      await (middleware as Function)(makeTo('/dashboard'), makeTo('/'));
      // navigateTo should NOT have been called
      expect(_navigateToTarget).toBeUndefined();
    });

    it('allows access when required scopes are present', async () => {
      const middleware = defineThunderIDMiddleware({requireScopes: ['openid', 'profile']});
      await (middleware as Function)(makeTo('/dashboard'), makeTo('/'));
      expect(_navigateToTarget).toBeUndefined();
    });

    it('reads the scopes granted to the session, not a scopes field on the user', async () => {
      _authState.user = {scopes: 'admin'};
      _authState.scopes = 'openid profile';

      await (defineThunderIDMiddleware({requireScopes: ['openid', 'profile']}) as Function)(makeTo('/a'), makeTo('/'));
      expect(_navigateToTarget).toBeUndefined();

      await (defineThunderIDMiddleware({requireScopes: ['admin']}) as Function)(makeTo('/a'), makeTo('/'));
      expect(_navigateToTarget).toBeDefined();
    });

    it('requires an exact scope by default', async () => {
      _authState.scopes = 'openid reservations';

      await (defineThunderIDMiddleware({requireScopes: ['reservations:create']}) as Function)(
        makeTo('/a'),
        makeTo('/'),
      );
      expect(_navigateToTarget).toBeDefined();
    });

    it('accepts a granted parent for a required child with hierarchical scope matching', async () => {
      _authState.scopes = 'openid reservations';

      await (
        defineThunderIDMiddleware({requireScopes: ['reservations:create'], scopeMatching: {delimiter: ':'}}) as Function
      )(makeTo('/a'), makeTo('/'));
      expect(_navigateToTarget).toBeUndefined();

      await (
        defineThunderIDMiddleware({requireScopes: ['invoices:create'], scopeMatching: {delimiter: ':'}}) as Function
      )(makeTo('/a'), makeTo('/'));
      expect(_navigateToTarget).toBeDefined();
    });

    it('redirects when a required scope is missing', async () => {
      const middleware = defineThunderIDMiddleware({requireScopes: ['admin']});
      await (middleware as Function)(makeTo('/admin'), makeTo('/'));
      expect(_navigateToTarget).toBeDefined();
    });

    it('allows access when requireOrganization is true and organizationId is present', async () => {
      const middleware = defineThunderIDMiddleware({requireOrganization: true});
      await (middleware as Function)(makeTo('/org-page'), makeTo('/'));
      expect(_navigateToTarget).toBeUndefined();
    });

    it('reads the organization of the session, not an organizationId field on the user', async () => {
      _authState.user = {organizationId: 'org-from-user'};
      _authState.organizationId = undefined;
      await (defineThunderIDMiddleware({requireOrganization: true}) as Function)(makeTo('/o'), makeTo('/'));
      expect(_navigateToTarget).toBeDefined();

      _navigateToTarget = undefined;
      _authState.user = {sub: 'user1'};
      _authState.organizationId = 'org1';
      await (defineThunderIDMiddleware({requireOrganization: true}) as Function)(makeTo('/o'), makeTo('/'));
      expect(_navigateToTarget).toBeUndefined();
    });

    it('redirects when requireOrganization is true but organizationId is absent', async () => {
      _authState.organizationId = undefined;
      const middleware = defineThunderIDMiddleware({requireOrganization: true});
      await (middleware as Function)(makeTo('/org-page'), makeTo('/'));
      expect(_navigateToTarget).toBeDefined();
    });
  });

  describe('ThunderIDMiddlewareOptions type', () => {
    it('accepts an empty options object', () => {
      const opts: ThunderIDMiddlewareOptions = {};
      expect(opts).toBeDefined();
    });

    it('accepts all fields', () => {
      const opts: ThunderIDMiddlewareOptions = {
        redirectTo: '/login',
        requireOrganization: true,
        requireScopes: ['openid', 'admin'],
      };
      expect(opts.redirectTo).toBe('/login');
      expect(opts.requireOrganization).toBe(true);
      expect(opts.requireScopes).toHaveLength(2);
    });
  });
});
