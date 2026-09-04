import { thunderid } from '@thunderid/better-auth'
import { betterAuth } from 'better-auth'
import { memoryAdapter, type MemoryDB } from 'better-auth/adapters/memory'
import { nextCookies } from 'better-auth/next-js'
import { genericOAuth } from 'better-auth/plugins'

// In-memory store — fine for this sample, but resets on every server restart.
// Swap for a real database adapter (see https://better-auth.com/docs/adapters) in production.
// The memory adapter only auto-creates a table on its first write, but the OAuth callback reads
// "account" before ever writing to it, so every core table needs to exist upfront.
const db: MemoryDB = { user: [], session: [], account: [], verification: [] }

function createAuth() {
  return betterAuth({
    database: memoryAdapter(db),
    plugins: [
      genericOAuth({
        config: [
          thunderid({
            clientId: process.env.THUNDERID_CLIENT_ID!,
            clientSecret: process.env.THUNDERID_CLIENT_SECRET!,
            issuer: process.env.THUNDERID_ISSUER!,
          }),
        ],
      }),
      // Must be listed last — it only applies cookies set by plugins earlier in this array.
      nextCookies(),
    ],
  })
}

let instance: ReturnType<typeof createAuth> | undefined

// Built lazily, on the first request, rather than at module scope: the ThunderID issuer URL is
// required, and constructing eagerly would throw as soon as this module is imported — which
// happens during `next build`'s page-data collection even when nothing ever calls the handler,
// breaking the build for anyone who hasn't configured `.env` yet.
export function getAuth() {
  instance ??= createAuth()
  return instance
}
