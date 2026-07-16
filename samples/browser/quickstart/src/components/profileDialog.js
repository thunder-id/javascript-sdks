import { updateMeProfile } from '@thunderid/browser'

const ICON_CLOSE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`

function escapeHtml(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function getAvatarUrl(user) {
  return user?.profile || user?.profileUrl || user?.picture || user?.URL || null
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

export function renderProfileDialog(user) {
  const avatarUrl = getAvatarUrl(user)
  const avatarHtml = avatarUrl
    ? `<img src="${escapeHtml(avatarUrl)}" alt="" />`
    : escapeHtml(getInitials(user))
  const given = escapeHtml(user?.given_name || '')
  const family = escapeHtml(user?.family_name || '')
  const email = escapeHtml(user?.email || user?.username || '')

  return `
    <div class="profile-dialog-overlay" id="profile-dialog-overlay">
      <div class="profile-dialog" role="dialog" aria-modal="true" aria-label="Manage Profile">
        <div class="profile-dialog-header">
          <h2>Manage Profile</h2>
          <button class="profile-dialog-close" id="profile-dialog-close" aria-label="Close">${ICON_CLOSE}</button>
        </div>
        <div class="profile-dialog-avatar">${avatarHtml}</div>
        <div class="profile-dialog-error" id="profile-dialog-error" hidden></div>
        <div class="profile-dialog-field">
          <label for="profile-first-name">First name</label>
          <input type="text" id="profile-first-name" value="${given}" />
        </div>
        <div class="profile-dialog-field">
          <label for="profile-last-name">Last name</label>
          <input type="text" id="profile-last-name" value="${family}" />
        </div>
        <div class="profile-dialog-field">
          <label>Email</label>
          <div class="profile-dialog-readonly">${email || '—'}</div>
        </div>
        <div class="profile-dialog-actions">
          <button class="btn-outline" id="profile-dialog-cancel">Cancel</button>
          <button class="btn-primary" id="profile-dialog-save">Save</button>
        </div>
      </div>
    </div>`
}

export function attachProfileDialogHandlers({ user, auth, onSaved }) {
  const overlay = document.getElementById('profile-dialog-overlay')
  const closeDialog = () => overlay?.remove()

  document.getElementById('profile-dialog-close')?.addEventListener('click', closeDialog)
  document.getElementById('profile-dialog-cancel')?.addEventListener('click', closeDialog)
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) closeDialog()
  })

  const errorEl = document.getElementById('profile-dialog-error')
  const saveBtn = document.getElementById('profile-dialog-save')

  saveBtn?.addEventListener('click', async () => {
    const givenName = document.getElementById('profile-first-name')?.value.trim() || ''
    const familyName = document.getElementById('profile-last-name')?.value.trim() || ''

    saveBtn.disabled = true
    saveBtn.textContent = 'Saving...'
    if (errorEl) { errorEl.hidden = true; errorEl.textContent = '' }

    try {
      await updateMeProfile({
        baseUrl: import.meta.env.VITE_THUNDERID_BASE_URL,
        payload: { name: { givenName, familyName } },
        fetcher: async (url, config) => {
          const token = await auth.getAccessToken()
          return fetch(url, {
            ...config,
            headers: { ...config.headers, Authorization: `Bearer ${token}` },
          })
        },
      })

      onSaved?.({ ...user, given_name: givenName, family_name: familyName })
      closeDialog()
    } catch (err) {
      if (errorEl) {
        errorEl.hidden = false
        errorEl.textContent = err?.message || 'Failed to update profile. Please try again.'
      }
      saveBtn.disabled = false
      saveBtn.textContent = 'Save'
    }
  })
}
