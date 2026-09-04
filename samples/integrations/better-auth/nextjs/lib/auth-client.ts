import { createAuthClient } from 'better-auth/react'

// No client plugin is required for the ThunderID provider — the generic OAuth plugin
// exposes sign-in through Better Auth's standard social-provider API.
export const authClient = createAuthClient()
