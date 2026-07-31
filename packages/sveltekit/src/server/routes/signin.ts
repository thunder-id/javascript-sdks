import {generateSessionId} from '@thunderid/node';
import {getLogger} from '../../logger/LoggerAdapter';
import {resolveConfig} from '../config';
import type {ThunderIDSvelteKitConfig} from '../config';
import {getClient} from '../getClient';
import {createTempSessionToken, getTempSessionCookieName, getTempSessionCookieOptions} from '../session';

export function createSignInHandler(config?: ThunderIDSvelteKitConfig): (event: {url: URL; cookies: any}) => Promise<Response> {
  const resolvedConfig: ThunderIDSvelteKitConfig = resolveConfig(config);
  const logger = getLogger();

  return async (event) => {
    try {
      const client = await getClient(resolvedConfig);
      const sessionId: string = generateSessionId();

      const returnTo: string = event.url.searchParams.get('returnTo') || resolvedConfig.afterSignInUrl || '/';

      const nonce: string = crypto.randomUUID();

      const authorizeUrl: string = await (client as any).getSignInUrl({nonce}, sessionId);

      const tempToken: string = await createTempSessionToken(sessionId, resolvedConfig.sessionSecret, returnTo, nonce);

      event.cookies.set(getTempSessionCookieName(), tempToken, getTempSessionCookieOptions());

      return new Response(null, {
        status: 302,
        headers: {Location: authorizeUrl},
      });
    } catch (err: unknown) {
      const message: string = (err as any)?.message ?? String(err);
      logger.error('sign-in failed', err instanceof Error ? err : new Error(message));
      return new Response(JSON.stringify({error: message}), {
        status: 500,
        headers: {'content-type': 'application/json'},
      });
    }
  };
}
