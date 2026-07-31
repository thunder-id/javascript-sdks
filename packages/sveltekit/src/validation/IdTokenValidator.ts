/**
 * Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {createRemoteJWKSet, jwtVerify, type JWTPayload} from 'jose';
import type {JWK} from 'jose';
import {IAMError, ErrorCode} from '../errors/IAMError';
import type {ThunderIDSvelteKitConfig} from '../models/config';

export interface IdTokenValidationResult {
  valid: boolean;
  payload: JWTPayload | null;
  error?: string;
}

let _jwksCache: ReturnType<typeof createRemoteJWKSet> | null = null;
let _jwksUrl: string | null = null;

export async function verifyIdToken(
  idToken: string,
  config: ThunderIDSvelteKitConfig,
  options?: {
    clientId?: string;
    issuer?: string;
    clockTolerance?: number;
    validateIssuer?: boolean;
    nonce?: string;
  },
): Promise<IdTokenValidationResult> {
  try {
    const jwksUrl: string | undefined = config.endpoints?.jwks;

    if (!jwksUrl) {
      return {valid: false, payload: null, error: 'JWKS endpoint not configured'};
    }

    if (_jwksUrl !== jwksUrl || !_jwksCache) {
      _jwksUrl = jwksUrl;
      _jwksCache = createRemoteJWKSet(new URL(jwksUrl));
    }

    let payload: JWTPayload;

    try {
      const result = await jwtVerify(idToken, _jwksCache, {
        issuer: options?.validateIssuer !== false ? options?.issuer : undefined,
        audience: options?.clientId,
        clockTolerance: options?.clockTolerance,
      });
      payload = result.payload;
    } catch {
      clearJWKSCache();
      _jwksUrl = jwksUrl;
      _jwksCache = createRemoteJWKSet(new URL(jwksUrl));
      const result = await jwtVerify(idToken, _jwksCache, {
        issuer: options?.validateIssuer !== false ? options?.issuer : undefined,
        audience: options?.clientId,
        clockTolerance: options?.clockTolerance,
      });
      payload = result.payload;
    }

    if (options?.nonce !== undefined && payload['nonce'] !== options.nonce) {
      return {
        valid: false,
        payload,
        error: `ID token nonce mismatch: expected ${options.nonce}, got ${payload['nonce']}`,
      };
    }

    return {valid: true, payload};
  } catch (error: unknown) {
    return {
      valid: false,
      payload: null,
      error: (error as any)?.message ?? String(error),
    };
  }
}

export function clearJWKSCache(): void {
  _jwksCache = null;
  _jwksUrl = null;
}

/**
 * Validates the basic structural claims of an ID token (exp, iat, iss, aud)
 * without requiring a JWKS fetch. Useful for quick client-side checks.
 */
export function validateIdTokenClaims(
  payload: JWTPayload,
  options?: {
    clientId?: string;
    issuer?: string;
    clockTolerance?: number;
    nonce?: string;
  },
): IdTokenValidationResult {
  const now: number = Math.floor(Date.now() / 1000);
  const tolerance: number = options?.clockTolerance ?? 0;

  if (payload.exp && payload.exp + tolerance < now) {
    return {valid: false, payload, error: 'ID token has expired'};
  }

  if (payload.nbf && payload.nbf - tolerance > now) {
    return {valid: false, payload, error: 'ID token is not yet valid (nbf)'};
  }

  if (options?.issuer && payload.iss !== options.issuer) {
    return {valid: false, payload, error: `ID token issuer mismatch: expected ${options.issuer}, got ${payload.iss}`};
  }

  if (options?.clientId && payload.aud !== options.clientId && !Array.isArray(payload.aud)) {
    return {valid: false, payload, error: `ID token audience mismatch: expected ${options.clientId}, got ${payload.aud}`};
  }

  if (Array.isArray(payload.aud) && options?.clientId && !payload.aud.includes(options.clientId)) {
    return {valid: false, payload, error: `ID token audience mismatch: ${options.clientId} not in ${payload.aud}`};
  }

  if (options?.nonce !== undefined && payload['nonce'] !== options.nonce) {
    return {valid: false, payload, error: `ID token nonce mismatch: expected ${options.nonce}, got ${payload['nonce']}`};
  }

  return {valid: true, payload};
}
