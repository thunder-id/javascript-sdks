import type {RequestEvent} from '@sveltejs/kit';
import type {ThunderIDSvelteKitConfig} from './config';
import {createSessionToken, getSessionCookieName, getSessionCookieOptions} from './session';
import {emit, SDKEvent} from '../events/EventBus';
import {getLogger} from '../logger/LoggerAdapter';
import {DefaultHTTPAdapter, type HTTPAdapter, type HTTPResponse} from '../adapters/HTTPAdapter';
import type {ThunderIDSessionPayload} from '../models/session';

const REFRESH_SKEW_SECONDS = 60;

interface OIDCTokenRefreshResponse {
  access_token: string;
  expires_in?: number;
  id_token?: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
}

const inFlightRefreshes = new Map<string, Promise<ThunderIDSessionPayload | null>>();

export async function maybeRefreshToken(
  session: ThunderIDSessionPayload,
  config: ThunderIDSvelteKitConfig,
  event: Pick<RequestEvent, 'cookies'>,
): Promise<ThunderIDSessionPayload | null> {
  const now: number = Math.floor(Date.now() / 1000);
  const logger = getLogger();

  if (!session.accessTokenExpiresAt || session.accessTokenExpiresAt - REFRESH_SKEW_SECONDS > now) {
    return session;
  }

  if (!session.refreshToken) {
    return null;
  }

  const dedupKey: string = session.sessionId || session.sub || 'default';

  const existing = inFlightRefreshes.get(dedupKey);
  if (existing) {
    return existing;
  }

  const promise = doRefresh(session, config, event, logger);
  inFlightRefreshes.set(dedupKey, promise);

  try {
    return await promise;
  } finally {
    inFlightRefreshes.delete(dedupKey);
  }
}

async function doRefresh(
  session: ThunderIDSessionPayload,
  config: ThunderIDSvelteKitConfig,
  event: Pick<RequestEvent, 'cookies'>,
  logger: ReturnType<typeof getLogger>,
): Promise<ThunderIDSessionPayload | null> {
  const now: number = Math.floor(Date.now() / 1000);
  const tokenEndpoint = `${config.baseUrl}/oauth2/token`;

  const body: string = new URLSearchParams({
    client_id: config.clientId!,
    grant_type: 'refresh_token',
    refresh_token: session.refreshToken ?? '',
    ...(config.clientSecret ? {client_secret: config.clientSecret} : {}),
  }).toString();

  let refreshed: OIDCTokenRefreshResponse;
  try {
    const adapter: HTTPAdapter = config.httpAdapter ?? new DefaultHTTPAdapter();
    const res: HTTPResponse = await adapter.request('POST', tokenEndpoint, {
      'Content-Type': 'application/x-www-form-urlencoded',
    }, body);

    const requestId: string | undefined = res.headers['x-request-id'] || res.headers['correlation-id'] || undefined;

    if (res.statusCode !== 200) {
      logger.error(`Token refresh failed (${res.statusCode})`, undefined, {
        statusCode: res.statusCode,
        requestId,
        sessionId: session.sessionId,
      });
      emit(SDKEvent.TOKEN_REFRESH_FAILED, {
        statusCode: res.statusCode,
        requestId,
        sessionId: session.sessionId,
      });
      return null;
    }

    refreshed = JSON.parse(res.body) as OIDCTokenRefreshResponse;
  } catch (err: unknown) {
    logger.error('Token refresh network error', err instanceof Error ? err : new Error(String(err)), {
      sessionId: session.sessionId,
    });
    emit(SDKEvent.TOKEN_REFRESH_FAILED, {
      error: err instanceof Error ? err.message : String(err),
      sessionId: session.sessionId,
    });
    return null;
  }

  const newSessionToken: string = await createSessionToken(
    {
      accessToken: refreshed.access_token,
      accessTokenExpiresAt: now + (refreshed.expires_in ?? 3600),
      idToken: refreshed.id_token ?? session.idToken,
      refreshToken: refreshed.refresh_token ?? session.refreshToken,
      scopes: refreshed.scope ?? session.scopes,
      sessionId: session.sessionId,
      userId: session.sub,
    },
    config.sessionSecret,
  );

  event.cookies.set(getSessionCookieName(), newSessionToken, getSessionCookieOptions());
  emit(SDKEvent.TOKEN_REFRESHED, {sessionId: session.sessionId});

  return {
    ...session,
    accessToken: refreshed.access_token,
    accessTokenExpiresAt: now + (refreshed.expires_in ?? 3600),
    idToken: refreshed.id_token ?? session.idToken,
    refreshToken: refreshed.refresh_token ?? session.refreshToken,
    scopes: refreshed.scope ?? session.scopes,
  };
}

export async function getValidAccessToken(
  event: RequestEvent,
  config: ThunderIDSvelteKitConfig,
): Promise<string> {
  const {loadThunderID} = await import('./load');
  const ssrData = loadThunderID(event);

  if (!ssrData.session) {
    throw new Error('Not authenticated');
  }

  const refreshed = await maybeRefreshToken(ssrData.session, config, event);

  if (!refreshed) {
    throw new Error('Session expired');
  }

  return refreshed.accessToken;
}
