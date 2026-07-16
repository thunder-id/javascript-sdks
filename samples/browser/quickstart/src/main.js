import './style.css'
import auth, { missingEnvVars } from './auth.js'
import { renderSignedOutNav, renderSignedInNav, attachNavHandlers, attachSignedOutNavHandlers } from './components/nav.js'
import { renderProfileDialog, attachProfileDialogHandlers } from './components/profileDialog.js'
import { renderSignedOut, renderHome, renderConfigNeeded, startCountdown, attachSignedOutHandlers } from './pages/home.js'
import { renderTokenDebug, attachTokenHandlers } from './pages/token.js'

let isDark = false
let currentPage = 'home'
let user = null
let idToken = null
let rawToken = null
let timer = null

function navigateTo(page) {
  if (timer) { clearInterval(timer); timer = null }
  currentPage = page
  renderSignedInPage()
}

function renderSignedInPage() {
  const app = document.getElementById('app')
  if (!app) return

  let content
  if (currentPage === 'token') {
    content = renderTokenDebug({ rawToken })
  } else {
    content = renderHome({ user, idToken })
  }

  app.innerHTML = renderSignedInNav({ user, isDark, currentPage }) + content

  attachNavHandlers({
    isDark: () => isDark,
    setIsDark: (v) => { isDark = v },
    navigateTo,
    auth,
    openManageProfile,
  })

  if (currentPage === 'token') {
    attachTokenHandlers({ rawToken })
  } else if (currentPage === 'home') {
    timer = startCountdown({ idToken })
  }
}

function openManageProfile() {
  const app = document.getElementById('app')
  if (!app) return

  app.insertAdjacentHTML('beforeend', renderProfileDialog(user))
  attachProfileDialogHandlers({
    user,
    auth,
    onSaved: (updatedUser) => {
      user = updatedUser
      renderSignedInPage()
    },
  })
}

async function renderApp() {
  const app = document.getElementById('app')
  if (!app) return

  if (missingEnvVars.length > 0) {
    app.innerHTML = renderSignedOutNav({ isDark, hideSignIn: true }) + renderConfigNeeded(missingEnvVars)
    attachSignedOutNavHandlers({ auth })
    return
  }

  if (timer) { clearInterval(timer); timer = null }

  await auth.signIn({ callOnlyOnRedirect: true })

  const signedIn = await auth.isSignedIn()

  if (signedIn) {
    user = await auth.getUser()
    try { idToken = await auth.getDecodedIdToken() } catch { idToken = null }
    try { rawToken = await auth.getAccessToken() } catch { rawToken = null }
    currentPage = 'home'
    renderSignedInPage()
  } else {
    user = null
    idToken = null
    rawToken = null
    currentPage = 'home'

    app.innerHTML = renderSignedOutNav({ isDark }) + renderSignedOut()
    attachSignedOutNavHandlers({ auth })
    attachSignedOutHandlers({ auth })
  }
}

renderApp()
