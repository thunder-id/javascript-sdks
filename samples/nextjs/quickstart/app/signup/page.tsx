'use client'
import Link from 'next/link'
import { SignedIn, SignedOut, SignUp } from '@thunderid/nextjs'
import Nav from '../components/Nav'

export default function SignUpPage() {
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
          <SignUp afterSignUpUrl="/" />
        </main>
      </SignedOut>
    </div>
  )
}
