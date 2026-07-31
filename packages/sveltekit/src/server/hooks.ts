import type {Handle, RequestEvent} from '@sveltejs/kit';
import type {BrandingPreference} from '@thunderid/node';
import {getBrandingPreference} from '@thunderid/node';
import {resolveConfig} from './config';
import type {ThunderIDSvelteKitConfig} from './config';
import {maybeRefreshToken} from './refresh';
import {verifySessionToken, getSessionCookieName} from './session';
import {getLogger} from '../logger/LoggerAdapter';
import {DefaultHTTPAdapter, type HTTPAdapter, type HTTPResponse} from '../adapters/HTTPAdapter';
import type {ThunderIDSSRData, ThunderIDSessionPayload} from '../models/session';

export function createThunderIDHandle(config?: ThunderIDSvelteKitConfig): Handle {
  const resolvedConfig: ThunderIDSvelteKitConfig = resolveConfig(config);

  return async ({event, resolve}) => {
    const sessionCookie: string | undefined = event.cookies.get(getSessionCookieName());
    let session: ThunderIDSessionPayload | null = null;

    if (sessionCookie) {
      try {
        session = await verifySessionToken(sessionCookie, resolvedConfig.sessionSecret);

        session = await maybeRefreshToken(session, resolvedConfig, event);

        if (session) {
          event.locals.thunderid = {
            isSignedIn: true,
            session,
            user: null,
            userProfile: null,
            brandingPreference: null,
            resolvedBaseUrl: resolvedConfig.baseUrl ?? null,
          } as ThunderIDSSRData;
        }
      } catch {
        event.cookies.delete(getSessionCookieName(), {path: '/'});
        session = null;
      }
    }

    const isSignedIn: boolean = session !== null;

    const shouldFetchBranding: boolean = resolvedConfig.preferences?.theme?.inheritFromBranding !== false;

    let ssrData: ThunderIDSSRData;

    if (isSignedIn && session) {
      const accessToken: string = session.accessToken;
      const baseUrl: string = resolvedConfig.baseUrl!;

      const adapter: HTTPAdapter = resolvedConfig.httpAdapter ?? new DefaultHTTPAdapter();

      const [userResponse, branding] = await Promise.all([
        adapter.request('GET', `${baseUrl}/oauth2/userinfo`, {Authorization: `Bearer ${accessToken}`}).then((r: HTTPResponse) => {
          if (r.statusCode !== 200) {
            getLogger().error(
              `[hooks] userinfo fetch failed (${r.statusCode})`,
              undefined,
              {requestId: r.headers['x-request-id'] || r.headers['correlation-id'] || undefined, statusCode: r.statusCode},
            );
            return null;
          }
          return JSON.parse(r.body) as any;
        }),
        shouldFetchBranding
          ? getBrandingPreference({baseUrl} as any).catch(() => null)
          : Promise.resolve(null),
      ]);

      const user = userResponse;
      const userProfile = user ? {flattenedProfile: user, profile: user, schemas: [] as string[]} : null;

      ssrData = {
        brandingPreference: (branding!) ?? null,
        isSignedIn: true,
        resolvedBaseUrl: resolvedConfig.baseUrl ?? null,
        session,
        user: user as any,
        userProfile: userProfile as any,
      };
    } else {
      let branding: BrandingPreference | null = null;

      if (shouldFetchBranding) {
        try {
          branding = await getBrandingPreference({baseUrl: resolvedConfig.baseUrl!} as any);
        } catch {
          // branding fetch failed — continue without
        }
      }

      ssrData = {
        brandingPreference: branding,
        isSignedIn: false,
        resolvedBaseUrl: null,
        session: null,
        user: null,
        userProfile: null,
      };
    }

    event.locals.thunderid = ssrData;

    return resolve(event);
  };
}

export function loadThunderID(event: RequestEvent): ThunderIDSSRData {
  return event.locals.thunderid;
}


