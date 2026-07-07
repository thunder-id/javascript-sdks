import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { SignedIn, SignedOut, SignInButton, UserDropdown, Loading } from '@thunderid/react'
import ReactLogo from './icons/ReactLogo'

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function KeyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="M21 2l-9.6 9.6" />
      <path d="M15.5 7.5l3 3L22 7l-3-3" />
    </svg>
  )
}

export default function Nav() {
  const [dark, setDark] = useState(false)
  const location = useLocation()
  const isHome = location.pathname === '/'

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : '')
  }

  const tokenDebugMenuItem = {
    label: <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><KeyIcon />Token debug</span>,
    href: '/token',
  }

  return (
    <div className="app" data-theme={dark ? 'dark' : undefined}>
      <nav className="nav">
        <Link to="/" className="nav-logo">
          <ReactLogo size={24} />
          <span className="wordmark-name">Quickstart</span>
        </Link>
        <div className="nav-actions">
          {!isHome && (
            <Link to="/" className="nav-back-btn">
              <ChevronLeftIcon />
              Home
            </Link>
          )}
          <button
            className="dark-toggle"
            onClick={toggleDark}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
          <SignedIn>
            <UserDropdown showTriggerLabel menuItems={[tokenDebugMenuItem]} />
          </SignedIn>
          <SignedOut>
            <SignInButton>
              {({ signIn, isLoading }) => (
                <button className="btn-primary" onClick={signIn} disabled={isLoading}>
                  {isLoading ? 'Signing in…' : 'Sign in'}
                </button>
              )}
            </SignInButton>
          </SignedOut>
        </div>
      </nav>

      <Loading>
        <div className="loading-screen">Loading…</div>
      </Loading>

      <Outlet context={{ dark }} />
    </div>
  )
}
