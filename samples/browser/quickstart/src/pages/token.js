const ICON_COPY = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`

function escapeHtml(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function decodeJwtPart(part) {
  try {
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=')
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

export function renderTokenDebug({ rawToken }) {
  const now = Math.floor(Date.now() / 1000)
  const parts = rawToken ? rawToken.split('.') : []
  const jwtHeader = parts[0] ? decodeJwtPart(parts[0]) : null
  const jwtPayload = parts[1] ? decodeJwtPart(parts[1]) : null

  const exp = jwtPayload?.exp
  const expiresIn = exp ? exp - now : null
  const expired = expiresIn !== null && expiresIn <= 0
  const minsLeft = expiresIn !== null ? Math.abs(Math.floor(expiresIn / 60)) : null

  const issuer = jwtPayload?.iss
  const audience = Array.isArray(jwtPayload?.aud) ? jwtPayload.aud.join(', ') : jwtPayload?.aud
  const scopes = jwtPayload?.scope

  return `
    <main class="token-main">
      <div class="token-header">
        <div>
          <h1 class="token-title">Token debug</h1>
          <p class="token-subtitle">Inspect your access token and decoded claims.</p>
        </div>
        ${expiresIn !== null ? `
          <div class="token-badge ${expired ? 'token-badge--expired' : 'token-badge--valid'}">
            <span class="token-badge-dot"></span>
            <span>${expired ? 'Expired' : `Valid · expires in ${minsLeft} min`}</span>
          </div>` : ''}
      </div>

      ${rawToken ? `
        <div class="token-raw-section">
          <div class="token-raw-label-row">
            <span class="token-section-label">Access token</span>
            <button class="token-copy-btn" id="copy-btn">${ICON_COPY} Copy</button>
          </div>
          <code class="token-raw">
            <span class="token-part--header">${escapeHtml(parts[0] || '')}</span>
            <span class="token-dot">.</span>
            <span class="token-part--payload">${escapeHtml(parts[1] || '')}</span>
            <span class="token-dot">.</span>
            <span class="token-part--signature">${escapeHtml(parts[2] || '')}</span>
          </code>
        </div>` : `
        <div class="token-raw-section">
          <div class="token-raw-label-row">
            <span class="token-section-label">Access token</span>
          </div>
          <code class="token-raw token-raw--loading">Loading…</code>
        </div>`}

      <div class="token-decoded-grid">
        <div class="token-code-box">
          <div class="token-code-box-header token-code-box-header--header">JWT Header</div>
          <pre class="token-code-pre">${jwtHeader ? escapeHtml(JSON.stringify(jwtHeader, null, 2)) : '…'}</pre>
        </div>
        <div class="token-code-box">
          <div class="token-code-box-header token-code-box-header--payload">JWT Payload</div>
          <pre class="token-code-pre">${jwtPayload ? escapeHtml(JSON.stringify(jwtPayload, null, 2)) : '…'}</pre>
        </div>
      </div>

      ${issuer || audience || scopes ? `
        <div class="token-meta-row">
          ${issuer ? `
            <div class="token-meta-item">
              <div class="token-meta-label">Issuer</div>
              <div class="token-meta-value">${escapeHtml(issuer)}</div>
            </div>` : ''}
          ${audience ? `
            <div class="token-meta-item">
              <div class="token-meta-label">Audience</div>
              <div class="token-meta-value">${escapeHtml(audience)}</div>
            </div>` : ''}
          ${scopes ? `
            <div class="token-meta-item">
              <div class="token-meta-label">Scopes</div>
              <div class="token-meta-value">${escapeHtml(scopes)}</div>
            </div>` : ''}
        </div>` : ''}
    </main>`
}

export function attachTokenHandlers({ rawToken }) {
  document.getElementById('copy-btn')?.addEventListener('click', async () => {
    if (!rawToken || !navigator.clipboard) return
    await navigator.clipboard.writeText(rawToken)
    const btn = document.getElementById('copy-btn')
    if (btn) {
      btn.innerHTML = `${ICON_COPY} Copied!`
      setTimeout(() => {
        const b = document.getElementById('copy-btn')
        if (b) b.innerHTML = `${ICON_COPY} Copy`
      }, 1500)
    }
  })
}
