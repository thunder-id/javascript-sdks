import { useState, useEffect } from 'react'
import { useThunderID } from '@thunderid/react'

function decodeJwtPart(part) {
  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=')
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

function CopyIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

export default function TokenDebugPage() {
  const { getAccessToken } = useThunderID()
  const [rawToken, setRawToken] = useState(null)
  const [copied, setCopied] = useState(false)
  const [now, setNow] = useState(Math.floor(Date.now() / 1000))

  useEffect(() => {
    getAccessToken().then(setRawToken).catch(() => {})
  }, [getAccessToken])

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(id)
  }, [])

  const parts = rawToken ? rawToken.split('.') : []
  const jwtHeader = parts[0] ? decodeJwtPart(parts[0]) : null
  const jwtPayload = parts[1] ? decodeJwtPart(parts[1]) : null

  const exp = jwtPayload?.exp
  const expiresIn = exp ? exp - now : null
  const expired = expiresIn !== null && expiresIn <= 0
  const minsLeft = expiresIn !== null ? Math.abs(Math.floor(expiresIn / 60)) : null

  const handleCopy = () => {
    if (rawToken && navigator.clipboard) {
      navigator.clipboard.writeText(rawToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  const issuer = jwtPayload?.iss
  const audience = Array.isArray(jwtPayload?.aud) ? jwtPayload.aud.join(', ') : jwtPayload?.aud
  const scopes = jwtPayload?.scope

  return (
    <main className="token-main">
      <div className="token-header">
        <div>
          <h1 className="token-title">Token debug</h1>
          <p className="token-subtitle">Inspect your access token and decoded claims.</p>
        </div>
        {expiresIn !== null && (
          <div className={`token-badge ${expired ? 'token-badge--expired' : 'token-badge--valid'}`}>
            <span className="token-badge-dot" />
            <span>{expired ? 'Expired' : `Valid · expires in ${minsLeft} min`}</span>
          </div>
        )}
      </div>

      {rawToken ? (
        <div className="token-raw-section">
          <div className="token-raw-label-row">
            <span className="token-section-label">Access token</span>
            <button className="token-copy-btn" onClick={handleCopy}>
              <CopyIcon />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <code className="token-raw">
            <span className="token-part--header">{parts[0]}</span>
            <span className="token-dot">.</span>
            <span className="token-part--payload">{parts[1]}</span>
            <span className="token-dot">.</span>
            <span className="token-part--signature">{parts[2]}</span>
          </code>
        </div>
      ) : (
        <div className="token-raw-section">
          <div className="token-raw-label-row">
            <span className="token-section-label">Access token</span>
          </div>
          <code className="token-raw token-raw--loading">Loading…</code>
        </div>
      )}

      <div className="token-decoded-grid">
        <div className="token-code-box">
          <div className="token-code-box-header token-code-box-header--header">JWT Header</div>
          <pre className="token-code-pre">
            {jwtHeader ? JSON.stringify(jwtHeader, null, 2) : '…'}
          </pre>
        </div>
        <div className="token-code-box">
          <div className="token-code-box-header token-code-box-header--payload">JWT Payload</div>
          <pre className="token-code-pre">
            {jwtPayload ? JSON.stringify(jwtPayload, null, 2) : '…'}
          </pre>
        </div>
      </div>

      {(issuer || audience || scopes) && (
        <div className="token-meta-row">
          {issuer && (
            <div className="token-meta-item">
              <div className="token-meta-label">Issuer</div>
              <div className="token-meta-value">{issuer}</div>
            </div>
          )}
          {audience && (
            <div className="token-meta-item">
              <div className="token-meta-label">Audience</div>
              <div className="token-meta-value">{audience}</div>
            </div>
          )}
          {scopes && (
            <div className="token-meta-item">
              <div className="token-meta-label">Scopes</div>
              <div className="token-meta-value">{scopes}</div>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
