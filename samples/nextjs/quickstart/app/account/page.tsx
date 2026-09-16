'use client'
import { ChangeCredential, SignedIn, SignedOut, User, UserProfile } from '@thunderid/nextjs'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import Nav from '../components/Nav'

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12l9-9 9 9" />
      <path d="M5 10v10h14V10" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

const TABS = [
  { id: 'home', label: 'Home', icon: HomeIcon },
  { id: 'personal', label: 'Personal info', icon: PersonIcon },
  { id: 'security', label: 'Security', icon: ShieldIcon },
]

const CREDENTIALS = [
  { attribute: 'password', title: 'Password', description: 'Used to sign in to your account.', cta: 'Change password' },
]

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function CredentialCard({ attribute, title, description, cta }: { attribute: string; title: string; description: string; cta: string }) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <div className="account-security-card">
      <div className="account-security-card-row">
        <div>
          <div className="account-security-card-title">{title}</div>
          <div className="account-security-card-desc">{description}</div>
        </div>
        <button
          type="button"
          className="account-security-card-cta"
          aria-expanded={open}
          onClick={() => (open ? close() : setOpen(true))}
        >
          {cta}
          <span className={`account-security-card-chevron${open ? ' account-security-card-chevron--open' : ''}`}>
            <ChevronIcon />
          </span>
        </button>
      </div>
      {open && (
        <div className="account-security-card-form">
          <ChangeCredential attribute={attribute} title="" onSuccess={close} />
        </div>
      )}
    </div>
  )
}

const TILES = [
  {
    id: 'personal',
    icon: PersonIcon,
    tone: 'blue',
    title: 'Personal info',
    description: 'Name, email, phone, and profile photo',
  },
  {
    id: 'security',
    icon: ShieldIcon,
    tone: 'green',
    title: 'Security',
    description: 'Password and other credentials',
  },
]

// Google Account-style layout: a persistent left nav switching between tabs of
// content on the right, rather than a single scrolling page or a modal.
function AccountTabs() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const [tab, setTab] = useState(TABS.some((t) => t.id === requestedTab) ? requestedTab! : 'home')

  const selectTab = (id: string) => {
    setTab(id)
    router.replace(id === 'home' ? '/account' : `/account?tab=${id}`)
  }

  return (
    <div className="account-page">
      <aside className="account-sidebar">
        <h1 className="account-sidebar-title">Account</h1>
        <nav className="account-nav">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`account-nav-item${tab === id ? ' account-nav-item--active' : ''}`}
              onClick={() => selectTab(id)}
            >
              <Icon />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="account-content">
        <div className="account-content-inner">
          {tab === 'home' && (
            <User>
              {(user: { givenName?: string; given_name?: string; displayName?: string; username?: string } | null) => {
                const givenName = user?.givenName ?? user?.given_name ?? user?.displayName ?? user?.username ?? 'there'

                return (
                  <>
                    <h2 className="account-content-title">Hi, {givenName}</h2>
                    <p className="account-content-subtitle">
                      Manage your info and security across ThunderID apps.
                    </p>
                    <div className="account-tiles">
                      {TILES.map(({ id, icon: Icon, tone, title, description }) => (
                        <button
                          key={id}
                          type="button"
                          className="account-tile"
                          onClick={() => selectTab(id)}
                        >
                          <span className={`account-tile-icon account-tile-icon--${tone}`}>
                            <Icon />
                          </span>
                          <span className="account-tile-title">{title}</span>
                          <span className="account-tile-desc">{description}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )
              }}
            </User>
          )}

          {tab === 'personal' && (
            <>
              <h2 className="account-content-title">Personal info</h2>
              <p className="account-content-subtitle">Manage the basic profile info others may see.</p>
              <UserProfile />
            </>
          )}

          {tab === 'security' && (
            <>
              <h2 className="account-content-title">Security</h2>
              <p className="account-content-subtitle">Manage your password and other credentials.</p>
              <div className="account-security-list">
                {CREDENTIALS.map((credential) => (
                  <CredentialCard key={credential.attribute} {...credential} />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default function AccountPage() {
  return (
    <div className="app">
      <Nav />

      <SignedIn>
        <AccountTabs />
      </SignedIn>

      <SignedOut>
        <main className="auth-main">
          <div className="auth-card">
            <p className="auth-subtitle">Sign in to manage your account.</p>
            <Link href="/signin" className="btn-primary">Sign in</Link>
          </div>
        </main>
      </SignedOut>
    </div>
  )
}
