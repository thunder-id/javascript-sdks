import {IAMError, ErrorCode} from '../errors/IAMError';
import type {ThunderIDSvelteKitConfig} from '../models/config';

export type {ThunderIDSvelteKitConfig} from '../models/config';

export function resolveConfig(config?: ThunderIDSvelteKitConfig): ThunderIDSvelteKitConfig {
  const baseUrl: string = config?.baseUrl || process.env['THUNDERID_BASE_URL'] || '';

  const resolved: ThunderIDSvelteKitConfig = {
    afterSignInUrl: config?.afterSignInUrl ?? '/',
    afterSignOutUrl: config?.afterSignOutUrl ?? '/',
    allowedExternalUrls: config?.allowedExternalUrls,
    applicationId: config?.applicationId,
    baseUrl,
    clientId: config?.clientId || process.env['THUNDERID_CLIENT_ID'],
    clientSecret: config?.clientSecret || process.env['THUNDERID_CLIENT_SECRET'],
    discovery: config?.discovery,
    endpoints: {
      wellKnown: `${baseUrl}/.well-known/openid-configuration`,
      ...config?.endpoints,
    } as any,
    instanceId: config?.instanceId,
    mode: config?.mode,

    preferences: config?.preferences,
    prompt: config?.prompt,
    responseMode: config?.responseMode,
    scopes: config?.scopes ?? ['openid'],
    sendCookiesInRequests: config?.sendCookiesInRequests,
    sendIdTokenInLogoutRequest: config?.sendIdTokenInLogoutRequest,
    sessionCookie: config?.sessionCookie,
    sessionSecret: config?.sessionSecret || process.env['THUNDERID_SESSION_SECRET'],
    signInOptions: config?.signInOptions,
    signInUrl: config?.signInUrl,
    signOutOptions: config?.signOutOptions,
    signUpOptions: config?.signUpOptions,
    signUpUrl: config?.signUpUrl,
    storage: config?.storage,
    httpAdapter: config?.httpAdapter,
    syncSession: config?.syncSession,
    tokenLifecycle: config?.tokenLifecycle,
    tokenRequest: config?.tokenRequest ?? {authMethod: 'client_secret_post'},
    tokenValidation: config?.tokenValidation,
  };

  if (!resolved.baseUrl) {
    throw new IAMError({
      code: ErrorCode.INVALID_CONFIGURATION,
      message: 'baseUrl is required. Set THUNDERID_BASE_URL environment variable or pass it in config.',
    });
  }

  if (!resolved.baseUrl.startsWith('https://')) {
    throw new IAMError({
      code: ErrorCode.INVALID_CONFIGURATION,
      message: 'baseUrl must use HTTPS.',
    });
  }

  if (!resolved.clientId) {
    throw new IAMError({
      code: ErrorCode.INVALID_CONFIGURATION,
      message: 'clientId is required. Set THUNDERID_CLIENT_ID environment variable or pass it in config.',
    });
  }

  return resolved;
}
