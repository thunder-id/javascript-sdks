import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router'
import { SignedIn, SignedOut, User, UserAvatar, useThunderID } from '@thunderid/react'
import ThunderMark from '../components/ThunderMark'
import HeroCtas from '../components/HeroCtas'

function greeting(name) {
  const h = new Date().getHours()
  const tod = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  return `Good ${tod}, ${name}.`
}

function formatTime(unixSeconds) {
  if (!unixSeconds) return '—'
  return new Date(unixSeconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatCountdown(secsLeft) {
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
    title: 'Explore use cases',
    body: 'See what you can build — auth flows for web, mobile, APIs, and agents.',
    cta: 'Browse use cases',
    href: 'https://thunderid.dev/docs/next/use-cases/overview/',
  },
  {
    n: '02',
    title: 'Learn about flows',
    body: 'Understand how authorization code, PKCE, client credentials, and device flows work.',
    cta: 'Read guide',
    href: 'https://thunderid.dev/docs/next/guides/guides/flows/what-are-flows/',
  },
  {
    n: '03',
    title: 'Style your experience',
    body: 'Customize the login UI, branding, and email templates to match your product.',
    cta: 'Design guide',
    href: 'https://thunderid.dev/docs/next/guides/guides/design/overview/',
  },
  {
    n: '04',
    title: 'Explore SDK APIs',
    body: 'Full React SDK reference — hooks, components, and configuration options.',
    cta: 'SDK reference',
    href: 'https://thunderid.dev/docs/next/sdks/react/overview/',
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

function BuildingIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" /><path d="M9 21V9" />
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

function HomeContent() {
  const { getDecodedIdToken, organization } = useThunderID()
  const [token, setToken] = useState(null)
  const [now, setNow] = useState(Math.floor(Date.now() / 1000))

  useEffect(() => {
    getDecodedIdToken().then(setToken).catch(() => {})
  }, [getDecodedIdToken])

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(id)
  }, [])

  const authTime = token?.auth_time
  const exp = token?.exp
  const secsLeft = exp ? Math.max(0, exp - now) : null
  const countdown = secsLeft !== null ? formatCountdown(secsLeft) : null
  const orgName = organization?.displayName || organization?.name

  return (
    <User>
      {(user) => {
        const givenName = user?.givenName || user?.given_name || user?.displayName || user?.username || 'there'
        const email = user?.email
        const ouName = orgName || user?.ouName || user?.org || 'Default'

        return (
          <main className="home-main">
            <div className="home-greeting">
              <UserAvatar user={user} size={52} />
              <div className="home-greeting-text">
                <h1 className="home-greeting-name">{greeting(givenName)}</h1>
                <div className="home-greeting-meta">
                  {email && <span>{email}</span>}
                  {email && <span className="home-dot" />}
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
                  <div className="home-stat-value">{formatTime(authTime)}</div>
                  <div className="home-stat-label">Signed in at</div>
                </div>
              </div>
              <div className="home-stat home-stat--bordered">
                <div className="home-stat-icon"><TimerIcon /></div>
                <div>
                  <div
                    className="home-stat-value home-stat-value--mono"
                    style={countdown ? { color: countdown.color } : undefined}
                  >
                    {countdown ? countdown.text : '—'}
                  </div>
                  <div className="home-stat-label">Session expires in</div>
                </div>
              </div>
              <div className="home-stat home-stat--bordered">
                <div className="home-stat-icon"><BuildingIcon /></div>
                <div>
                  <div className="home-stat-value">{ouName}</div>
                  <div className="home-stat-label">Organisation</div>
                </div>
              </div>
            </div>

            <div className="home-next-label">What's next</div>
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
      }}
    </User>
  )
}

export default function HomePage() {
  const { dark } = useOutletContext()

  return (
    <>
      <SignedOut>
        <div className="hero">
          <div className="hero-inner">
            <div className="hero-mark">
              <ThunderMark height={44} dark={dark} />
            </div>

            <div className="hero-badge">
              <span className="hero-badge-line" />
              <span>Open source</span>
              <span className="hero-badge-line" />
            </div>

            <h1 className="hero-title">Auth for Modern Apps and Agents</h1>

            <p className="hero-subtitle">
              ThunderID gives you OAuth 2.0, PKCE, MFA, and JWT out of the box.
              Clone the Quickstart and ship auth before lunch.
            </p>

            <HeroCtas />

            <hr className="hero-divider" />

            <div className="hero-stats">
              <div className="stat">
                <span className="stat-value">OAuth 2.0</span>
                <span className="stat-label">Authorization standard</span>
              </div>
              <div className="stat">
                <span className="stat-value">&lt; 5 min</span>
                <span className="stat-label">Integration time</span>
              </div>
              <div className="stat">
                <span className="stat-value">Apache 2.0</span>
                <span className="stat-label">License</span>
              </div>
            </div>
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        <div className="home-shell">
          <HomeContent />
        </div>
      </SignedIn>
    </>
  )
}
