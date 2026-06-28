import { ThunderIDBrowserClient } from '@thunderid/browser'

const auth = new ThunderIDBrowserClient()

await auth.initialize({
  clientId: import.meta.env.VITE_THUNDERID_CLIENT_ID,
  baseUrl: import.meta.env.VITE_THUNDERID_BASE_URL,
  afterSignInUrl: window.location.origin,
  afterSignOutUrl: window.location.origin,
})

export default auth
