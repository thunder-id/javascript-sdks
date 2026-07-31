import type {RequestEvent} from '@sveltejs/kit';
import {IAMError, ErrorCode} from '../errors/IAMError';
import type {ThunderIDSSRData} from '../models/session';

export class GuardRedirect extends Error {
  status: number;
  location: string;

  constructor(status: number, location: string) {
    super();
    this.name = 'GuardRedirect';
    this.status = status;
    this.location = location;
  }
}

export function isGuardRedirect(err: unknown): err is GuardRedirect {
  return err instanceof GuardRedirect;
}

export function requireServerSession(
  event: RequestEvent,
  redirectTo?: string,
): ThunderIDSSRData {
  const ssrData: ThunderIDSSRData | undefined = event.locals.thunderid;

  if (!ssrData) {
    throw new IAMError({
      code: ErrorCode.SDK_NOT_INITIALIZED,
      message:
        'ThunderID SSR data not found in event.locals. Ensure createThunderIDHandle() is configured in hooks.server.ts.',
    });
  }

  if (!ssrData.isSignedIn) {
    const signInUrl: string = redirectTo || '/api/auth/signin';
    const returnTo: string = encodeURIComponent(event.url.pathname + event.url.search);
    const separator: string = signInUrl.includes('?') ? '&' : '?';

    throw new GuardRedirect(307, `${signInUrl}${separator}returnTo=${returnTo}`);
  }

  return ssrData;
}
