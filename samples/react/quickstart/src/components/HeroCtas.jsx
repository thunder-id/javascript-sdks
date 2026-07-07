import { SignInButton } from '@thunderid/react'

export default function HeroCtas() {
  return (
    <div className="hero-ctas">
      <SignInButton>
        {({ signIn, isLoading }) => (
          <button className="btn-primary" onClick={signIn} disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        )}
      </SignInButton>
    </div>
  )
}
