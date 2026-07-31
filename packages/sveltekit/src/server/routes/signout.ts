import {getLogger} from '../../logger/LoggerAdapter';
import {resolveConfig} from '../config';
import type {ThunderIDSvelteKitConfig} from '../config';
import {getClient} from '../getClient';
import {getSessionCookieName, verifySessionToken} from '../session';

export function createSignOutHandler(config?: ThunderIDSvelteKitConfig): (event: {cookies: any}) => Promise<Response> {
  const resolvedConfig: ThunderIDSvelteKitConfig = resolveConfig(config);
  const logger = getLogger();

  return async (event) => {
    const redirectUrl: string = resolvedConfig.afterSignOutUrl || '/';

    const sessionCookie: string | undefined = event.cookies.get(getSessionCookieName());

    if (sessionCookie) {
      try {
        const client = await getClient(resolvedConfig);
        const session = await verifySessionToken(sessionCookie, resolvedConfig.sessionSecret);
        await (client as any).revokeAccessToken(session.sessionId);
        await client.signOut({sessionId: session.sessionId} as any);
      } catch (err: unknown) {
        logger.warn('sign-out encountered an issue', {error: (err as any)?.message ?? String(err)});
      }
    }

    event.cookies.delete(getSessionCookieName(), {path: '/'});

    return new Response(null, {
      status: 302,
      headers: {Location: redirectUrl},
    });
  };
}
