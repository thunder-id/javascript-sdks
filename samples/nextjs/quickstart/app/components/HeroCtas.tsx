'use client'
import { SignInButton } from '@thunderid/nextjs'

export default function HeroCtas() {
  return (
    <div className="hero-ctas">
      <SignInButton>
        {({ signIn, isLoading }) => (
          <button className="btn-primary" onClick={() => { void signIn?.() }} disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        )}
      </SignInButton>
    </div>
  )
}
