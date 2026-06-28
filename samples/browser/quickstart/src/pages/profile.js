function escapeHtml(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function row(label, value) {
  if (!value) return ''
  return `
    <div class="profile-row">
      <div class="profile-label">${label}</div>
      <div class="profile-value">${escapeHtml(value)}</div>
    </div>`
}

export function renderProfile({ user }) {
  const displayName = user?.name || [user?.given_name, user?.family_name].filter(Boolean).join(' ') || user?.username || '—'
  const picture = user?.picture

  return `
    <main class="profile-main">
      <div class="profile-header">
        ${picture
          ? `<img src="${escapeHtml(picture)}" alt="${escapeHtml(displayName)}" class="profile-avatar-img" />`
          : `<div class="profile-avatar-initials">${escapeHtml(displayName.slice(0, 2).toUpperCase())}</div>`}
        <div>
          <h1 class="profile-name">${escapeHtml(displayName)}</h1>
          ${user?.email ? `<p class="profile-email">${escapeHtml(user.email)}</p>` : ''}
        </div>
      </div>

      <div class="profile-section-label">Account details</div>
      <div class="profile-fields">
        ${row('First name', user?.given_name)}
        ${row('Last name', user?.family_name)}
        ${row('Username', user?.username)}
        ${row('Email', user?.email)}
        ${row('User ID', user?.sub || user?.id)}
      </div>
    </main>`
}
