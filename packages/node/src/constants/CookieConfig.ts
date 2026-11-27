// Copyright 2025 The ThunderID Authors
// SPDX-License-Identifier: Apache-2.0

import {getVendorPrefix} from '@thunderid/javascript';

class CookieConfig {
  /**
   * Builds the session cookie name for a given vendor namespace: `thunderid-session` by default. A `Secure`
   * cookie also takes the `__Host-` prefix through `withHostPrefix`, giving `__Host-thunderid-session`.
   * @param vendor - Vendor/brand namespace. Defaults to `VendorConstants.VENDOR_PREFIX` ('thunderid').
   */
  static getSessionCookieName(vendor?: string): string {
    return `${getVendorPrefix(vendor)}-session`;
  }

  /**
   * Builds the name of the cookie that carries a sign-in in progress, `thunderid-session-state` by default. It holds
   * the session ID the authorization request's `state` and PKCE verifier are stored under, so the callback can check
   * the `state` it receives. It is always `SameSite=Lax`, so it comes back on the redirect to the callback.
   * @param vendor - Vendor/brand namespace. Defaults to `VendorConstants.VENDOR_PREFIX` ('thunderid').
   */
  static getTempSessionCookieName(vendor?: string): string {
    return `${getVendorPrefix(vendor)}-session-state`;
  }

  /**
   * Resolves the session cookie name, honoring an explicit `sessionCookie.name`
   * override before falling back to the vendor-derived default.
   */
  static resolveSessionCookieName(vendor?: string, overrideName?: string): string {
    return overrideName ?? CookieConfig.getSessionCookieName(vendor);
  }

  /**
   * Resolves the temporary session cookie name, honoring an explicit
   * `sessionCookie.name`-derived override before falling back to the vendor-derived default.
   */
  static resolveTempSessionCookieName(vendor?: string, overrideName?: string): string {
    return overrideName ?? CookieConfig.getTempSessionCookieName(vendor);
  }

  /**
   * Adds the `__Host-` prefix to a cookie name when the cookie is `Secure`. A browser then refuses the cookie
   * unless it is `Secure`, has `Path=/` and has no `Domain`, so a subdomain cannot set or overwrite it.
   * Without `Secure`, as on plain-HTTP development servers, the prefix would make the browser drop the cookie,
   * so the name is left as it is.
   *
   * @param name - The cookie name.
   * @param secure - Whether the cookie is set with `Secure`.
   */
  static withHostPrefix(name: string, secure: boolean): string {
    return secure && !name.startsWith(CookieConfig.HOST_PREFIX) ? `${CookieConfig.HOST_PREFIX}${name}` : name;
  }

  static readonly HOST_PREFIX: string = '__Host-';

  static readonly DEFAULT_MAX_AGE: number = 3600;

  static readonly DEFAULT_HTTP_ONLY: boolean = true;

  static readonly DEFAULT_SAME_SITE: 'lax' | 'strict' | 'none' = 'strict';

  static readonly DEFAULT_SECURE: boolean = true;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}
}

export default CookieConfig;
