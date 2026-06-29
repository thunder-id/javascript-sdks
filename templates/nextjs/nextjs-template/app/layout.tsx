import type { Metadata } from 'next'
import { ThunderIDProvider } from '@thunderid/nextjs/server'
import './globals.css'

export const metadata: Metadata = {
  title: 'ThunderID App',
  description: 'ThunderID authentication with Next.js',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThunderIDProvider>{children}</ThunderIDProvider>
      </body>
    </html>
  )
}
