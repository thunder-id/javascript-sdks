'use client'
import { SignedIn, SignedOut, SignInButton, SignOutButton, User } from '@thunderid/nextjs'

export default function Home() {
  return (
    <main>
      <SignedOut>
        <h1>Welcome</h1>
        <SignInButton />
      </SignedOut>
      <SignedIn>
        <User>{(user) => <h1>Hello, {user.given_name || user.username}.</h1>}</User>
        <SignOutButton />
      </SignedIn>
    </main>
  )
}
