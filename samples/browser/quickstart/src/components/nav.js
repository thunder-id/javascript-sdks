const NAV_MARK = `<svg width="19" height="24" viewBox="0 0 207 257" fill="none">
  <path d="M55.4763 26.4391L58.8866 0H0V26.4391H55.4763Z" fill="#05213F" id="mark-top"/>
  <path d="M39.8438 147.407L49.5455 72.2839H4.9909e-05V256.743H60.5602L80.048 147.407H39.8438Z" fill="#3688FF"/>
  <path d="M192.42 59.361C182.782 40.2307 168.929 25.5705 150.903 15.3381C145.501 12.2662 139.761 9.6605 133.703 7.5208L115.401 103.702H159.757L76.2987 256.743H83.3735C109.449 256.743 131.69 251.574 150.14 241.236C168.569 230.897 182.634 216.131 192.356 196.959C202.058 177.765 206.909 154.8 206.909 128.043C206.909 101.286 202.079 78.5123 192.441 59.3821L192.42 59.361Z" fill="#3688FF"/>
</svg>`

const ICON_MOON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
const ICON_SUN = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
const ICON_KEY = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3L22 7l-3-3"/></svg>`
const ICON_USER = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`
const ICON_CHEVRON_LEFT = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`
const ICON_CHEVRON_DOWN = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`

function escapeHtml(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getInitials(user) {
  const given = user?.given_name || ''
  const family = user?.family_name || ''
  if (given && family) return (given[0] + family[0]).toUpperCase()
  const name = user?.name || user?.username || user?.email || '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function renderSignedOutNav({ isDark }) {
  return `
    <nav class="nav">
      <a href="/" class="nav-logo">
        ${NAV_MARK}
        <div class="wordmark">
          <span class="wordmark-name">ThunderID</span>
          <span class="wordmark-sub">Quickstart</span>
        </div>
      </a>
      <div class="nav-actions">
        <button class="btn-ghost" id="sign-in-btn">Sign in</button>
        <button class="btn-primary" id="get-started-btn">Get started</button>
        <button class="dark-toggle" id="dark-toggle" aria-label="Toggle dark mode">
          ${isDark ? ICON_SUN : ICON_MOON}
        </button>
      </div>
    </nav>`
}

export function renderSignedInNav({ user, isDark, currentPage }) {
  const initials = escapeHtml(getInitials(user))
  const name = escapeHtml(user?.given_name || user?.name || user?.username || 'User')
  const email = escapeHtml(user?.email || '')

  return `
    <nav class="nav">
      <a href="/" class="nav-logo" id="nav-logo-btn">
        ${NAV_MARK}
        <div class="wordmark">
          <span class="wordmark-name">ThunderID</span>
          <span class="wordmark-sub">Quickstart</span>
        </div>
      </a>
      <div class="nav-actions">
        ${currentPage !== 'home' ? `
          <button class="nav-back-btn" id="nav-back-btn">
            ${ICON_CHEVRON_LEFT} Home
          </button>` : ''}
        <button class="dark-toggle" id="dark-toggle" aria-label="Toggle dark mode">
          ${isDark ? ICON_SUN : ICON_MOON}
        </button>
        <div class="ud-wrapper" id="ud-wrapper">
          <button class="ud-trigger" id="ud-trigger" aria-haspopup="true">
            <span class="ud-avatar">${initials}</span>
            <span class="ud-name">${name}</span>
            ${ICON_CHEVRON_DOWN}
          </button>
          <div class="ud-menu" id="ud-menu">
            <div class="ud-header">
              <div class="ud-header-name">${name}</div>
              ${email ? `<div class="ud-header-email">${email}</div>` : ''}
            </div>
            <div class="ud-divider"></div>
            <button class="ud-item" id="ud-profile">
              ${ICON_USER} Profile
            </button>
            <button class="ud-item" id="ud-token-debug">
              ${ICON_KEY} Token debug
            </button>
            <div class="ud-divider"></div>
            <button class="ud-item ud-item--signout" id="ud-sign-out">Sign out</button>
          </div>
        </div>
      </div>
    </nav>`
}

export function attachNavHandlers({ isDark, setIsDark, navigateTo, auth }) {
  document.getElementById('dark-toggle')?.addEventListener('click', () => {
    const next = !isDark()
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    const dt = document.getElementById('dark-toggle')
    if (dt) dt.innerHTML = next ? ICON_SUN : ICON_MOON
    document.querySelectorAll('#mark-top, #hero-mark-top').forEach(el =>
      el.setAttribute('fill', next ? '#E8F4FF' : '#05213F')
    )
  })

  document.getElementById('nav-logo-btn')?.addEventListener('click', (e) => {
    e.preventDefault()
    navigateTo('home')
  })

  document.getElementById('nav-back-btn')?.addEventListener('click', () => {
    navigateTo('home')
  })

  const trigger = document.getElementById('ud-trigger')
  const menu = document.getElementById('ud-menu')
  const wrapper = document.getElementById('ud-wrapper')
  if (trigger && menu) {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation()
      menu.classList.toggle('ud-menu--open')
    })
    document.addEventListener('click', (e) => {
      if (!wrapper?.contains(e.target)) menu.classList.remove('ud-menu--open')
    }, { once: true })
  }

  document.getElementById('ud-profile')?.addEventListener('click', () => {
    menu?.classList.remove('ud-menu--open')
    navigateTo('profile')
  })

  document.getElementById('ud-token-debug')?.addEventListener('click', () => {
    menu?.classList.remove('ud-menu--open')
    navigateTo('token')
  })

  document.getElementById('ud-sign-out')?.addEventListener('click', () => {
    auth.signOut()
  })
}

export function attachSignedOutNavHandlers({ auth }) {
  document.getElementById('sign-in-btn')?.addEventListener('click', () => auth.signIn())
  document.getElementById('get-started-btn')?.addEventListener('click', () => auth.signIn())
  document.getElementById('dark-toggle')?.addEventListener('click', () => {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    const dt = document.getElementById('dark-toggle')
    if (dt) dt.innerHTML = next ? ICON_SUN : ICON_MOON
    document.querySelectorAll('#mark-top').forEach(el =>
      el.setAttribute('fill', next ? '#E8F4FF' : '#05213F')
    )
  })
}
