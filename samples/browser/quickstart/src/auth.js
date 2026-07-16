import { ThunderIDBrowserClient } from '@thunderid/browser'

const REQUIRED_ENV_VARS = ['VITE_THUNDERID_CLIENT_ID', 'VITE_THUNDERID_BASE_URL']

export const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !import.meta.env[key])

const auth = new ThunderIDBrowserClient()

if (missingEnvVars.length === 0) {
  await auth.initialize({
    clientId: import.meta.env.VITE_THUNDERID_CLIENT_ID,
    baseUrl: import.meta.env.VITE_THUNDERID_BASE_URL,
    afterSignInUrl: window.location.origin,
    afterSignOutUrl: window.location.origin,
  })
}

export default auth
