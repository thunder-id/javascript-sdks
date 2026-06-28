<script setup>
import { computed } from 'vue'
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserDropdown } from '@thunderid/vue'

const props = defineProps({
  page: { type: String, default: 'home' },
  dark: { type: Boolean, default: false },
})

const emit = defineEmits(['update:page', 'update:dark'])

const markTopFill = computed(() => props.dark ? '#E8F4FF' : '#05213F')
const isHome = computed(() => props.page === 'home')

const menuItems = computed(() => [
  { label: 'Profile', onClick: () => emit('update:page', 'profile') },
  { label: 'Token debug', onClick: () => emit('update:page', 'token') },
])

function toggleDark() {
  emit('update:dark', !props.dark)
}
</script>

<template>
  <nav class="nav">
    <a class="nav-logo" href="/" @click.prevent="emit('update:page', 'home')">
      <svg :width="Math.round(24 * (207 / 257))" height="24" viewBox="0 0 207 257" fill="none" aria-hidden="true">
        <path d="M55.4763 26.4391L58.8866 0H0V26.4391H55.4763Z" :fill="markTopFill" />
        <path d="M39.8438 147.407L49.5455 72.2839H4.9909e-05V256.743H60.5602L80.048 147.407H39.8438Z" fill="#3688FF" />
        <path d="M192.42 59.361C182.782 40.2307 168.929 25.5705 150.903 15.3381C145.501 12.2662 139.761 9.6605 133.703 7.5208L115.401 103.702H159.757L76.2987 256.743H83.3735C109.449 256.743 131.69 251.574 150.14 241.236C168.569 230.897 182.634 216.131 192.356 196.959C202.058 177.765 206.909 154.8 206.909 128.043C206.909 101.286 202.079 78.5123 192.441 59.3821L192.42 59.361Z" fill="#3688FF" />
      </svg>
      <div class="wordmark">
        <span class="wordmark-name">ThunderID</span>
        <span class="wordmark-sub">Quickstart</span>
      </div>
    </a>

    <div class="nav-actions">
      <button
        v-if="!isHome"
        class="nav-back-btn"
        @click="emit('update:page', 'home')"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Home
      </button>

      <button
        class="dark-toggle"
        @click="toggleDark"
        :aria-label="dark ? 'Switch to light mode' : 'Switch to dark mode'"
      >
        <svg v-if="dark" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
        <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      </button>

      <SignedIn>
        <UserDropdown :show-trigger-label="true" :menu-items="menuItems" />
      </SignedIn>

      <SignedOut>
        <SignInButton>
          <template #default="{ signIn, isLoading }">
            <button class="btn-ghost" @click="signIn" :disabled="isLoading">
              {{ isLoading ? 'Signing in…' : 'Sign in' }}
            </button>
          </template>
        </SignInButton>
        <SignUpButton>
          <template #default="{ signUp, isLoading }">
            <button class="btn-primary" @click="signUp" :disabled="isLoading">
              {{ isLoading ? 'Signing up…' : 'Sign up' }}
            </button>
          </template>
        </SignUpButton>
      </SignedOut>
    </div>
  </nav>
</template>
