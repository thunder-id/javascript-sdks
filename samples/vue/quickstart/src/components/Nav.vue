<script setup>
import { computed } from 'vue'
import { SignedIn, SignedOut, SignInButton, UserDropdown } from '@thunderid/vue'

const props = defineProps({
  page: { type: String, default: 'home' },
  dark: { type: Boolean, default: false },
})

const emit = defineEmits(['update:page', 'update:dark'])

const isHome = computed(() => props.page === 'home')

const menuItems = computed(() => [
  { label: 'Token debug', onClick: () => emit('update:page', 'token') },
])

function toggleDark() {
  emit('update:dark', !props.dark)
}
</script>

<template>
  <nav class="nav">
    <a class="nav-logo" href="/" @click.prevent="emit('update:page', 'home')">
      <svg width="24" height="24" viewBox="0 0 196.32 170.02" aria-hidden="true">
        <path fill="#42b883" d="M120.83 0L98.16 39.26 75.49 0H0l98.16 170.02L196.32 0h-75.49z" />
        <path fill="#35495e" d="M120.83 0L98.16 39.26 75.49 0H39.26l58.9 102.01L157.06 0h-36.23z" />
      </svg>
      <span class="wordmark-name">Quickstart</span>
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
            <button class="btn-primary" @click="signIn" :disabled="isLoading">
              {{ isLoading ? 'Signing in…' : 'Sign in' }}
            </button>
          </template>
        </SignInButton>
      </SignedOut>
    </div>
  </nav>
</template>
