import type {TokenResponse} from '@thunderid/node';
import {decodeJwt} from 'jose';
import {getLogger} from '../../logger/LoggerAdapter';
import {resolveConfig} from '../config';
import type {ThunderIDSvelteKitConfig} from '../config';
import {getClient} from '../getClient';
import {issueSessionCookie, verifyTempSessionToken, getTempSessionCookieName, getSessionCookieName} from '../session';

export function createCallbackHandler(config?: ThunderIDSvelteKitConfig): (event: {url: URL; cookies: any}) => Promise<Response> {
  const resolvedConfig: ThunderIDSvelteKitConfig = resolveConfig(config);
  const logger = getLogger();

  return async (event) => {
    try {
      const client = await getClient(resolvedConfig);

      const tempCookie: string | undefined = event.cookies.get(getTempSessionCookieName());

      if (!tempCookie) {
        return new Response(null, {status: 302, headers: {Location: resolvedConfig.afterSignInUrl || '/'}});
      }

      let sessionId: string;
      let returnTo: string | undefined;
      let storedNonce: string | undefined;

      try {
        const tempPayload = await verifyTempSessionToken(tempCookie, resolvedConfig.sessionSecret);
        sessionId = tempPayload.sessionId;
        returnTo = tempPayload.returnTo;
        storedNonce = tempPayload.nonce;
      } catch {
        event.cookies.delete(getTempSessionCookieName(), {path: '/'});
        return new Response(null, {status: 302, headers: {Location: resolvedConfig.afterSignInUrl || '/'}});
      }

      const code: string | null = event.url.searchParams.get('code');
      const state: string | null = event.url.searchParams.get('state');
      const sessionState: string | null = event.url.searchParams.get('session_state');

      if (code) {
        let tokenResponse: TokenResponse;

        try {
          const cfgData = await (client as any).configProvider?.();
          logger.info('callback DEBUG: tokenRequest=' + JSON.stringify(cfgData?.tokenRequest) + ' hasSecret=' + Boolean(cfgData?.clientSecret) + ' authMethod=' + (cfgData?.tokenRequest?.authMethod ?? 'UNSET'));

          tokenResponse = await (client as any).requestAccessToken(
            code,
            sessionState ?? '',
            state ?? '',
            sessionId,
          );
        } catch (err: unknown) {
          const message: string = (err as any)?.message ?? String(err);
          logger.error('callback requestAccessToken failed', err instanceof Error ? err : new Error(message));
          return new Response(JSON.stringify({error: message, details: (err as any)?.name ?? ''}), {
            status: 500,
            headers: {'content-type': 'application/json'},
          });
        }

        if (tokenResponse.accessToken) {
          const nonceFromQuery: string | null = event.url.searchParams.get('nonce');
          const nonceToValidate: string | undefined = nonceFromQuery ?? storedNonce;

          if (nonceToValidate && tokenResponse.idToken) {
            try {
              const idTokenPayload = decodeJwt(tokenResponse.idToken);
              if (idTokenPayload['nonce'] !== nonceToValidate) {
                const errMsg = `ID token nonce mismatch: expected ${nonceToValidate}, got ${idTokenPayload['nonce']}`;
                logger.error(errMsg);
                return new Response(JSON.stringify({error: errMsg}), {
                  status: 401,
                  headers: {'content-type': 'application/json'},
                });
              }
            } catch (decodeErr: unknown) {
              const errMsg = `Failed to decode ID token for nonce validation: ${(decodeErr as any)?.message ?? String(decodeErr)}`;
              logger.error(errMsg);
              return new Response(JSON.stringify({error: errMsg}), {
                status: 401,
                headers: {'content-type': 'application/json'},
              });
            }
          }

          const sessionPayload = await issueSessionCookie(event, sessionId, tokenResponse, resolvedConfig.sessionSecret);

          event.cookies.delete(getTempSessionCookieName(), {path: '/'});

          return new Response(null, {
            status: 302,
            headers: {Location: returnTo || resolvedConfig.afterSignInUrl || '/'},
          });
        }
      }

      const error: string | null = event.url.searchParams.get('error');
      if (error) {
        return new Response(null, {status: 302, headers: {Location: `${resolvedConfig.afterSignInUrl || '/'}?error=${error}`}});
      }

      return new Response(null, {status: 302, headers: {Location: resolvedConfig.afterSignInUrl || '/'}});
    } catch (err: unknown) {
      const message: string = (err as any)?.message ?? String(err);
      logger.error('callback unhandled error', err instanceof Error ? err : new Error(message));
      return new Response(JSON.stringify({error: message, details: (err as any)?.name ?? ''}), {
        status: 500,
        headers: {'content-type': 'application/json'},
      });
    }
  };
}
