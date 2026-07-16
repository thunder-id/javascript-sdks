'use server'

import { thunderid } from '@thunderid/nextjs/server'

/**
 * Fetch the raw access token JWT for the current session.
 * Tokens are kept server-side — this Server Action is the only way a
 * client component can retrieve them without exposing the session cookie.
 */
export async function fetchAccessToken(): Promise<string | undefined> {
  try {
    const sdk = await thunderid()
    const sessionId = await sdk.getSessionId()
    if (!sessionId) return undefined
    return await sdk.getAccessToken(sessionId)
  } catch {
    return undefined
  }
}
