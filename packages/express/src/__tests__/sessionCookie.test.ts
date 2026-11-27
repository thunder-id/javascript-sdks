// Copyright 2026 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import express from 'express';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {ExpressClientConfig} from '../models/config';
import ThunderIDExpressClient from '../ThunderIDExpressClient';

const clientWith = (config: Partial<ExpressClientConfig>): ThunderIDExpressClient => {
  const client = new ThunderIDExpressClient();

  (client as unknown as {_expressConfig: Partial<ExpressClientConfig>})._expressConfig = config;

  return client;
};

describe('the Express session cookie', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is Secure with the __Host- prefix in production, on Path=/', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const client: ThunderIDExpressClient = clientWith({});

    expect(client.getSessionCookieName()).toBe('__Host-thunderid-session');
    expect(client.getSessionCookieOptions()).toMatchObject({
      httpOnly: true,
      path: '/',
      sameSite: 'strict',
      secure: true,
    });
  });

  it('keeps the plain name when it is not Secure, such as on a plain-HTTP development server', () => {
    vi.stubEnv('NODE_ENV', 'development');

    expect(clientWith({}).getSessionCookieName()).toBe('thunderid-session');
    expect(clientWith({sessionCookie: {secure: true}}).getSessionCookieName()).toBe('__Host-thunderid-session');
  });

  it('keeps a name the app chose as it is', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(clientWith({sessionCookie: {name: 'my_session'}}).getSessionCookieName()).toBe('my_session');
  });

  it('is deleted with the same attributes it was set with', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const clearCookie = vi.fn();

    clientWith({}).clearSessionCookie({clearCookie} as unknown as express.Response);

    expect(clearCookie).toHaveBeenCalledWith('__Host-thunderid-session', {
      httpOnly: true,
      path: '/',
      sameSite: 'strict',
      secure: true,
    });
  });

  it('is Lax only when the app asks, with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(clientWith({sessionCookie: {sameSite: 'lax'}}).getSessionCookieOptions().sameSite).toBe('lax');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('RFC 10017'));
  });
});

describe('the Express sign-in cookie', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is Lax, so it comes back on the redirect to the callback, and Secure with __Host- in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const client: ThunderIDExpressClient = clientWith({});

    expect(client.getSessionStateCookieName()).toBe('__Host-thunderid-session-state');
    expect(client.getSessionStateCookieOptions()).toEqual({
      httpOnly: true,
      maxAge: 900_000,
      path: '/',
      sameSite: 'lax',
      secure: true,
    });
  });

  it('is named thunderid-session-state on a plain-HTTP development server', () => {
    vi.stubEnv('NODE_ENV', 'development');

    expect(clientWith({}).getSessionStateCookieName()).toBe('thunderid-session-state');
  });
});
