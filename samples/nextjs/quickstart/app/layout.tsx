import type { Metadata } from 'next'
import { ThunderIDProvider } from '@thunderid/nextjs/server'
import './globals.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'ThunderID Next.js Quickstart',
  description: 'ThunderID authentication with Next.js',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ThunderIDProvider>
          {children}
        </ThunderIDProvider>
      </body>
    </html>
  )
}
