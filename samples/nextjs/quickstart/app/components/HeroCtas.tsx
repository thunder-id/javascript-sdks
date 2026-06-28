'use client'
import { SignInButton, SignUpButton } from '@thunderid/nextjs'

export default function HeroCtas() {
  return (
    <div className="hero-ctas">
      <SignUpButton>
        {({ signUp, isLoading }) => (
          <button className="btn-primary" onClick={() => { void signUp?.() }} disabled={isLoading}>
            {isLoading ? 'Signing up…' : 'Get started'}
          </button>
        )}
      </SignUpButton>
      <SignInButton>
        {({ signIn, isLoading }) => (
          <button className="btn-outline" onClick={() => { void signIn?.() }} disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        )}
      </SignInButton>
    </div>
  )
}
