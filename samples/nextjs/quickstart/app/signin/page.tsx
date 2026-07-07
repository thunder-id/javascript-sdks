'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SignedIn, SignedOut, SignIn } from '@thunderid/nextjs'
import Nav from '../components/Nav'

export default function SignInPage() {
  const router = useRouter()

  return (
    <div className="app">
      <Nav />

      <SignedIn>
        <main className="auth-main">
          <div className="auth-card">
            <p className="auth-subtitle">You&apos;re already signed in.</p>
            <Link href="/" className="btn-primary">Go home</Link>
          </div>
        </main>
      </SignedIn>

      <SignedOut>
        <main className="auth-main">
          <SignIn onSuccess={() => router.push('/')} />
        </main>
      </SignedOut>
    </div>
  )
}
