'use client'
import { UserProfile } from '@thunderid/nextjs'
import Nav from '../components/Nav'

export default function ProfilePage() {
  return (
    <div className="app">
      <Nav />
      <main className="profile-main">
        <UserProfile />
      </main>
    </div>
  )
}
