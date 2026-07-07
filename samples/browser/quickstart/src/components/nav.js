const ICON_MOON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
const ICON_SUN = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
const ICON_KEY = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3L22 7l-3-3"/></svg>`
const ICON_USER = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
const ICON_CHEVRON_LEFT = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`
const ICON_CHEVRON_DOWN = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`
const ICON_TECH = `<svg width="28" height="28" viewBox="0 0 24 24"><rect width="24" height="24" rx="5" fill="#F0DB4F"/><text x="12" y="17" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="10" fill="#000000">JS</text></svg>`

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

function getAvatarUrl(user) {
  return user?.profile || user?.profileUrl || user?.picture || user?.URL || null
}

function renderAvatar(user, className) {
  const avatarUrl = getAvatarUrl(user)
  if (avatarUrl) {
    return `<span class="${className}"><img src="${escapeHtml(avatarUrl)}" alt="" /></span>`
  }
  return `<span class="${className}">${escapeHtml(getInitials(user))}</span>`
}

function getFullName(user) {
  const given = user?.given_name || ''
  const family = user?.family_name || ''
  if (given && family) return `${given} ${family}`
  return user?.name || user?.username || 'User'
}

export function renderSignedOutNav({ isDark, hideSignIn = false }) {
  return `
    <nav class="nav">
      <a href="/" class="nav-logo">
        ${ICON_TECH}
        <span class="wordmark-name">Quickstart</span>
      </a>
      <div class="nav-actions">
        <button class="dark-toggle" id="dark-toggle" aria-label="Toggle dark mode">
          ${isDark ? ICON_SUN : ICON_MOON}
        </button>
        ${hideSignIn ? '' : '<button class="btn-primary" id="sign-in-btn">Sign in</button>'}
      </div>
    </nav>`
}

export function renderSignedInNav({ user, isDark, currentPage }) {
  const name = escapeHtml(getFullName(user))
  const email = escapeHtml(user?.email || '')

  return `
    <nav class="nav">
      <a href="/" class="nav-logo" id="nav-logo-btn">
        ${ICON_TECH}
        <span class="wordmark-name">Quickstart</span>
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
            ${renderAvatar(user, 'ud-avatar')}
            <span class="ud-name">${name}</span>
            ${ICON_CHEVRON_DOWN}
          </button>
          <div class="ud-menu" id="ud-menu">
            <div class="ud-header">
              ${renderAvatar(user, 'ud-avatar ud-avatar--header')}
              <div>
                <div class="ud-header-name">${name}</div>
                ${email ? `<div class="ud-header-email">${email}</div>` : ''}
              </div>
            </div>
            <div class="ud-divider"></div>
            <button class="ud-item" id="ud-token-debug">
              ${ICON_KEY} Token debug
            </button>
            <button class="ud-item" id="ud-manage-profile">
              ${ICON_USER} Manage Profile
            </button>
            <div class="ud-divider"></div>
            <button class="ud-item ud-item--signout" id="ud-sign-out">Sign out</button>
          </div>
        </div>
      </div>
    </nav>`
}

export function attachNavHandlers({ isDark, setIsDark, navigateTo, auth, openManageProfile }) {
  document.getElementById('dark-toggle')?.addEventListener('click', () => {
    const next = !isDark()
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    const dt = document.getElementById('dark-toggle')
    if (dt) dt.innerHTML = next ? ICON_SUN : ICON_MOON
    document.querySelectorAll('#hero-mark-top').forEach(el =>
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

  document.getElementById('ud-token-debug')?.addEventListener('click', () => {
    menu?.classList.remove('ud-menu--open')
    navigateTo('token')
  })

  document.getElementById('ud-manage-profile')?.addEventListener('click', () => {
    menu?.classList.remove('ud-menu--open')
    openManageProfile?.()
  })

  document.getElementById('ud-sign-out')?.addEventListener('click', () => {
    auth.signOut()
  })
}

export function attachSignedOutNavHandlers({ auth }) {
  document.getElementById('sign-in-btn')?.addEventListener('click', () => auth.signIn())
  document.getElementById('dark-toggle')?.addEventListener('click', () => {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    const dt = document.getElementById('dark-toggle')
    if (dt) dt.innerHTML = next ? ICON_SUN : ICON_MOON
    document.querySelectorAll('#hero-mark-top').forEach(el =>
      el.setAttribute('fill', next ? '#E8F4FF' : '#05213F')
    )
  })
}
