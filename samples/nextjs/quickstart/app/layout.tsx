import type { Metadata } from 'next'
import { ThunderIDProvider } from '@thunderid/nextjs/server'
import ConfigNotice from './components/ConfigNotice'
import './globals.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'ThunderID Next.js Quickstart',
  description: 'ThunderID authentication with Next.js',
}

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_THUNDERID_BASE_URL',
  'NEXT_PUBLIC_THUNDERID_CLIENT_ID',
  'THUNDERID_CLIENT_SECRET',
  'THUNDERID_SECRET',
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
          <ThunderIDProvider>
            {children}
          </ThunderIDProvider>
        )}
      </body>
    </html>
  )
}
