'use client'
import { useEffect, useState } from 'react'
import HeroCtas from './components/HeroCtas'
import Nav from './components/Nav'
import ThunderMark from './components/ThunderMark'
import { authClient } from '../lib/auth-client'

function greeting(name: string): string {
  const h = new Date().getHours()
  const tod = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  return `Good ${tod}, ${name}.`
}

function formatTime(date: Date | string | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatCountdown(secsLeft: number): { text: string; color: string } {
  if (secsLeft <= 0) return { text: 'Expired', color: '#d95757' }
  if (secsLeft < 300) {
    const m = Math.floor(secsLeft / 60), s = secsLeft % 60
    return { text: `${m}m ${s}s`, color: '#e88b3a' }
  }
  if (secsLeft < 3600) {
    const m = Math.floor(secsLeft / 60), s = secsLeft % 60
    return { text: `${m}m ${s}s`, color: '#2fbd6b' }
  }
  const hr = Math.floor(secsLeft / 3600), m = Math.floor((secsLeft % 3600) / 60)
  return { text: `${hr}h ${m}m`, color: '#2fbd6b' }
}

const NEXT_STEPS = [
  {
    n: '01',
    title: 'Read the provider helper docs',
    body: 'See every option the thunderid() helper accepts — scopes, PKCE, logout, sign-up gating.',
    cta: 'View options',
    href: 'https://github.com/thunder-id/javascript-sdks/tree/main/packages/better-auth#options',
  },
  {
    n: '02',
    title: 'Learn the Generic OAuth plugin',
    body: 'Understand how Better Auth performs the OAuth 2.0 / OIDC handshake with any provider.',
    cta: 'Read guide',
    href: 'https://better-auth.com/docs/plugins/generic-oauth',
  },
  {
    n: '03',
    title: 'Swap in a real database',
    body: 'This sample keeps users/sessions in memory. Point Better Auth at Postgres, SQLite, or Prisma.',
    cta: 'Database adapters',
    href: 'https://better-auth.com/docs/concepts/database',
  },
  {
    n: '04',
    title: 'Explore ThunderID',
    body: 'Set up an OAuth 2.0 / OIDC application and explore the rest of the ThunderID platform.',
    cta: 'ThunderID docs',
    href: 'https://thunderid.dev/',
  },
]

function ClockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function TimerIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 2h4" /><path d="M12 14v-4" />
      <path d="M4 13a8 8 0 0 1 8-7 8 8 0 1 1-5.3 14L4 17.6" />
      <path d="M9 17H4v5" />
    </svg>
  )
}

function ProviderIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><path d="M2 12h20" />
      <path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17L17 7" /><path d="M7 7h10v10" />
    </svg>
  )
}

function HomeContent({ user, session }: {
  user: { name?: string | null; email: string; image?: string | null }
  session: { createdAt: Date | string; expiresAt: Date | string }
}) {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000))

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(id)
  }, [])

  const givenName = user.name?.split(' ')[0] ?? user.email.split('@')[0]
  const expiresAt = Math.floor(new Date(session.expiresAt).getTime() / 1000)
  const secsLeft = Math.max(0, expiresAt - now)
  const countdown = formatCountdown(secsLeft)
  const initial = (user.name ?? user.email).charAt(0).toUpperCase()

  return (
    <main className="home-main">
      <div className="home-greeting">
        {user.image ? (
          <img className="home-avatar" src={user.image} alt="" width={52} height={52} style={{ borderRadius: '50%' }} />
        ) : (
          <div className="home-avatar user-avatar" style={{ width: 52, height: 52, fontSize: 20 }}>{initial}</div>
        )}
        <div className="home-greeting-text">
          <h1 className="home-greeting-name">{greeting(givenName)}</h1>
          <div className="home-greeting-meta">
            <span>{user.email}</span>
            <span className="home-dot" />
            <span className="home-session-active">
              <span className="home-session-dot" />
              Session active
            </span>
          </div>
        </div>
      </div>

      <div className="home-stats">
        <div className="home-stat">
          <div className="home-stat-icon"><ClockIcon /></div>
          <div>
            <div className="home-stat-value">{formatTime(session.createdAt)}</div>
            <div className="home-stat-label">Signed in at</div>
          </div>
        </div>
        <div className="home-stat home-stat--bordered">
          <div className="home-stat-icon"><TimerIcon /></div>
          <div>
            <div
              className="home-stat-value home-stat-value--mono"
              style={{ color: countdown.color }}
            >
              {countdown.text}
            </div>
            <div className="home-stat-label">Session expires in</div>
          </div>
        </div>
        <div className="home-stat home-stat--bordered">
          <div className="home-stat-icon"><ProviderIcon /></div>
          <div>
            <div className="home-stat-value">ThunderID</div>
            <div className="home-stat-label">OAuth provider</div>
          </div>
        </div>
      </div>

      <div className="home-next-label">What&apos;s next</div>
      <div className="home-next-list">
        {NEXT_STEPS.map((step) => (
          <a
            key={step.n}
            href={step.href}
            target="_blank"
            rel="noopener noreferrer"
            className="home-next-item"
          >
            <span className="home-next-n">{step.n}</span>
            <div className="home-next-body">
              <div className="home-next-title">{step.title}</div>
              <div className="home-next-desc">{step.body}</div>
            </div>
            <span className="home-next-cta">
              {step.cta}
              <ArrowIcon />
            </span>
          </a>
        ))}
      </div>
    </main>
  )
}

export default function HomePage() {
  const { data: session, isPending } = authClient.useSession()

  return (
    <div className="app">
      <Nav />

      {isPending ? null : session?.user ? (
        <div className="home-shell">
          <HomeContent user={session.user} session={session.session} />
        </div>
      ) : (
        <section className="hero">
          <div className="hero-inner">
            <div className="hero-mark">
              <ThunderMark height={40} />
            </div>

            <div className="hero-badge">
              <span className="hero-badge-line" />
              <span>Community integration</span>
              <span className="hero-badge-line" />
            </div>

            <h1 className="hero-title">Better Auth + ThunderID</h1>

            <p className="hero-subtitle">
              Sign in with the ThunderID generic OAuth provider helper for Better Auth.
              All OAuth 2.0 / OIDC handling is performed by Better Auth itself.
            </p>

            <HeroCtas />

            <hr className="hero-divider" />

            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-value">OAuth 2.0</span>
                <span className="hero-stat-label">Authorization standard</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-value">Zero SDK deps</span>
                <span className="hero-stat-label">Config-only helper</span>
              </div>
              <div className="hero-stat">
                <span className="hero-stat-value">Apache 2.0</span>
                <span className="hero-stat-label">License</span>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
