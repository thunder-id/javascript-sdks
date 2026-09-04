import type { Metadata } from 'next'
import ConfigNotice from './components/ConfigNotice'
import './globals.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Better Auth + ThunderID Sample',
  description: 'Signing in to a Better Auth app via the ThunderID generic OAuth provider helper',
}

const REQUIRED_ENV_VARS = [
  'BETTER_AUTH_SECRET',
  'THUNDERID_ISSUER',
  'THUNDERID_CLIENT_ID',
  'THUNDERID_CLIENT_SECRET',
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
          <ConfigNotice missing={missingEnvVars} />
        ) : (
          children
        )}
      </body>
    </html>
  )
}
