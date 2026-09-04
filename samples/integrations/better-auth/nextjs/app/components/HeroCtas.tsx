'use client'
import { useState } from 'react'
import { authClient } from '../../lib/auth-client'

export default function HeroCtas() {
  const [isLoading, setIsLoading] = useState(false)

  const signIn = async () => {
    setIsLoading(true)
    await authClient.signIn.social({ provider: 'thunderid', callbackURL: '/' })
  }

  return (
    <div className="hero-ctas">
      <button className="btn-primary" onClick={() => { void signIn() }} disabled={isLoading}>
        {isLoading ? 'Signing in…' : 'Sign in with ThunderID'}
      </button>
    </div>
  )
}
