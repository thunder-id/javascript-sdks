import type {RequestEvent} from '@sveltejs/kit';
import {describe, it, expect} from 'vitest';
import type {ThunderIDSSRData} from '../../models/session';

const {requireServerSession, GuardRedirect, isGuardRedirect} = await import('../guard');

function createMockEvent(ssrData: ThunderIDSSRData | undefined, path = '/'): RequestEvent {
  return {
    locals: {thunderid: ssrData},
    url: {pathname: path, search: ''},
  } as unknown as RequestEvent;
}

describe('requireServerSession', () => {
  it('should return SSR data when signed in', () => {
    const ssrData: ThunderIDSSRData = {
      brandingPreference: null,
      isSignedIn: true,
      resolvedBaseUrl: null,
      session: null,
      user: {id: 'u1'} as any,
      userProfile: null,
    };

    const result = requireServerSession(createMockEvent(ssrData));
    expect(result).toBe(ssrData);
  });

  it('should throw GuardRedirect when not signed in', () => {
    const ssrData: ThunderIDSSRData = {
      brandingPreference: null,
      isSignedIn: false,
      resolvedBaseUrl: null,
      session: null,
      user: null,
      userProfile: null,
    };

    expect(() => requireServerSession(createMockEvent(ssrData))).toThrow(GuardRedirect);
  });

  it('should append returnTo with custom redirectTo path', () => {
    const ssrData: ThunderIDSSRData = {
      brandingPreference: null,
      isSignedIn: false,
      resolvedBaseUrl: null,
      session: null,
      user: null,
      userProfile: null,
    };

    let err: unknown;
    try {
      requireServerSession(createMockEvent(ssrData, '/protected'), '/custom/signin');
    } catch (e) {
      err = e;
    }
    expect(isGuardRedirect(err)).toBe(true);
    if (isGuardRedirect(err)) {
      expect(err.location).toBe('/custom/signin?returnTo=%2Fprotected');
      expect(err.status).toBe(307);
    }
  });

  it('should append returnTo with default sign-in path', () => {
    const ssrData: ThunderIDSSRData = {
      brandingPreference: null,
      isSignedIn: false,
      resolvedBaseUrl: null,
      session: null,
      user: null,
      userProfile: null,
    };

    let err: unknown;
    try {
      requireServerSession(createMockEvent(ssrData, '/dashboard'));
    } catch (e) {
      err = e;
    }
    expect(isGuardRedirect(err)).toBe(true);
    if (isGuardRedirect(err)) {
      expect(err.location).toBe('/api/auth/signin?returnTo=%2Fdashboard');
      expect(err.status).toBe(307);
    }
  });

  it('should include query string in returnTo', () => {
    const ssrData: ThunderIDSSRData = {
      brandingPreference: null,
      isSignedIn: false,
      resolvedBaseUrl: null,
      session: null,
      user: null,
      userProfile: null,
    };

    const event = {
      locals: {thunderid: ssrData},
      url: {pathname: '/search', search: '?q=test'},
    } as unknown as RequestEvent;

    let err: unknown;
    try {
      requireServerSession(event);
    } catch (e) {
      err = e;
    }
    expect(isGuardRedirect(err)).toBe(true);
    if (isGuardRedirect(err)) {
      expect(err.location).toBe('/api/auth/signin?returnTo=%2Fsearch%3Fq%3Dtest');
      expect(err.status).toBe(307);
    }
  });

  it('should throw GuardRedirect when not signed in (custom path)', () => {
    const ssrData: ThunderIDSSRData = {
      brandingPreference: null,
      isSignedIn: false,
      resolvedBaseUrl: null,
      session: null,
      user: null,
      userProfile: null,
    };

    let err: unknown;
    try {
      requireServerSession(createMockEvent(ssrData), '/custom/signin');
    } catch (e) {
      err = e;
    }
    expect(isGuardRedirect(err)).toBe(true);
  });

  it('should throw IAMError when SSR data is undefined', () => {
    const event = {locals: {}} as RequestEvent;
    expect(() => requireServerSession(event)).toThrow('ThunderID SSR data not found');
  });
});
