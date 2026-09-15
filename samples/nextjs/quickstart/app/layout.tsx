import type { Metadata } from 'next'
import { ThunderIDProvider } from '@thunderid/nextjs/server'
import ConfigNotice from './components/ConfigNotice'
import './globals.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'ThunderID Next.js Quickstart',
  description: 'ThunderID authentication with Next.js',
}

// Redirect-based flow (NEXT_PUBLIC_THUNDERID_CLIENT_ID set) sends the user to
// ThunderID's hosted pages and needs a registered redirect URI. The default,
// native flow renders sign-in/sign-up inline via the app's own routes and
// needs an application ID instead — no redirect URI or CORS setup required.
const isRedirectFlow = Boolean(process.env.NEXT_PUBLIC_THUNDERID_CLIENT_ID)

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_THUNDERID_BASE_URL',
  'THUNDERID_SECRET',
  ...(isRedirectFlow
    ? ['NEXT_PUBLIC_THUNDERID_CLIENT_ID', 'THUNDERID_CLIENT_SECRET']
    : ['NEXT_PUBLIC_THUNDERID_APPLICATION_ID', 'NEXT_PUBLIC_THUNDERID_SIGN_IN_URL', 'NEXT_PUBLIC_THUNDERID_SIGN_UP_URL', 'THUNDERID_FLOW_SECRET']),
]

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key])

  return (
    <html lang="en">
      <body>
        {missingEnvVars.length > 0 ? (
          <ConfigNotice missing={missingEnvVars} isRedirectFlow={isRedirectFlow} />
        ) : (
          <ThunderIDProvider preferences={{ theme: { mode: 'class' } }}>
            {children}
          </ThunderIDProvider>
        )}
      </body>
    </html>
  )
}
