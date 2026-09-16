<script setup>
import { ref } from 'vue'

const dark = useState('dark', () => false)

const TABS = [
  { id: 'home', label: 'Home' },
  { id: 'personal', label: 'Personal info' },
  { id: 'security', label: 'Security' },
]

const TILES = [
  {
    id: 'personal',
    tone: 'blue',
    title: 'Personal info',
    description: 'Name, email, phone, and profile photo',
  },
  {
    id: 'security',
    tone: 'green',
    title: 'Security',
    description: 'Password and other credentials',
  },
]

const CREDENTIALS = [
  { attribute: 'password', title: 'Password', description: 'Used to sign in to your account.', cta: 'Change password' },
]

const tab = ref('home')
const openCredential = ref(null)

function selectTab(id) {
  tab.value = id
}

function toggleCredential(attribute) {
  openCredential.value = openCredential.value === attribute ? null : attribute
}

function closeCredential() {
  openCredential.value = null
}
</script>

<template>
  <div :class="['app', { dark }]">
    <AppNav />

    <SignedIn>
      <div class="account-page">
        <aside class="account-sidebar">
          <h1 class="account-sidebar-title">Account</h1>
          <nav class="account-nav">
            <button
              v-for="t in TABS"
              :key="t.id"
              type="button"
              :class="['account-nav-item', { 'account-nav-item--active': tab === t.id }]"
              @click="selectTab(t.id)"
            >
              <svg v-if="t.id === 'home'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 12l9-9 9 9" /><path d="M5 10v10h14V10" />
              </svg>
              <svg v-else-if="t.id === 'personal'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              {{ t.label }}
            </button>
          </nav>
        </aside>

        <main class="account-content">
          <div class="account-content-inner">
            <template v-if="tab === 'home'">
              <User>
                <template #default="{ user }">
                  <h2 class="account-content-title">
                    Hi, {{ user?.givenName || user?.given_name || user?.displayName || user?.username || 'there' }}
                  </h2>
                  <p class="account-content-subtitle">Manage your info and security across ThunderID apps.</p>
                  <div class="account-tiles">
                    <button
                      v-for="tile in TILES"
                      :key="tile.id"
                      type="button"
                      class="account-tile"
                      @click="selectTab(tile.id)"
                    >
                      <span :class="['account-tile-icon', `account-tile-icon--${tile.tone}`]">
                        <svg v-if="tile.id === 'personal'" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                        </svg>
                        <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                      </span>
                      <span class="account-tile-title">{{ tile.title }}</span>
                      <span class="account-tile-desc">{{ tile.description }}</span>
                    </button>
                  </div>
                </template>
              </User>
            </template>

            <template v-else-if="tab === 'personal'">
              <h2 class="account-content-title">Personal info</h2>
              <p class="account-content-subtitle">Manage the basic profile info others may see.</p>
              <UserProfile />
            </template>

            <template v-else-if="tab === 'security'">
              <h2 class="account-content-title">Security</h2>
              <p class="account-content-subtitle">Manage your password and other credentials.</p>
              <div class="account-security-list">
                <div v-for="credential in CREDENTIALS" :key="credential.attribute" class="account-security-card">
                  <div class="account-security-card-row">
                    <div>
                      <div class="account-security-card-title">{{ credential.title }}</div>
                      <div class="account-security-card-desc">{{ credential.description }}</div>
                    </div>
                    <button
                      type="button"
                      class="account-security-card-cta"
                      :aria-expanded="openCredential === credential.attribute"
                      @click="toggleCredential(credential.attribute)"
                    >
                      {{ credential.cta }}
                      <span
                        :class="['account-security-card-chevron', { 'account-security-card-chevron--open': openCredential === credential.attribute }]"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </span>
                    </button>
                  </div>
                  <div v-if="openCredential === credential.attribute" class="account-security-card-form">
                    <ChangeCredential :attribute="credential.attribute" title="" @success="closeCredential" />
                  </div>
                </div>
              </div>
            </template>
          </div>
        </main>
      </div>
    </SignedIn>

    <SignedOut>
      <main class="auth-main">
        <div class="auth-card">
          <p class="auth-subtitle">Sign in to manage your account.</p>
          <NuxtLink to="/signin" class="btn-primary">Sign in</NuxtLink>
        </div>
      </main>
    </SignedOut>
  </div>
</template>
