import {expressLogo} from './expressLogo.mjs';

export function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Safe for embedding inside a double-quoted HTML attribute. */
export function escAttr(value) {
  return esc(value).replace(/"/g, '&quot;');
}

const MOON_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const SUN_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
const CHEVRON_LEFT_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const KEY_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="M21 2l-9.6 9.6"/><path d="M15.5 7.5l3 3L22 7l-3-3"/></svg>`;
const SIGN_OUT_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`;
export const COPY_ICON = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;

function userMenu(user) {
  const displayName = user?.name || [user?.given_name, user?.family_name].filter(Boolean).join(' ') || user?.username || user?.email || 'Account';
  const initial = displayName.charAt(0).toUpperCase();

  return `<details class="user-menu">
    <summary class="user-menu-trigger">
      <span class="user-avatar-sm">${esc(initial)}</span>
      <span class="user-menu-name">${esc(displayName)}</span>
    </summary>
    <div class="user-menu-list">
      <div class="user-menu-header">
        <span class="user-avatar-lg">${esc(initial)}</span>
        <span class="user-menu-header-name">${esc(displayName)}</span>
      </div>
      <a class="user-menu-item" href="/token">${KEY_ICON}Token debug</a>
      <a class="user-menu-item" href="/logout">${SIGN_OUT_ICON}Sign out</a>
    </div>
  </details>`;
}

function nav({signedIn, showBack, user}) {
  const authAction = signedIn ? userMenu(user) : `<a class="btn-primary" href="/login">Sign in</a>`;

  return `<nav class="nav">
    <a href="/" class="nav-logo">${expressLogo(24)}<span class="wordmark-name">Quickstart</span></a>
    <div style="flex:1"></div>
    <div class="nav-actions">
      ${showBack ? `<a href="/" class="nav-back-btn">${CHEVRON_LEFT_ICON}Home</a>` : ''}
      <button class="dark-toggle" aria-label="Toggle theme" onclick="
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('thunderid-theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
      "><span class="icon-moon">${MOON_ICON}</span><span class="icon-sun">${SUN_ICON}</span></button>
      ${authAction}
    </div>
  </nav>`;
}

/**
 * Wraps page content in the shared ThunderID quickstart shell. Uses the same
 * nav/hero/button classnames and design tokens as the React and Next.js
 * quickstarts so the sample apps read as one family.
 */
export function layout({title, body, signedIn = false, showBack = false, user = null}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · ThunderID Express Quickstart</title>
<link rel="stylesheet" href="/styles.css">
<script>
  if (localStorage.getItem('thunderid-theme') === 'dark') document.documentElement.classList.add('dark');
</script>
</head>
<body>
<div class="app">
  ${nav({signedIn, showBack, user})}
  ${body}
</div>
<script>
  function copyCodeBlock(btn) {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(btn.getAttribute('data-copy') || '').then(function () {
      var label = btn.querySelector('.copy-btn-label');
      if (!label) return;
      var original = label.textContent;
      label.textContent = 'Copied!';
      setTimeout(function () { label.textContent = original; }, 1500);
    });
  }
</script>
</body>
</html>`;
}
