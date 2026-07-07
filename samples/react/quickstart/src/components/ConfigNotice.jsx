import { useState } from 'react'
import ThunderMark from './ThunderMark'
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

export default function ConfigNotice({ missing }) {
  const [dark, setDark] = useState(false)

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.setAttribute('data-theme', next ? 'dark' : '')
  }

  return (
    <div className="app">
      <nav className="nav">
        <span className="nav-logo">
          <ReactLogo size={24} />
          <span className="wordmark-name">Quickstart</span>
        </span>
        <div className="nav-actions">
          <button
            className="dark-toggle"
            onClick={toggleDark}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </nav>

      <div className="hero">
        <div className="hero-inner">
          <div className="hero-mark">
            <ThunderMark height={40} />
          </div>

          <div className="hero-badge config-badge">
            <span className="hero-badge-line" />
            <span>Setup required</span>
            <span className="hero-badge-line" />
          </div>

          <h1 className="hero-title">Configuration needed</h1>

          <p className="hero-subtitle">
            This quickstart can't reach ThunderID yet. Set the following
            environment variable(s), then restart the dev server.
          </p>

          <ul className="config-list">
            {missing.map((key) => (
              <li key={key} className="config-list-item">{key}</li>
            ))}
          </ul>

          <p className="config-hint">
            Copy <code>.env.example</code> to <code>.env.local</code>, fill in the
            values from your ThunderID application, then run <code>npm run dev</code> again.
          </p>
        </div>
      </div>
    </div>
  )
}
